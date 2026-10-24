"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Loadable } from "@/components/Loadable";
import { CONTRACT_LABEL, STATUS_LABEL } from "@/features/quest/labels";
import { applyQuest, completeQuest, getQuest } from "@/features/quest/service";
import { formatUsd } from "@/lib/format";
import { CURRENT_USER_ID } from "@/lib/seed";
import { useAsync } from "@/lib/useAsync";
import type { Quest } from "@/lib/types";

export default function QuestPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(useCallback(() => getQuest(id), [id]));
  return (
    <Loadable state={state} isEmpty={(q) => !q} empty="Quest not found.">
      {(quest) => quest && <QuestDetail key={quest.id} initial={quest} />}
    </Loadable>
  );
}

type Action =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "applied" }
  | { status: "completed"; paid: number; balance: number };

function QuestDetail({ initial }: { initial: Quest }) {
  const [quest, setQuest] = useState(initial);
  const [action, setAction] = useState<Action>({ status: "idle" });
  const pending = action.status === "pending";
  const mine = quest.assigneeId === CURRENT_USER_ID;

  async function onApply() {
    setAction({ status: "pending" });
    const res = await applyQuest(quest.id);
    if (!res.ok) return setAction({ status: "error", message: res.error.message });
    setQuest(res.data);
    setAction({ status: "applied" });
  }

  async function onComplete() {
    setAction({ status: "pending" });
    const res = await completeQuest(quest.id);
    if (!res.ok) return setAction({ status: "error", message: res.error.message });
    setQuest(res.data.quest);
    setAction({ status: "completed", paid: res.data.quest.reward, balance: res.data.wallet.balance });
  }

  return (
    <>
      <h1>{quest.title}</h1>
      <p>{quest.description}</p>
      <div className="flex flex-wrap gap-x-4 text-small text-muted">
        <span>{quest.region}</span>
        <span>{quest.clientName}</span>
        <span>{CONTRACT_LABEL[quest.contract]}</span>
        <span>Status: {STATUS_LABEL[quest.status]}</span>
      </div>
      <p>
        <span className="rounded-leaf bg-sand-300 px-6 py-2 font-display font-bold tabular-nums text-brown-950">
          {quest.reward > 0 ? formatUsd(quest.reward) : "Revenue share"}
        </span>
      </p>

      <section aria-labelledby="quest-action" className="rounded-tile border-2 border-brown-950 bg-white p-6">
        <h2 id="quest-action" className="mt-0 text-body font-bold">
          {quest.status === "open" && "Take this quest"}
          {quest.status === "in_progress" && (mine ? "You're working on this quest" : "Someone is on it")}
          {quest.status === "done" && "Quest completed"}
        </h2>

        {quest.status === "open" && (
          <>
            <p>You&apos;ll be assigned right away and can mark it complete when you deliver.</p>
            <button type="button" disabled={pending} onClick={onApply}>
              {pending ? "Applying…" : "Apply"}
            </button>
          </>
        )}

        {quest.status === "in_progress" && mine && (
          <>
            <p>
              {quest.reward > 0
                ? `When you're done, mark it complete to receive ${formatUsd(quest.reward)} in your wallet.`
                : "When you're done, mark it complete. This quest pays a share of future revenue instead of a fixed reward."}
            </p>
            <button type="button" disabled={pending} onClick={onComplete}>
              {pending ? "Completing…" : "Mark as complete"}
            </button>
          </>
        )}

        {quest.status === "in_progress" && !mine && (
          <p className="mb-0">Another member is assigned to this quest. Check the board for open quests.</p>
        )}

        {quest.status === "done" && action.status !== "completed" && (
          <p className="mb-0">This quest is closed.</p>
        )}

        <div aria-live="polite">
          {action.status === "error" && (
            <p role="alert" className="error">
              {action.message}
            </p>
          )}
          {action.status === "applied" && (
            <p role="status" className="rounded-input border-2 border-success bg-success-soft px-3 py-2">
              You applied and the quest is now yours.
            </p>
          )}
          {action.status === "completed" && (
            <p role="status" className="mb-0 rounded-input border-2 border-success bg-success-soft px-3 py-2">
              You completed the quest.{" "}
              {action.paid > 0
                ? `${formatUsd(action.paid)} was added to your wallet. New balance: ${formatUsd(action.balance)}.`
                : "Revenue-share payouts arrive as the client earns."}{" "}
              <Link href="/wallet">View wallet</Link>
            </p>
          )}
        </div>
      </section>

      <p>
        <Link href="/quests">Back to the quest board</Link>
      </p>
    </>
  );
}
