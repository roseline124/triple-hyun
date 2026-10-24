import type { Transaction } from "@libsql/client";
import { ApiFailure } from "@/lib/api";
import { txGetOne, txPutOne, withTransaction } from "@/lib/db";
import { credit, getWalletIn } from "@/features/wallet/ledger";
import type { Quest, Wallet } from "@/lib/types";

/** 서버 전용. route handler 에서만 import 한다. */

async function loadQuest(tx: Transaction, questId: string): Promise<Quest> {
  const quest = await txGetOne<Quest>(tx, "quests", questId);
  if (!quest) throw new ApiFailure("not_found", "Quest not found.", 404);
  return quest;
}

/** 신청하면 의뢰자 수락 단계 없이 바로 신청자에게 배정한다(90초 시연용 결정). */
export async function applyToQuest(questId: string, userId: string): Promise<Quest> {
  return withTransaction(async (tx) => {
    const quest = await loadQuest(tx, questId);
    if (quest.applicantIds.includes(userId)) {
      throw new ApiFailure("already_applied", "You already applied to this quest.", 409);
    }
    if (quest.status !== "open") {
      throw new ApiFailure("not_open", "This quest is no longer taking applicants.", 409);
    }
    const next: Quest = {
      ...quest,
      applicantIds: [...quest.applicantIds, userId],
      assigneeId: userId,
      status: "in_progress",
    };
    await txPutOne(tx, "quests", next);
    return next;
  });
}

/**
 * 완료 처리와 보상 지급을 한 트랜잭션으로 한다. 보상은 길드를 거치지 않고 담당자 지갑에 바로 들어간다.
 * reward 가 0 인 퀘스트(수익 분배형)는 지급 없이 완료만 기록한다.
 */
export async function completeQuest(
  questId: string,
  userId: string,
): Promise<{ quest: Quest; wallet: Wallet }> {
  return withTransaction(async (tx) => {
    const quest = await loadQuest(tx, questId);
    if (quest.assigneeId !== userId) {
      throw new ApiFailure("not_assignee", "Only the member assigned to this quest can complete it.", 403);
    }
    if (quest.status !== "in_progress") {
      throw new ApiFailure("invalid_state", "This quest is already complete.", 409);
    }
    const next: Quest = { ...quest, status: "done" };
    await txPutOne(tx, "quests", next);
    const wallet =
      quest.reward > 0
        ? await credit(tx, userId, quest.reward, "quest_reward", quest.id)
        : await getWalletIn(tx, userId);
    return { quest: next, wallet };
  });
}
