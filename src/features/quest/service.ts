import { getAll, getOne } from "@/lib/db";
import type { Quest } from "@/lib/types";

// TODO(B): 검색/필터, 신청(applyQuest), 완료+보상 지급(completeQuest)을 여기에 구현한다.
export const listQuests = () => getAll<Quest>("quests");
export const getQuest = (id: string) => getOne<Quest>("quests", id);
