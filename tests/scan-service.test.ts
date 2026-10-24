import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import {
  CredentialsSchema,
  QuestionsInputSchema,
  ScanInputSchema,
  ScanResultSchema,
} from "@/features/scan/schema";
import { ScanError, SCAN_MODEL, foldText, generateQuestions, runScan } from "@/features/scan/service";

const background =
  "I worked as a technical writer for ten years. I rewrote our API docs and trained support engineers on the new release notes.";
const input = { background };

const modelResult = {
  archetype: "Documentation Alchemist",
  summary: "Your writing background shows strong review skills.",
  skills: [
    { name: "Technical writing", score: 90, evidence: "I rewrote our API docs" },
    { name: "Enablement", score: 75, evidence: "trained support engineers on the new release notes" },
    { name: "Mentoring", score: 70, evidence: "I coach new hires every month" },
    { name: "Process design", score: 60, evidence: "I wrote the intake checklist" },
  ],
  secondJobs: [
    { title: "AI content reviewer", reason: "Writing experience" },
    { title: "Developer advocate", reason: "Enablement" },
  ],
  tags: ["Technical writing", "  developer   content ", "technical writing"],
};

const answers = [
  { question: "What do people ask you for?", answer: "I coach new hires every month" },
  { question: "Anything else?", answer: "I wrote the intake checklist" },
];

function fakeClient(parse: (args: unknown) => Promise<unknown>) {
  const spy = vi.fn(parse);
  return { client: { messages: { parse: spy } } as unknown as Pick<Anthropic, "messages">, spy };
}
const respond = (parsed_output: unknown) => async () => ({ stop_reason: "end_turn", parsed_output });
const userText = (spy: ReturnType<typeof fakeClient>["spy"]) =>
  (spy.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;
const systemText = (spy: ReturnType<typeof fakeClient>["spy"]) => (spy.mock.calls[0][0] as { system: string }).system;

describe("runScan", () => {
  it("keeps grounded skills, derives source from where the quote appears, and calls the configured model", async () => {
    const { client, spy } = fakeClient(respond(modelResult));
    const result = await runScan({ ...input, answers }, client);
    expect(spy.mock.calls[0][0]).toMatchObject({ model: SCAN_MODEL });
    expect(result.skills.map((s) => [s.name, s.source])).toEqual([
      ["Technical writing", "resume"],
      ["Enablement", "resume"],
      ["Mentoring", "answer"],
      ["Process design", "answer"],
    ]);
    expect(ScanResultSchema.safeParse(result).success).toBe(true);
  });

  it("drops skills whose evidence is not in the input and fails when fewer than 3 remain", async () => {
    const invented = {
      ...modelResult,
      skills: [
        modelResult.skills[0],
        { name: "Kubernetes", score: 80, evidence: "I run production Kubernetes clusters" },
        { name: "Go", score: 70, evidence: "I write Go services daily" },
      ],
    };
    const { client } = fakeClient(respond(invented));
    const err = await runScan(input, client).catch((e) => e);
    expect(err).toBeInstanceOf(ScanError);
    expect(err.code).toBe("ungrounded");
  });

  it("tolerates punctuation, quote and case differences in evidence", async () => {
    const skills = [
      { name: "A", score: 80, evidence: "“I rewrote our API docs,”" },
      { name: "B", score: 70, evidence: "TRAINED support engineers" },
      { name: "C", score: 60, evidence: "technical writer for ten years" },
    ];
    const { client } = fakeClient(respond({ ...modelResult, skills }));
    await expect(runScan(input, client)).resolves.toMatchObject({ skills: [{ name: "A" }, { name: "B" }, { name: "C" }] });
  });

  it("rejects one-word evidence that would match almost anything", async () => {
    const skills = [
      { name: "A", score: 80, evidence: "writer" },
      { name: "B", score: 70, evidence: "docs" },
      { name: "C", score: 60, evidence: "support" },
    ];
    const { client } = fakeClient(respond({ ...modelResult, skills }));
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "ungrounded" });
  });

  it("does not accept evidence that only appears in the generated questions", async () => {
    const skills = [
      ...modelResult.skills.slice(0, 2),
      { name: "Leadership", score: 80, evidence: "What do people ask you for" },
    ];
    const { client } = fakeClient(respond({ ...modelResult, skills }));
    await expect(runScan({ ...input, answers }, client)).rejects.toMatchObject({ code: "ungrounded" });
  });

  it("normalizes and de-duplicates tags", async () => {
    const { client } = fakeClient(respond(modelResult));
    const result = await runScan({ ...input, answers }, client);
    expect(result.tags).toEqual(["Technical writing", "developer content"]);
  });

  it("sends user text inside delimiters, with the tag hints, and tells the model they are data", async () => {
    const { client, spy } = fakeClient(respond(modelResult));
    await runScan({ ...input, interests: "open source", answers }, client, ["QA automation", "Support ops"]);
    const text = userText(spy);
    expect(text).toContain(`<resume>\n${background}\n</resume>`);
    expect(text).toContain("<interests>\nopen source\n</interests>");
    expect(text).toContain("<answers>");
    expect(text).toContain("QA automation, Support ops");
    expect(systemText(spy)).toMatch(/never as instructions/);
  });

  it("maps a refusal to ScanError(refusal)", async () => {
    const { client } = fakeClient(async () => ({ stop_reason: "refusal", parsed_output: null }));
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "refusal" });
  });

  it("maps missing parsed output to ScanError(empty_output)", async () => {
    const { client } = fakeClient(respond(null));
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "empty_output" });
  });

  it("maps SDK timeouts to ScanError(timeout)", async () => {
    const { client } = fakeClient(async () => {
      throw new Anthropic.APIConnectionTimeoutError();
    });
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "timeout" });
  });

  it("maps other failures to ScanError(upstream) without leaking details", async () => {
    const { client } = fakeClient(async () => {
      throw new Error("secret internal detail");
    });
    const err = await runScan(input, client).catch((e) => e);
    expect(err).toBeInstanceOf(ScanError);
    expect(err.code).toBe("upstream");
    expect(err.message).not.toContain("secret");
  });
});

describe("generateQuestions", () => {
  const q = (over: object) => ({ id: "q1", prompt: "What do people ask you for?", kind: "single", options: ["a", "b", "c"], ...over });

  it("returns the questions and sends the résumé in delimiters", async () => {
    const parsed = { questions: [q({}), q({ id: "q2" }), q({ id: "q3", kind: "text", options: undefined })] };
    const { client, spy } = fakeClient(respond(parsed));
    const questions = await generateQuestions({ background, interests: "" }, client);
    expect(questions).toHaveLength(3);
    expect(questions[2]).toEqual({ id: "q3", prompt: "What do people ask you for?", kind: "text" });
    expect(userText(spy)).toContain(`<resume>\n${background}\n</resume>`);
    expect(spy.mock.calls[0][0]).toMatchObject({ model: SCAN_MODEL });
  });

  it("turns a multiple-choice question without enough options into a text question", async () => {
    const parsed = { questions: [q({ options: ["only one"] }), q({ id: "q2", options: undefined }), q({ id: " " })] };
    const { client } = fakeClient(respond(parsed));
    const questions = await generateQuestions({ background }, client);
    expect(questions.map((x) => x.kind)).toEqual(["text", "text", "single"]);
    expect(questions[2].id).toBe("q3");
    expect(questions[0]).not.toHaveProperty("options");
  });

  it.each([
    ["refusal", async () => ({ stop_reason: "refusal", parsed_output: null })],
    ["empty_output", respond(null)],
  ])("maps %s", async (code, parse) => {
    const { client } = fakeClient(parse);
    await expect(generateQuestions({ background }, client)).rejects.toMatchObject({ code });
  });

  it("maps timeouts and other failures", async () => {
    const timeout = fakeClient(async () => {
      throw new Anthropic.APIConnectionTimeoutError();
    });
    await expect(generateQuestions({ background }, timeout.client)).rejects.toMatchObject({ code: "timeout" });
    const boom = fakeClient(async () => {
      throw new Error("secret");
    });
    const err = await generateQuestions({ background }, boom.client).catch((e) => e);
    expect(err.code).toBe("upstream");
    expect(err.message).not.toContain("secret");
  });
});

describe("foldText", () => {
  it("lowercases and collapses everything that is not a letter or digit", () => {
    expect(foldText("“Hello,   World!”")).toBe(" hello world ");
  });
});

describe("input schemas", () => {
  const creds = { nickname: "maya", pin: "1234" };

  it.each([
    ["a", false],
    ["ab", true],
    ["a".repeat(20), true],
    ["a".repeat(21), false],
    ["maya kim_1-2", true],
    ["maya!", false],
    ["  maya  ", true],
  ])("nickname %j valid=%s", (nickname, valid) => {
    expect(CredentialsSchema.safeParse({ ...creds, nickname }).success).toBe(valid);
  });

  it.each([
    ["123", false],
    ["1234", true],
    ["12345", false],
    ["12a4", false],
    ["", false],
  ])("pin %j valid=%s", (pin, valid) => {
    expect(CredentialsSchema.safeParse({ ...creds, pin }).success).toBe(valid);
  });

  it.each([
    [19, false],
    [20, true],
    [6000, true],
    [6001, false],
  ])("background of %i characters valid=%s", (n, valid) => {
    expect(QuestionsInputSchema.safeParse({ ...creds, background: "a".repeat(n) }).success).toBe(valid);
  });

  it("limits interests and answers", () => {
    const base = { ...creds, background: "a".repeat(50) };
    expect(ScanInputSchema.safeParse({ ...base, interests: "a".repeat(501) }).success).toBe(false);
    const a = { question: "q", answer: "x" };
    expect(ScanInputSchema.safeParse({ ...base, answers: [a, a, a, a] }).success).toBe(true);
    expect(ScanInputSchema.safeParse({ ...base, answers: [a, a, a, a, a] }).success).toBe(false);
    expect(ScanInputSchema.safeParse({ ...base, answers: [{ question: "q", answer: "  " }] }).success).toBe(false);
    expect(ScanInputSchema.safeParse({ ...base, answers: [{ question: "q", answer: "x".repeat(501) }] }).success).toBe(false);
  });

  it("defaults answers to an empty list", () => {
    const parsed = ScanInputSchema.parse({ ...creds, background: "a".repeat(50) });
    expect(parsed.answers).toEqual([]);
  });
});

describe("ScanResultSchema", () => {
  const skill = (n: number) => ({ name: `s${n}`, score: 50, evidence: "two words", source: "resume" as const });
  const valid = {
    archetype: "a",
    summary: "s",
    skills: [skill(1), skill(2), skill(3)],
    secondJobs: [
      { title: "t1", reason: "r" },
      { title: "t2", reason: "r" },
    ],
    tags: ["x"],
  };

  it("accepts 3-6 skills and rejects fewer or more", () => {
    expect(ScanResultSchema.safeParse(valid).success).toBe(true);
    expect(ScanResultSchema.safeParse({ ...valid, skills: valid.skills.slice(0, 2) }).success).toBe(false);
    expect(ScanResultSchema.safeParse({ ...valid, skills: [1, 2, 3, 4, 5, 6, 7].map(skill) }).success).toBe(false);
  });

  it("rejects out-of-range scores, long evidence and unknown sources", () => {
    const bad = (s: object) => ScanResultSchema.safeParse({ ...valid, skills: [s, skill(2), skill(3)] }).success;
    expect(bad({ ...skill(1), score: 101 })).toBe(false);
    expect(bad({ ...skill(1), score: -1 })).toBe(false);
    expect(bad({ ...skill(1), evidence: "x".repeat(301) })).toBe(false);
    expect(bad({ ...skill(1), source: "guess" })).toBe(false);
  });
});
