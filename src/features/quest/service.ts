import { remoteGetAll, remoteGetOne } from "@/lib/remote";
import type { Quest } from "@/lib/types";

// TODO(B): 검색/필터, 신청(applyQuest), 완료+보상 지급(completeQuest)을 여기에 구현한다.
// 쓰기는 서버(route handler)에서 "@/lib/db" 로 처리한다.
export const listQuests = () => remoteGetAll<Quest>("quests");
export const getQuest = (id: string) => remoteGetOne<Quest>("quests", id);
