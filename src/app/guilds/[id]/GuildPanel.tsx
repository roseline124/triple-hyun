"use client";

import Link from "next/link";
import { useState } from "react";
import { CredentialFields } from "@/app/scan/CredentialFields";
import { ErrorTile, outlineButton, primaryButton, SuccessTile } from "@/app/scan/ui";
import { joinBlockReason, memberRole } from "@/features/guild/rules";
import { JOIN_FEE_USD } from "@/features/guild/schema";
import { requestJoin, requestLeave, requestRecruiting } from "@/features/guild/service";
import type { ApiError } from "@/lib/api";
import { formatUsd } from "@/lib/format";
import type { Guild } from "@/lib/types";

type Action = "join" | "leave" | "recruiting";
type Outcome = { ok: true; title: string; guildName: string; joined: boolean } | { ok: false; title: string; error: ApiError };

const FAILED_TITLE: Record<Action, string> = {
  join: "Couldn't join the guild",
  leave: "Couldn't leave the guild",
  recruiting: "Couldn't update recruiting",
};

/** 닉네임+PIN을 입력받아 가입·탈퇴·모집 토글을 요청한다. 보여줄 행동은 입력한 닉네임의 위치(멤버/owner)로 고르고, 권한은 서버가 검증한다. */
export function GuildPanel({ guild, onChange }: { guild: Guild; onChange: (g: Guild) => void }) {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState<Action | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const role = memberRole(guild, nickname);
  const blocked = joinBlockReason(guild);

  async function run(action: Action) {
    setPending(action);
    setOutcome(null);
    const c = { nickname, pin };
    const res =
      action === "join"
        ? await requestJoin(guild.id, c)
        : action === "leave"
          ? await requestLeave(guild.id, c)
          : await requestRecruiting(guild.id, c, !guild.recruiting);
    setPending(null);
    if (!res.ok) return setOutcome({ ok: false, title: FAILED_TITLE[action], error: res.error });
    onChange(res.data);
    const title =
      action === "join"
        ? `You joined ${res.data.name}`
        : action === "leave"
          ? `You left ${res.data.name}`
          : res.data.recruiting
            ? "Recruiting reopened"
            : "Recruiting closed";
    setOutcome({ ok: true, title, guildName: res.data.name, joined: action === "join" });
  }

  return (
    <section aria-labelledby="panel-h" className="mt-6 rounded-tile border-2 border-brown-950 bg-white p-6">
      <h2 id="panel-h" className="mt-0 text-body font-bold">
        Use your nickname and PIN
      </h2>
      <p className="mt-1 mb-4 text-small text-muted">
        New here? Pick a nickname and a 4-digit PIN and we&apos;ll create your profile. Already scanned? Use the same ones.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (role === "none") void run("join");
        }}
      >
        <CredentialFields nickname={nickname} pin={pin} onNickname={setNickname} onPin={setPin} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {role === "none" && (
            <>
              <button type="submit" className={primaryButton} disabled={pending !== null || blocked !== null}>
                {pending === "join" ? "Joining…" : `Join guild for ${formatUsd(JOIN_FEE_USD)}`}
              </button>
              <span className="text-small text-muted" id="join-note">
                {blocked ?? `${formatUsd(guild.joinFee)} comes out of your demo credits. No refunds if you leave.`}
              </span>
            </>
          )}
          {role === "member" && (
            <button type="button" className={outlineButton} disabled={pending !== null} onClick={() => run("leave")}>
              {pending === "leave" ? "Leaving…" : "Leave guild"}
            </button>
          )}
          {role === "owner" && (
            <>
              <button type="button" className={outlineButton} disabled={pending !== null} onClick={() => run("recruiting")}>
                {pending === "recruiting"
                  ? "Saving…"
                  : guild.recruiting
                    ? "Close recruiting"
                    : "Reopen recruiting"}
              </button>
              <span className="text-small text-muted">You own this guild. Owners can&apos;t leave yet.</span>
            </>
          )}
        </div>
      </form>

      <div aria-live="polite">
        {outcome?.ok === false && <ErrorTile title={outcome.title}>{outcome.error.message}</ErrorTile>}
        {outcome?.ok && (
          <SuccessTile title={outcome.title}>
            {outcome.joined ? (
              <>
                You&apos;re in. <Link href="/quests" className="underline">Find quests</Link> for {outcome.guildName}.
              </>
            ) : undefined}
          </SuccessTile>
        )}
      </div>
    </section>
  );
}
