"use client";

import Link from "next/link";
import { Loadable } from "@/components/Loadable";
import { listQuests } from "@/features/quest/service";
import { useAsync } from "@/lib/useAsync";

export default function QuestsPage() {
  const state = useAsync(listQuests);
  return (
    <>
      <h1>퀘스트 게시판</h1>
      <Loadable state={state} isEmpty={(q) => q.length === 0} empty="등록된 일감이 없습니다.">
        {(quests) => (
          <ul className="cards">
            {quests.map((q) => (
              <li key={q.id}>
                <Link href={`/quests/${q.id}`}>
                  <strong>{q.title}</strong>
                </Link>
                <div className="muted">
                  {q.region} · {q.clientName} · 보상 {q.reward.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
    </>
  );
}
