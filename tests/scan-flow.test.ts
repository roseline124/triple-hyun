import { describe, expect, it } from "vitest";
import {
  OTHER_CHOICE,
  buildAnswers,
  canSkipQuestions,
  errorTitle,
  flowReducer,
  initialFlow,
  type FlowAction,
  type FlowState,
} from "@/features/scan/flow";
import type { Question } from "@/features/scan/schema";
import type { ScanResult } from "@/lib/types";

const questions: Question[] = [
  { id: "q1", prompt: "What do people ask you for?", kind: "single", options: ["Reviews", "Setup help", "Debugging"] },
  { id: "q2", prompt: "What did you do unprompted?", kind: "text" },
];
const result = { archetype: "a" } as ScanResult;
const run = (actions: FlowAction[], from: FlowState = initialFlow) => actions.reduce(flowReducer, from);

describe("flowReducer", () => {
  it("walks input → questions → result", () => {
    const s1 = run([{ type: "submitInput" }]);
    expect(s1.phase).toBe("loadingQuestions");
    const s2 = flowReducer(s1, { type: "questionsLoaded", questions });
    expect(s2).toMatchObject({ phase: "questions", questions, error: null });
    const s3 = flowReducer(s2, { type: "submitAnswers" });
    expect(s3.phase).toBe("loadingResult");
    expect(flowReducer(s3, { type: "resultLoaded", result })).toMatchObject({ phase: "result", result });
  });

  it("returns to input with the error when question generation fails", () => {
    const error = { code: "upstream", message: "The AI request failed." };
    const s = run([{ type: "submitInput" }, { type: "questionsFailed", error }]);
    expect(s).toMatchObject({ phase: "input", error, questions: [] });
  });

  it("returns to the questions with the error when the result fails, so answers can be retried", () => {
    const error = { code: "ungrounded", message: "x" };
    const s = run([
      { type: "submitInput" },
      { type: "questionsLoaded", questions },
      { type: "submitAnswers" },
      { type: "resultFailed", error },
    ]);
    expect(s).toMatchObject({ phase: "questions", error });
    expect(s.questions).toEqual(questions);
  });

  it("returns to input when a skipped scan fails (there are no questions to go back to)", () => {
    const error = { code: "timeout", message: "x" };
    const s = run([{ type: "submitInput" }, { type: "questionsFailed", error: { code: "upstream", message: "y" } }, { type: "submitAnswers" }, { type: "resultFailed", error }]);
    expect(s).toMatchObject({ phase: "input", error });
  });

  it("clears the error when submitting again", () => {
    const failed = run([{ type: "submitInput" }, { type: "questionsFailed", error: { code: "network", message: "x" } }]);
    expect(flowReducer(failed, { type: "submitInput" }).error).toBeNull();
  });

  it("back goes to input and keeps the loaded questions", () => {
    const s = run([{ type: "submitInput" }, { type: "questionsLoaded", questions }, { type: "back" }]);
    expect(s).toMatchObject({ phase: "input", error: null });
    expect(s.questions).toEqual(questions);
  });

  it("cancel steps back from each loading phase without an error, and does nothing elsewhere", () => {
    expect(run([{ type: "submitInput" }, { type: "cancel" }])).toMatchObject({ phase: "input", error: null });
    const loadingResult = run([{ type: "submitInput" }, { type: "questionsLoaded", questions }, { type: "submitAnswers" }]);
    expect(flowReducer(loadingResult, { type: "cancel" })).toMatchObject({ phase: "questions", error: null });
    expect(flowReducer(initialFlow, { type: "cancel" })).toBe(initialFlow);
  });

  it("reset starts over", () => {
    const done = run([{ type: "submitInput" }, { type: "questionsLoaded", questions }, { type: "submitAnswers" }, { type: "resultLoaded", result }]);
    expect(flowReducer(done, { type: "reset" })).toEqual(initialFlow);
  });
});

describe("canSkipQuestions", () => {
  const failedWith = (code: string) =>
    run([{ type: "submitInput" }, { type: "questionsFailed", error: { code, message: "m" } }]);

  it.each(["timeout", "upstream", "empty_output", "network"])("offers skipping after %s", (code) => {
    expect(canSkipQuestions(failedWith(code))).toBe(true);
  });

  it.each(["invalid_credentials", "locked", "invalid_input", "refusal", "missing_api_key"])(
    "does not offer skipping after %s",
    (code) => {
      expect(canSkipQuestions(failedWith(code))).toBe(false);
    },
  );

  it("does not offer skipping without an error or outside the input step", () => {
    expect(canSkipQuestions(initialFlow)).toBe(false);
    const s = run([{ type: "submitInput" }, { type: "questionsLoaded", questions }]);
    expect(canSkipQuestions({ ...s, error: { code: "upstream", message: "m" } })).toBe(false);
  });
});

describe("buildAnswers", () => {
  it("uses the chosen option, the typed text for 'Something else', and the typed text for text questions", () => {
    expect(buildAnswers(questions, { q1: { choice: "Reviews", other: "ignored" }, q2: { choice: "", other: " Wrote a runbook " } })).toEqual([
      { question: "What do people ask you for?", answer: "Reviews" },
      { question: "What did you do unprompted?", answer: "Wrote a runbook" },
    ]);
    expect(buildAnswers([questions[0]], { q1: { choice: OTHER_CHOICE, other: " Hiring help " } })).toEqual([
      { question: "What do people ask you for?", answer: "Hiring help" },
    ]);
  });

  it("skips unanswered questions and empty answers instead of sending blanks", () => {
    expect(buildAnswers(questions, {})).toEqual([]);
    expect(buildAnswers(questions, { q1: { choice: OTHER_CHOICE, other: "   " }, q2: { choice: "", other: "" } })).toEqual([]);
  });
});

describe("errorTitle", () => {
  it("gives a specific title per known code and a generic one otherwise", () => {
    expect(errorTitle("invalid_credentials")).toBe("Couldn't verify your nickname");
    expect(errorTitle("locked")).toBe("Too many attempts");
    expect(errorTitle("ungrounded")).toBe("Couldn't back up the results");
    expect(errorTitle("something_new")).toBe("The scan didn't finish");
  });
});
