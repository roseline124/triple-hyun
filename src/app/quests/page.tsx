"use client";

import Link from "next/link";
import { Loadable } from "@/components/Loadable";
import { listQuests } from "@/features/quest/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export default function QuestsPage() {
  const state = useAsync(listQuests);
  return (
    <>
      <h1>Quest board</h1>
      <Loadable state={state} isEmpty={(q) => q.length === 0} empty="No quests posted yet.">
        {(quests) => (
          <ul className="cards">
            {quests.map((q) => (
              <li key={q.id}>
                <Link href={`/quests/${q.id}`}>
                  <strong>{q.title}</strong>
                </Link>
                <div className="muted">
                  {q.region} · {q.clientName} · Reward {formatUsd(q.reward)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
    </>
  );
}
