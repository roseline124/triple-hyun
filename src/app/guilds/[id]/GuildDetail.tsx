"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/format";
import type { Guild } from "@/lib/types";
import { memberCount, StatusBadge } from "../GuildCard";
import { GuildPanel } from "./GuildPanel";

export function GuildHero({ guild }: { guild: Guild }) {
  return (
    <section aria-labelledby="g-name" className="rounded-hero bg-brown-950 p-8 text-cream-100">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="g-name" className="m-0">
          {guild.name}
        </h1>
        <StatusBadge guild={guild} />
      </div>
      <p className="mt-4 mb-0 max-w-prose text-on-dark-muted">{guild.description}</p>
      <ul className="mt-6 mb-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 text-small text-on-dark-muted">
        <li>{guild.region}</li>
        <li>{memberCount(guild)}</li>
        <li>Join fee {formatUsd(guild.joinFee)}</li>
      </ul>
      {guild.lookingFor.length > 0 && (
        <p className="mt-3 mb-0 text-small">
          <strong>Looking for:</strong> {guild.lookingFor.join(", ")}
        </p>
      )}
      {guild.tags.length > 0 && (
        <ul aria-label="Guild tags" className="mt-4 mb-0 flex list-none flex-wrap gap-2 p-0">
          {guild.tags.map((t) => (
            <li key={t} className="rounded-pill bg-brown-800 px-3 py-1 text-caption font-bold">
              {t}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 가입·탈퇴·모집 토글이 성공하면 서버가 돌려준 길드로 화면을 바꾼다. */
export function GuildDetail({ initial }: { initial: Guild }) {
  const [guild, setGuild] = useState(initial);
  return (
    <>
      <GuildHero guild={guild} />
      <GuildPanel guild={guild} onChange={setGuild} />
    </>
  );
}
