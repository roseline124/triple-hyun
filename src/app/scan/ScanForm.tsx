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
        <label htmlFor="background">Experience / what you do</label>
        <textarea id="background" name="background" required minLength={10} maxLength={2000} />
        <label htmlFor="interests">Interests (optional)</label>
        <textarea id="interests" name="interests" maxLength={500} />
        <p>
          <button type="submit" disabled={loading}>
            {loading ? "Scanning…" : "Scan my skills"}
          </button>
        </p>
      </form>

      <div aria-live="polite">
        {state.status === "error" && (
          <p role="alert" className="error">
            {state.error.message} Please try again.
          </p>
        )}
        {state.status === "success" && (
          <>
            {!state.saved && (
              <p role="alert" className="error">
                We couldn&apos;t save your results. They will disappear if you refresh this page.
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
      <h3>Skills</h3>
      <ul>
        {result.stats.map((s) => (
          <li key={s.name}>
            {s.name}: {s.score}
          </li>
        ))}
      </ul>
      <h3>Second-career options</h3>
      <ul>
        {result.secondJobs.map((j) => (
          <li key={j.title}>
            <strong>{j.title}</strong> — {j.reason}
          </li>
        ))}
      </ul>
      <p className="muted">Suggested tags: {result.questTags.join(", ")}</p>
    </section>
  );
}
