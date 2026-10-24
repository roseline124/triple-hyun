import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/scan/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/scan/service")>();
  return { ...actual, createAnthropicClient: vi.fn(() => ({})), runScan: vi.fn(), generateQuestions: vi.fn() };
});

import { POST as lookupPost } from "@/app/api/profile/lookup/route";
import { POST as questionsPost } from "@/app/api/scan/questions/route";
import { POST as scanPost } from "@/app/api/scan/route";
import { MAX_FAILED_ATTEMPTS, type Profile } from "@/features/scan/profile";
import { generateQuestions, runScan, ScanError } from "@/features/scan/service";
import { closeDb, getOne } from "@/lib/db";
import type { ScanResult } from "@/lib/types";

const creds = { nickname: "Maya", pin: "1234" };
const content = { ...creds, background: "A sufficiently long experience description. ".repeat(2) };
const post = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const stored = () => getOne<Profile>("profiles", "maya");

const result: ScanResult = {
  archetype: "Documentation Alchemist",
  summary: "s",
  skills: [1, 2, 3].map((n) => ({ name: `s${n}`, score: 50, evidence: "two words", source: "resume" as const })),
  secondJobs: [
    { title: "a", reason: "r" },
    { title: "b", reason: "r" },
  ],
  tags: ["Technical writing"],
};
const questions = [1, 2, 3].map((n) => ({ id: `q${n}`, prompt: `Question ${n}?`, kind: "text" as const }));

beforeEach(async () => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = "file::memory:";
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.mocked(runScan).mockReset();
  vi.mocked(generateQuestions).mockReset();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await closeDb();
});

describe("POST /api/scan/questions", () => {
  it("503 when the server key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await questionsPost(post(content));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("missing_api_key");
  });

  it.each([
    ["malformed JSON", "not json"],
    ["short background", { ...content, background: "short" }],
    ["bad PIN", { ...content, pin: "12" }],
    ["bad nickname", { ...content, nickname: "x" }],
  ])("400 on %s without calling the model", async (_name, body) => {
    const res = await questionsPost(post(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    expect(generateQuestions).not.toHaveBeenCalled();
  });

  it("returns questions for a new nickname without creating a profile", async () => {
    vi.mocked(generateQuestions).mockResolvedValue(questions);
    const res = await questionsPost(post(content));
    expect(res.status).toBe(200);
    expect((await res.json()).data.questions).toEqual(questions);
    expect(await stored()).toBeUndefined();
  });

  it("401 for a taken nickname with the wrong PIN, before calling the model", async () => {
    vi.mocked(runScan).mockResolvedValue(result);
    await scanPost(post({ ...content, answers: [] }));
    const res = await questionsPost(post({ ...content, pin: "9999" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_credentials");
    expect(body.error.message).toMatch(/nickname is taken/i);
    expect(generateQuestions).not.toHaveBeenCalled();
  });

  it("maps ScanError to 502 / 504 and unexpected errors to 500", async () => {
    vi.mocked(generateQuestions).mockRejectedValueOnce(new ScanError("upstream", "x"));
    expect((await questionsPost(post(content))).status).toBe(502);
    vi.mocked(generateQuestions).mockRejectedValueOnce(new ScanError("timeout", "x"));
    expect((await questionsPost(post(content))).status).toBe(504);
    vi.mocked(generateQuestions).mockRejectedValueOnce(new Error("boom"));
    const res = await questionsPost(post(content));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("boom");
  });
});

describe("POST /api/scan", () => {
  const body = (over: object = {}) => post({ ...content, answers: [{ question: "Q?", answer: "A" }], ...over });

  it("503 when the server key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect((await scanPost(body())).status).toBe(503);
  });

  it("400 on malformed JSON, short input and too many answers", async () => {
    const a = { question: "q", answer: "a" };
    expect((await scanPost(post("not json"))).status).toBe(400);
    expect((await scanPost(body({ background: "short" }))).status).toBe(400);
    expect((await scanPost(body({ answers: [a, a, a, a, a] }))).status).toBe(400);
    expect(runScan).not.toHaveBeenCalled();
  });

  it("returns the result and saves it with the original input on the profile", async () => {
    vi.mocked(runScan).mockResolvedValue(result);
    const res = await scanPost(body({ interests: "open source" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual(result);
    expect(await stored()).toMatchObject({
      nickname: "Maya",
      scan: result,
      scanInput: { background: content.background.trim(), interests: "open source", answers: [{ question: "Q?", answer: "A" }] },
    });
  });

  it("passes the guild and quest tags to the model as hints", async () => {
    vi.mocked(runScan).mockResolvedValue(result);
    await scanPost(body());
    const hints = vi.mocked(runScan).mock.calls[0][2] ?? [];
    expect(hints).toEqual(expect.arrayContaining(["Technical writing", "QA automation", "Open source"]));
  });

  it("401 and no model call for a taken nickname with the wrong PIN; the old result is kept", async () => {
    vi.mocked(runScan).mockResolvedValue(result);
    await scanPost(body());
    vi.mocked(runScan).mockClear();
    const res = await scanPost(body({ pin: "9999" }));
    expect(res.status).toBe(401);
    expect(runScan).not.toHaveBeenCalled();
    expect((await stored())?.scan).toEqual(result);
  });

  it("replaces the result when the same nickname scans again with its PIN", async () => {
    vi.mocked(runScan).mockResolvedValueOnce(result).mockResolvedValueOnce({ ...result, archetype: "Second Run" });
    await scanPost(body());
    expect((await scanPost(body())).status).toBe(200);
    expect((await stored())?.scan?.archetype).toBe("Second Run");
  });

  it("429 after repeated wrong PINs, even for the right PIN", async () => {
    vi.mocked(runScan).mockResolvedValue(result);
    await scanPost(body());
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await scanPost(body({ pin: "0000" }));
    const res = await scanPost(body());
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("locked");
  });

  it("maps ScanError codes to 504 / 422 / 502 and keeps the profile without a result", async () => {
    vi.mocked(runScan).mockRejectedValueOnce(new ScanError("timeout", "x"));
    expect((await scanPost(body())).status).toBe(504);
    vi.mocked(runScan).mockRejectedValueOnce(new ScanError("ungrounded", "x"));
    expect((await scanPost(body())).status).toBe(422);
    vi.mocked(runScan).mockRejectedValueOnce(new ScanError("upstream", "x"));
    expect((await scanPost(body())).status).toBe(502);
    expect((await stored())?.scan).toBeNull();
  });

  it("500 without leaking details on unexpected errors", async () => {
    vi.mocked(runScan).mockRejectedValueOnce(new Error("secret"));
    const res = await scanPost(body());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("POST /api/profile/lookup", () => {
  async function scanned() {
    vi.mocked(runScan).mockResolvedValue(result);
    await scanPost(post({ ...content, answers: [] }));
  }

  it("400 on malformed JSON and invalid credentials", async () => {
    expect((await lookupPost(post("not json"))).status).toBe(400);
    expect((await lookupPost(post({ nickname: "Maya", pin: "12" }))).status).toBe(400);
  });

  it("returns the saved result and input, with no secret fields", async () => {
    await scanned();
    const res = await lookupPost(post(creds));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/pinHash|pinSalt|failedAttempts|lockedUntil/);
    const { data } = JSON.parse(text);
    expect(data.nickname).toBe("Maya");
    expect(data.scan).toEqual(result);
    expect(data.scanInput.background).toBe(content.background.trim());
  });

  it("works with a different letter case and extra spaces in the nickname", async () => {
    await scanned();
    expect((await lookupPost(post({ nickname: "  mAYA ", pin: "1234" }))).status).toBe(200);
  });

  it("returns scan null for a profile that has no completed scan", async () => {
    vi.mocked(runScan).mockRejectedValueOnce(new ScanError("upstream", "x"));
    await scanPost(post({ ...content, answers: [] }));
    const res = await lookupPost(post(creds));
    expect(res.status).toBe(200);
    expect((await res.json()).data.scan).toBeNull();
  });

  it("401 with the same message for a wrong PIN and an unknown nickname", async () => {
    await scanned();
    const wrong = await lookupPost(post({ ...creds, pin: "0000" }));
    const unknown = await lookupPost(post({ nickname: "Nobody", pin: "1234" }));
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await wrong.json()).error).toEqual((await unknown.json()).error);
  });

  it("429 after repeated wrong PINs, even for the right PIN", async () => {
    await scanned();
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await lookupPost(post({ ...creds, pin: "0000" }));
    const res = await lookupPost(post(creds));
    expect(res.status).toBe(429);
    expect((await res.json()).error.message).toMatch(/15 minutes/);
  });
});
