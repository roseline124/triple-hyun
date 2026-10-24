import { apiFetch, type ApiResult } from "@/lib/api";
import { remoteGetAll, remoteGetOne } from "@/lib/remote";
import type { Quest, QuestStatus, Wallet } from "@/lib/types";

// 브라우저용. 쓰기는 서버(features/quest/actions.ts)에서 한다.
export const listQuests = () => remoteGetAll<Quest>("quests");
export const getQuest = (id: string) => remoteGetOne<Quest>("quests", id);

const post = <T>(path: string): Promise<ApiResult<T>> => apiFetch<T>(path, { method: "POST" });

export const applyQuest = (id: string) => post<Quest>(`/api/quests/${encodeURIComponent(id)}/apply`);
export const completeQuest = (id: string) =>
  post<{ quest: Quest; wallet: Wallet }>(`/api/quests/${encodeURIComponent(id)}/complete`);

export type QuestFilter = { query: string; region: string; status: QuestStatus | "" };

/** 게시판 검색. seed 규모라 클라이언트에서 거른다. 빈 값은 조건 없음. */
export function filterQuests(quests: readonly Quest[], { query, region, status }: QuestFilter): Quest[] {
  const q = query.trim().toLowerCase();
  return quests.filter(
    (quest) =>
      (!region || quest.region === region) &&
      (!status || quest.status === status) &&
      (!q ||
        [quest.title, quest.description, quest.clientName, ...quest.tags].some((text) =>
          text.toLowerCase().includes(q),
        )),
  );
}
