import type { ApiError } from "@/lib/api";
import type { ScanResult } from "@/lib/types";
import type { Answer, Question } from "./schema";

/** 검사 폼의 단계 전이. 화면과 분리해 순수 함수로 테스트한다. */
export type Phase = "input" | "loadingQuestions" | "questions" | "loadingResult" | "result";

export type FlowState = {
  phase: Phase;
  error: ApiError | null;
  questions: Question[];
  result: ScanResult | null;
};

export type FlowAction =
  | { type: "submitInput" }
  | { type: "questionsLoaded"; questions: Question[] }
  | { type: "questionsFailed"; error: ApiError }
  | { type: "back" }
  | { type: "submitAnswers" }
  | { type: "resultLoaded"; result: ScanResult }
  | { type: "resultFailed"; error: ApiError }
  | { type: "cancel" }
  | { type: "reset" };

export const initialFlow: FlowState = { phase: "input", error: null, questions: [], result: null };

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "submitInput":
      return { ...state, phase: "loadingQuestions", error: null };
    case "questionsLoaded":
      return { ...state, phase: "questions", error: null, questions: action.questions };
    case "questionsFailed":
      return { ...state, phase: "input", error: action.error, questions: [] };
    case "back":
      return { ...state, phase: "input", error: null };
    case "submitAnswers":
      return { ...state, phase: "loadingResult", error: null };
    case "resultLoaded":
      return { ...state, phase: "result", error: null, result: action.result };
    case "resultFailed":
      return { ...state, phase: state.questions.length > 0 ? "questions" : "input", error: action.error };
    case "cancel":
      if (state.phase === "loadingQuestions") return { ...state, phase: "input", error: null };
      if (state.phase === "loadingResult") {
        return { ...state, phase: state.questions.length > 0 ? "questions" : "input", error: null };
      }
      return state;
    case "reset":
      return initialFlow;
  }
}

/** 질문 생성이 AI 쪽 문제로 실패했을 때만 "질문 건너뛰기"를 보여준다. 자격·입력 오류는 해당 없음. */
const SKIPPABLE = new Set(["timeout", "upstream", "empty_output", "network"]);
export function canSkipQuestions(state: FlowState): boolean {
  return state.phase === "input" && state.error !== null && SKIPPABLE.has(state.error.code);
}

export const OTHER_CHOICE = "__other__";
export type AnswerDraft = { choice: string; other: string };

/** 질문별 초안을 서버 요청 형식으로 바꾼다. 비어 있으면 빈 답을 만들지 않고 건너뛴다. */
export function buildAnswers(questions: Question[], drafts: Record<string, AnswerDraft | undefined>): Answer[] {
  const answers: Answer[] = [];
  for (const q of questions) {
    const d = drafts[q.id];
    if (!d) continue;
    const answer = (q.kind === "text" || d.choice === OTHER_CHOICE ? d.other : d.choice).trim();
    if (answer) answers.push({ question: q.prompt, answer });
  }
  return answers;
}

/** 오류 코드별 제목. 본문은 서버가 준 메시지를 쓴다. */
export function errorTitle(code: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Couldn't verify your nickname";
    case "locked":
      return "Too many attempts";
    case "invalid_input":
      return "Check your input";
    case "timeout":
      return "The scan timed out";
    case "ungrounded":
      return "Couldn't back up the results";
    case "network":
      return "Couldn't reach the server";
    case "missing_api_key":
      return "AI isn't set up yet";
    default:
      return "The scan didn't finish";
  }
}
