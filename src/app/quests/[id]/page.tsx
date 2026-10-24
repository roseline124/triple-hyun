"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Loadable } from "@/components/Loadable";
import { getQuest } from "@/features/quest/service";
import { useAsync } from "@/lib/useAsync";

export default function QuestPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(useCallback(() => getQuest(id), [id]));
  return (
    <Loadable state={state} isEmpty={(q) => !q} empty="일감을 찾을 수 없습니다.">
      {(quest) =>
        quest && (
          <>
            <h1>{quest.title}</h1>
            <p>{quest.description}</p>
            <p className="muted">
              {quest.region} · {quest.clientName} · 보상 {quest.reward.toLocaleString()} · 계약 {quest.contract}
            </p>
            <p className="banner">신청/완료 기능은 아직 구현 전입니다. (담당 B)</p>
          </>
        )
      }
    </Loadable>
  );
}
