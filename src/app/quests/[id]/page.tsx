"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Loadable } from "@/components/Loadable";
import { getQuest } from "@/features/quest/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import type { ContractType } from "@/lib/types";

const CONTRACT_LABEL: Record<ContractType, string> = {
  fixed: "Fixed price",
  revenue_share: "Revenue share",
  monthly: "Monthly retainer",
};

export default function QuestPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(useCallback(() => getQuest(id), [id]));
  return (
    <Loadable state={state} isEmpty={(q) => !q} empty="Quest not found.">
      {(quest) =>
        quest && (
          <>
            <h1>{quest.title}</h1>
            <p>{quest.description}</p>
            <p className="muted">
              {quest.region} · {quest.clientName} · Reward {formatUsd(quest.reward)} · {CONTRACT_LABEL[quest.contract]}
            </p>
            <p className="banner">Applying and completing quests isn&apos;t available yet. (Owner: B)</p>
          </>
        )
      }
    </Loadable>
  );
}
