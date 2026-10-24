"use client";

import Link from "next/link";
import { useReducer, useRef, useState } from "react";
import { apiFetch, type ApiError } from "@/lib/api";
import {
  buildAnswers,
  canSkipQuestions,
  errorTitle,
  flowReducer,
  initialFlow,
  OTHER_CHOICE,
  type AnswerDraft,
} from "@/features/scan/flow";
import type { Answer, Question } from "@/features/scan/schema";
import type { ScanResult } from "@/lib/types";
import { CredentialFields } from "./CredentialFields";
import { ScanResultView } from "./ResultView";
import { ErrorTile, LoadingTile, outlineButton, textInput } from "./ui";

const primaryButton =
  "rounded-pill bg-brown-950 px-6 py-3 min-h-11 font-bold text-cream-100 hover:bg-brown-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55";

type Form = { nickname: string; pin: string; background: string; interests: string };

export function ScanForm() {
  const [flow, dispatch] = useReducer(flowReducer, initialFlow);
  const [form, setForm] = useState<Form>({ nickname: "", pin: "", background: "", interests: "" });
  const [drafts, setDrafts] = useState<Record<string, AnswerDraft | undefined>>({});
  const controller = useRef<AbortController | null>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function request<T>(path: string, body: unknown) {
    const c = new AbortController();
    controller.current = c;
    const res = await apiFetch<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: c.signal,
    });
    // 취소하면 fetch 가 실패로 돌아온다. 이미 이전 단계로 돌아갔으므로 무시한다.
    return c.signal.aborted ? null : res;
  }

  async function loadQuestions() {
    dispatch({ type: "submitInput" });
    const res = await request<{ questions: Question[] }>("/api/scan/questions", {
      nickname: form.nickname,
      pin: form.pin,
      background: form.background,
      interests: form.interests,
    });
    if (!res) return;
    if (res.ok) {
      setDrafts({});
      dispatch({ type: "questionsLoaded", questions: res.data.questions });
    } else {
      dispatch({ type: "questionsFailed", error: res.error });
    }
  }

  async function loadResult(answers: Answer[]) {
    dispatch({ type: "submitAnswers" });
    const res = await request<ScanResult>("/api/scan", { ...form, answers });
    if (!res) return;
    if (res.ok) dispatch({ type: "resultLoaded", result: res.data });
    else dispatch({ type: "resultFailed", error: res.error });
  }

  function cancel() {
    controller.current?.abort();
    dispatch({ type: "cancel" });
  }

  return (
    <div>
      {flow.phase === "input" && (
        <InputStep
          form={form}
          set={set}
          error={flow.error}
          canSkip={canSkipQuestions(flow)}
          onSubmit={loadQuestions}
          onSkip={() => loadResult([])}
        />
      )}
      {flow.phase === "loadingQuestions" && <LoadingTile label="Reading your background…" onCancel={cancel} />}
      {flow.phase === "questions" && (
        <QuestionsStep
          questions={flow.questions}
          drafts={drafts}
          setDrafts={setDrafts}
          error={flow.error}
          onBack={() => dispatch({ type: "back" })}
          onSubmit={() => loadResult(buildAnswers(flow.questions, drafts))}
        />
      )}
      {flow.phase === "loadingResult" && <LoadingTile label="Finding your strengths…" onCancel={cancel} />}
      {flow.phase === "result" && flow.result && (
        <>
          <div role="status" className="my-4 rounded-tile border-2 border-success bg-success-soft p-4">
            <p className="m-0 font-bold text-success">Results saved</p>
            <p className="mt-1 mb-0 text-small">
              Saved under <strong>{form.nickname.trim()}</strong>. Use your nickname and PIN to{" "}
              <Link href="/scan/lookup">look them up later</Link>.
            </p>
          </div>
          <ScanResultView result={flow.result} credentials={{ nickname: form.nickname, pin: form.pin }} />
          <p className="mt-6">
            <button type="button" className={outlineButton} onClick={() => dispatch({ type: "reset" })}>
              Scan again
            </button>
          </p>
        </>
      )}
    </div>
  );
}

function InputStep({
  form,
  set,
  error,
  canSkip,
  onSubmit,
  onSkip,
}: {
  form: Form;
  set: (patch: Partial<Form>) => void;
  error: ApiError | null;
  canSkip: boolean;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <p className="rounded-tile bg-sand-100 p-4 text-small">
        Demo only. We store what you paste under your nickname and PIN. Don&apos;t include names, contact details, or
        anything private. Using an existing nickname with its PIN replaces that profile&apos;s results.
      </p>

      <CredentialFields
        nickname={form.nickname}
        pin={form.pin}
        onNickname={(nickname) => set({ nickname })}
        onPin={(pin) => set({ pin })}
      />

      <label htmlFor="background">Résumé or LinkedIn text</label>
      <textarea
        id="background"
        name="background"
        className={`${textInput} min-h-48`}
        required
        minLength={20}
        maxLength={6000}
        aria-describedby="background-help"
        value={form.background}
        onChange={(e) => set({ background: e.target.value })}
      />
      <p id="background-help" className="mt-1 text-caption text-muted tabular-nums">
        At least 20 characters. {form.background.length.toLocaleString("en-US")} / 6,000
      </p>

      <label htmlFor="interests">Interests (optional)</label>
      <textarea
        id="interests"
        name="interests"
        className={`${textInput} min-h-24`}
        maxLength={500}
        value={form.interests}
        onChange={(e) => set({ interests: e.target.value })}
      />

      {error && (
        <ErrorTile
          title={errorTitle(error.code)}
          actions={
            canSkip && (
              <button type="button" className={outlineButton} onClick={onSkip}>
                Skip questions and scan now
              </button>
            )
          }
        >
          {error.message}
        </ErrorTile>
      )}

      <p>
        <button type="submit" className={primaryButton}>
          {error && canSkip ? "Try again" : "Continue"}
        </button>
      </p>
      <p className="text-small">
        Already scanned? <Link href="/scan/lookup">Look up your results</Link>
      </p>
    </form>
  );
}

function QuestionsStep({
  questions,
  drafts,
  setDrafts,
  error,
  onBack,
  onSubmit,
}: {
  questions: Question[];
  drafts: Record<string, AnswerDraft | undefined>;
  setDrafts: (updater: (d: Record<string, AnswerDraft | undefined>) => Record<string, AnswerDraft | undefined>) => void;
  error: ApiError | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const update = (id: string, patch: Partial<AnswerDraft>) =>
    setDrafts((d) => ({ ...d, [id]: { choice: "", other: "", ...d[id], ...patch } }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {questions.map((q, i) => {
        const draft = drafts[q.id] ?? { choice: "", other: "" };
        const otherSelected = draft.choice === OTHER_CHOICE;
        return (
          <fieldset key={q.id} className="my-6 rounded-tile border-2 border-brown-950 bg-white p-4">
            <legend className="px-2 text-caption text-muted">
              Question {i + 1} of {questions.length}
            </legend>
            <p className="mt-0 font-bold">{q.prompt}</p>
            {q.kind === "single" && q.options ? (
              <div className="grid gap-2">
                {[...q.options, OTHER_CHOICE].map((opt) => (
                  <label key={opt} className="m-0 flex min-h-11 items-center gap-3 font-normal">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      required
                      checked={draft.choice === opt}
                      onChange={() => update(q.id, { choice: opt })}
                      className="size-5 accent-brown-950"
                    />
                    {opt === OTHER_CHOICE ? "Something else" : opt}
                  </label>
                ))}
                {otherSelected && (
                  <>
                    <label htmlFor={`${q.id}-other`} className="sr-only">
                      Your answer
                    </label>
                    <input
                      id={`${q.id}-other`}
                      type="text"
                      className={textInput}
                      required
                      maxLength={500}
                      value={draft.other}
                      onChange={(e) => update(q.id, { other: e.target.value })}
                    />
                  </>
                )}
              </div>
            ) : (
              <>
                <label htmlFor={`${q.id}-text`} className="sr-only">
                  Your answer
                </label>
                <textarea
                  id={`${q.id}-text`}
                  className={`${textInput} min-h-24`}
                  required
                  maxLength={500}
                  value={draft.other}
                  onChange={(e) => update(q.id, { other: e.target.value })}
                />
              </>
            )}
          </fieldset>
        );
      })}

      {error && <ErrorTile title={errorTitle(error.code)}>{error.message}</ErrorTile>}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={outlineButton} onClick={onBack}>
          Back
        </button>
        <button type="submit" className={primaryButton}>
          {error ? "Try again" : "Show my results"}
        </button>
      </div>
    </form>
  );
}
