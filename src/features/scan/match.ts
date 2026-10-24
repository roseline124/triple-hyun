import type { Guild, Quest } from "@/lib/types";

/** 태그 비교 키. 대소문자·공백 차이를 무시한다. 의미 유사도는 보지 않는다. */
export const tagKey = (tag: string) => tag.trim().replace(/\s+/g, " ").toLowerCase();

/** 표시용 정규화(공백 정리)와 중복 제거. 처음 나온 표기를 유지한다. */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ");
    const key = tagKey(tag);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** `candidates` 중 `wanted` 와 겹치는 태그(candidates 의 표기, 순서 유지). */
export function sharedTags(wanted: readonly string[], candidates: readonly string[]): string[] {
  const keys = new Set(wanted.map(tagKey));
  return normalizeTags(candidates).filter((t) => keys.has(tagKey(t)));
}

/** 프롬프트 힌트용: DB의 길드·일감 태그 전체(중복 제거). */
export function collectTagVocabulary(guilds: readonly Guild[], quests: readonly Quest[]): string[] {
  return normalizeTags([...guilds.flatMap((g) => g.tags), ...quests.flatMap((q) => q.tags)]);
}

export type GuildMatch = { guild: Guild; matched: string[] };
export type QuestMatch = { quest: Quest; matched: string[] };

const MAX_RECOMMENDATIONS = 3;

/** 겹침 수 내림차순(동률이면 원래 순서), 겹침 0은 제외, 상위 3개. */
function rank<T extends { matched: string[] }>(items: T[], limit: number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.matched.length > 0)
    .sort((a, b) => b.item.matched.length - a.item.matched.length || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function recommendGuilds(personTags: readonly string[], guilds: readonly Guild[], limit = MAX_RECOMMENDATIONS): GuildMatch[] {
  return rank(
    guilds.map((guild) => ({ guild, matched: sharedTags(personTags, guild.tags) })),
    limit,
  );
}

/** 열린 일감 중 (사람 태그 ∪ 추천 길드 태그)와 겹치는 것. */
export function recommendQuests(
  personTags: readonly string[],
  recommendedGuilds: readonly GuildMatch[],
  quests: readonly Quest[],
  limit = MAX_RECOMMENDATIONS,
): QuestMatch[] {
  const wanted = normalizeTags([...personTags, ...recommendedGuilds.flatMap((m) => m.guild.tags)]);
  return rank(
    quests
      .filter((quest) => quest.status === "open")
      .map((quest) => ({ quest, matched: sharedTags(wanted, quest.tags) })),
    limit,
  );
}
