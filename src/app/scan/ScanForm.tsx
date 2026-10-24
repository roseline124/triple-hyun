"use client";

import { useState } from "react";
import { apiFetch, type ApiError } from "@/lib/api";
import { saveScan } from "@/features/scan/storage";
import type { ScanResult } from "@/lib/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "success"; result: ScanResult; saved: boolean };

export function ScanForm() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ status: "loading" });
    const res = await apiFetch<ScanResult>("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        background: String(form.get("background") ?? ""),
        interests: String(form.get("interests") ?? ""),
      }),
    });
    if (!res.ok) {
      setState({ status: "error", error: res.error });
      return;
    }
    const saved = await saveScan(res.data).then(
      () => true,
      () => false,
    );
    setState({ status: "success", result: res.data, saved });
  }

  const loading = state.status === "loading";

  return (
    <>
      <form onSubmit={onSubmit}>
        <label htmlFor="background">경력 / 하던 일</label>
        <textarea id="background" name="background" required minLength={10} maxLength={2000} />
        <label htmlFor="interests">관심사 (선택)</label>
        <textarea id="interests" name="interests" maxLength={500} />
        <p>
          <button type="submit" disabled={loading}>
            {loading ? "분석 중…" : "능력 검사"}
          </button>
        </p>
      </form>

      <div aria-live="polite">
        {state.status === "error" && (
          <p role="alert" className="error">
            {state.error.message} 다시 시도해주세요.
          </p>
        )}
        {state.status === "success" && (
          <>
            {!state.saved && (
              <p role="alert" className="error">
                결과를 브라우저에 저장하지 못했습니다. 화면의 결과는 새로고침하면 사라집니다.
              </p>
            )}
            <ScanResultView result={state.result} />
          </>
        )}
      </div>
    </>
  );
}

function ScanResultView({ result }: { result: ScanResult }) {
  return (
    <section aria-labelledby="scan-result">
      <h2 id="scan-result">{result.archetype}</h2>
      <p>{result.summary}</p>
      <h3>능력치</h3>
      <ul>
        {result.stats.map((s) => (
          <li key={s.name}>
            {s.name}: {s.score}
          </li>
        ))}
      </ul>
      <h3>제2의 직업 후보</h3>
      <ul>
        {result.secondJobs.map((j) => (
          <li key={j.title}>
            <strong>{j.title}</strong> — {j.reason}
          </li>
        ))}
      </ul>
      <p className="muted">추천 태그: {result.questTags.join(", ")}</p>
    </section>
  );
}
