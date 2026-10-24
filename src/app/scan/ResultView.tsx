"use client";

import Link from "next/link";
import { useState } from "react";
import { listGuilds } from "@/features/guild/service";
import { recommendGuilds, recommendQuests, type GuildMatch, type QuestMatch } from "@/features/scan/match";
import type { Credentials } from "@/features/scan/schema";
import { listQuests } from "@/features/quest/service";
import { formatUsd } from "@/lib/format";
import type { Guild, Quest, ScanResult } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { TagCurator, type TagSelection } from "./TagCurator";
import { ErrorTile, LoadingTile, outlineButton } from "./ui";

const SOURCE_LABEL = { resume: "From your résumé", answer: "From your answers" } as const;

export function ScanResultView({
  result,
  curatedTags = null,
  credentials,
}: {
  result: ScanResult;
  /** 저장된 큐레이션 태그. null 이면 AI가 뽑은 `result.tags` 로 시작한다. */
  curatedTags?: string[] | null;
  credentials?: Credentials;
}) {
  const [savedTags, setSavedTags] = useState(curatedTags ?? result.tags);
  const [tags, setTags] = useState(savedTags);
  const onSaved = (next: string[]) => {
    setSavedTags(next);
    setTags(next);
  };
  return (
    <div className="grid gap-4">
      <section aria-labelledby="scan-result" className="rounded-hero bg-brown-950 p-8 text-cream-100">
        <p className="m-0 flex items-center gap-2 text-small text-on-dark-muted">
          <span aria-hidden="true" className="size-3 rounded-pill bg-orange-500" />
          Your archetype
        </p>
        <h2 id="scan-result" className="mt-2 mb-3 text-h1 font-extrabold">
          {result.archetype}
        </h2>
        <p className="m-0">{result.summary}</p>
        {tags.length > 0 && (
          <ul aria-label="Your tags" className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {tags.map((tag) => (
              <li key={tag} className="rounded-pill bg-brown-800 px-3 py-1 text-small text-cream-100">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="scan-skills" className="rounded-tile border-2 border-brown-950 bg-white p-6">
        <h3 id="scan-skills" className="mt-0">
          Skills we found
        </h3>
        <p className="mt-0 text-small text-muted">Each skill quotes what you wrote. Scores are relative estimates, not test results.</p>
        <ul className="m-0 grid list-none gap-5 p-0">
          {result.skills.map((s) => (
            <li key={s.name}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-bold">{s.name}</span>
                <span className="font-display font-bold tabular-nums">{s.score}/100</span>
              </div>
              <div
                role="img"
                aria-label={`${s.name}: ${s.score} out of 100`}
                className="mt-1 h-3 overflow-hidden rounded-pill border-2 border-brown-950 bg-sand-100"
              >
                <div className="h-full bg-brown-950" style={{ width: `${s.score}%` }} />
              </div>
              <blockquote className="m-0 mt-2 text-small">
                <q>{s.evidence}</q>
                <span className="block text-caption text-muted">{SOURCE_LABEL[s.source]}</span>
              </blockquote>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="scan-jobs" className="rounded-tile bg-sand-100 p-6">
        <h3 id="scan-jobs" className="mt-0">
          Second-career options
        </h3>
        <ul className="m-0 grid list-none gap-3 p-0">
          {result.secondJobs.map((j) => (
            <li key={j.title}>
              <strong>{j.title}</strong>
              <span className="block text-small">{j.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <RecommendationsLoader
        curator={{ scan: result, tags, savedTags, onChange: setTags, onSaved, credentials }}
      />

      <p className="m-0 text-caption text-muted">
        AI estimate based only on what you shared. Not a verified assessment; scores are relative.
      </p>
    </div>
  );
}

const loadCatalog = () => Promise.all([listGuilds(), listQuests()]);

/** 길드·일감 목록을 읽어 태그 큐레이션과 겹치는 추천을 보여준다. 실패해도 위쪽 결과는 그대로 보인다. */
export function RecommendationsLoader({ curator }: { curator: TagSelection }) {
  // 재시도는 key 를 바꿔 다시 마운트한다. useAsync 에는 안정된 함수만 넘긴다.
  const [attempt, setAttempt] = useState(0);
  return <CatalogMatches key={attempt} curator={curator} onRetry={() => setAttempt((n) => n + 1)} />;
}

function CatalogMatches({ curator, onRetry }: { curator: TagSelection; onRetry: () => void }) {
  const state = useAsync(loadCatalog);

  if (state.status === "loading") return <LoadingTile label="Finding guilds and quests that fit…" />;
  if (state.status === "error") {
    return (
      <ErrorTile
        title="Couldn't load guilds and quests"
        actions={
          <button type="button" className={outlineButton} onClick={onRetry}>
            Try again
          </button>
        }
      >
        Your results are saved. Check your connection and try again.
      </ErrorTile>
    );
  }
  const [guilds, quests] = state.data;
  return (
    <>
      <TagCurator {...curator} guilds={guilds} quests={quests} />
      <Recommendations tags={curator.tags} guilds={guilds} quests={quests} />
    </>
  );
}

export function Recommendations({ tags, guilds, quests }: { tags: string[]; guilds: Guild[]; quests: Quest[] }) {
  const guildMatches = recommendGuilds(tags, guilds);
  const questMatches = recommendQuests(tags, guildMatches, quests);
  return (
    <>
      <section aria-labelledby="scan-guilds" className="rounded-tile bg-orange-100 p-6">
        <h3 id="scan-guilds" className="mt-0">
          Guilds that fit
        </h3>
        {guildMatches.length === 0 ? (
          <p className="m-0">
            No matching guilds yet. <Link href="/guilds">Browse all guilds</Link>
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {guildMatches.map((m) => (
              <GuildCard key={m.guild.id} match={m} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="scan-quests" className="rounded-tile bg-sand-100 p-6">
        <h3 id="scan-quests" className="mt-0">
          Open quests that fit
        </h3>
        {questMatches.length === 0 ? (
          <p className="m-0">
            No open quests match yet. <Link href="/quests">Browse all quests</Link>
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {questMatches.map((m) => (
              <QuestCard key={m.quest.id} match={m} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function GuildCard({ match: { guild, matched } }: { match: GuildMatch }) {
  return (
    <li className="rounded-tile bg-white p-4">
      <Link href={`/guilds/${guild.id}`} className="font-bold">
        {guild.name}
      </Link>
      <span className="flex flex-wrap gap-x-4 text-small text-muted">
        <span>{guild.region}</span>
        <span>Join fee {formatUsd(guild.joinFee)}</span>
      </span>
      <span className="block text-small">Matches: {matched.join(", ")}</span>
    </li>
  );
}

function QuestCard({ match: { quest, matched } }: { match: QuestMatch }) {
  return (
    <li className="rounded-tile bg-white p-4">
      <Link href={`/quests/${quest.id}`} className="font-bold">
        {quest.title}
      </Link>
      <span className="flex flex-wrap gap-x-4 text-small text-muted">
        <span>{quest.region}</span>
        <span>{quest.contract === "revenue_share" ? "Revenue share" : formatUsd(quest.reward)}</span>
      </span>
      <span className="block text-small">Matches: {matched.join(", ")}</span>
    </li>
  );
}
