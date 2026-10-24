"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch, type ApiError } from "@/lib/api";
import { errorTitle } from "@/features/scan/flow";
import type { Credentials, ProfileView } from "@/features/scan/schema";
import { CredentialFields } from "../CredentialFields";
import { ScanResultView } from "../ResultView";
import { ErrorTile, LoadingTile } from "../ui";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "success"; profile: ProfileView; credentials: Credentials };

const primaryButton =
  "rounded-pill bg-brown-950 px-6 py-3 min-h-11 font-bold text-cream-100 hover:bg-brown-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55";

export function LookupForm() {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "loading" });
    // 조회 뒤 입력란을 고쳐도 태그 저장은 조회에 성공한 자격으로 한다.
    const credentials = { nickname, pin };
    const res = await apiFetch<ProfileView>("/api/profile/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    setState(res.ok ? { status: "success", profile: res.data, credentials } : { status: "error", error: res.error });
  }

  const loading = state.status === "loading";

  return (
    <>
      <form onSubmit={onSubmit}>
        <CredentialFields nickname={nickname} pin={pin} onNickname={setNickname} onPin={setPin} />
        {state.status === "error" && (
          <ErrorTile title={errorTitle(state.error.code)}>{state.error.message}</ErrorTile>
        )}
        <p>
          <button type="submit" className={primaryButton} disabled={loading}>
            {loading ? "Looking up…" : state.status === "error" ? "Try again" : "Look up my results"}
          </button>
        </p>
      </form>

      {loading && <LoadingTile label="Looking up your results…" />}

      {state.status === "success" &&
        (state.profile.scan ? (
          <>
            <h2>Results for {state.profile.nickname}</h2>
            <ScanResultView
              key={`${state.profile.nickname}:${state.profile.updatedAt}`}
              result={state.profile.scan}
              curatedTags={state.profile.curatedTags}
              credentials={state.credentials}
            />
          </>
        ) : (
          <div role="status" className="my-4 rounded-tile bg-sand-100 p-6">
            <p className="m-0 font-bold">No results yet</p>
            <p className="mt-1 mb-3 text-small">This nickname has no completed scan. Start one to see your skills.</p>
            <Link href="/scan" className="font-bold">
              Start a scan
            </Link>
          </div>
        ))}
    </>
  );
}
