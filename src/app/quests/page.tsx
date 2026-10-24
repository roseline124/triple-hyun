"use client";

import Link from "next/link";
import { useState } from "react";
import { Loadable } from "@/components/Loadable";
import { STATUS_LABEL } from "@/features/quest/labels";
import { filterQuests, listQuests, type QuestFilter } from "@/features/quest/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import type { Quest, QuestStatus } from "@/lib/types";

const FIELD = "block w-full rounded-input border-2 border-brown-950 bg-white px-3 py-2";

export default function QuestsPage() {
  const state = useAsync(listQuests);
  return (
    <>
      <h1>Quest board</h1>
      <Loadable state={state} isEmpty={(q) => q.length === 0} empty="No quests posted yet.">
        {(quests) => <QuestBoard quests={quests} />}
      </Loadable>
    </>
  );
}

function QuestBoard({ quests }: { quests: Quest[] }) {
  const [filter, setFilter] = useState<QuestFilter>({ query: "", region: "", status: "" });
  const regions = [...new Set(quests.map((q) => q.region))].toSorted();
  const shown = filterQuests(quests, filter);
  const set = (patch: Partial<QuestFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <>
      <form role="search" className="grid gap-x-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="quest-query">Search</label>
          <input
            id="quest-query"
            type="search"
            className={FIELD}
            placeholder="Title, skill, or client"
            value={filter.query}
            onChange={(e) => set({ query: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="quest-region">Location</label>
          <select
            id="quest-region"
            className={FIELD}
            value={filter.region}
            onChange={(e) => set({ region: e.target.value })}
          >
            <option value="">All locations</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quest-status">Status</label>
          <select
            id="quest-status"
            className={FIELD}
            value={filter.status}
            onChange={(e) => set({ status: e.target.value as QuestStatus | "" })}
          >
            <option value="">Any status</option>
            {(Object.keys(STATUS_LABEL) as QuestStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p className="muted" aria-live="polite">
        {shown.length === quests.length
          ? `${quests.length} quests`
          : `Showing ${shown.length} of ${quests.length} quests`}
      </p>

      {shown.length === 0 ? (
        <p className="muted">
          No quests match your filters.{" "}
          <button
            type="button"
            className="bg-transparent p-0 font-bold text-brown-950 underline hover:bg-transparent"
            onClick={() => setFilter({ query: "", region: "", status: "" })}
          >
            Clear filters
          </button>
        </p>
      ) : (
        <ul className="cards">
          {shown.map((q) => (
            <li key={q.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <Link href={`/quests/${q.id}`}>
                  <strong>{q.title}</strong>
                </Link>
                <span className="text-small font-bold">{STATUS_LABEL[q.status]}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 text-small text-muted">
                <span>{q.region}</span>
                <span>{q.clientName}</span>
                <span>{q.reward > 0 ? `Reward ${formatUsd(q.reward)}` : "Revenue share"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
