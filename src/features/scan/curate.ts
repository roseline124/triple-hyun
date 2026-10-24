import type { Guild, Quest, ScanResult } from "@/lib/types";
import { collectTagVocabulary, normalizeTags, tagKey } from "./match";

/** 프로필에 둘 수 있는 태그 수. AI 추출 상한과 같다. */
export const MAX_TAGS = 6;
const MAX_SUGGESTIONS = 5;

export type TagSuggestion = {
  tag: string;
  /** 화면에 그대로 보이는 추천 이유(영어). 가장 강한 근거가 먼저. */
  reasons: string[];
  guildCount: number;
  openQuestCount: number;
  score: number;
};

const STOPWORDS = new Set(["and", "for", "the", "with", "from", "into", "your", "our", "you"]);

/** 아주 가벼운 어간 추출. writing/writer → writ, automation/automated → automat. */
function stem(word: string): string {
  const cut = word.replace(/(ations|ation|ments|ment|ings|ing|ers|er|ions|ion|ed|es|s)$/, "");
  return cut.length >= 3 ? cut : word;
}

function stems(text: string): Set<string> {
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return new Set(words.filter((w) => w.length >= 3 && !STOPWORDS.has(w)).map(stem));
}

const overlaps = (a: Set<string>, b: Set<string>) => [...a].some((s) => b.has(s));

/**
 * 지금 고른 태그(`selected`) 밖에서, 나와 맞는 카탈로그 태그를 추천한다. AI 호출 없이 재현 가능한 점수다.
 * - 검사에서 AI가 뽑았지만 지금 빠진 태그: +3
 * - 내 검사 결과의 능력 이름과 단어가 겹침: +2, 제2의 직업 제목과 겹침: +1
 * - 내 태그와 같은 길드·열린 일감에 함께 붙어 있음: 함께 붙은 곳마다 +2
 * 점수 0은 제외. 동점이면 열린 일감 수, 그다음 카탈로그 순서.
 */
export function suggestTags(
  scan: Pick<ScanResult, "tags" | "skills" | "secondJobs">,
  selected: readonly string[],
  guilds: readonly Guild[],
  quests: readonly Quest[],
  limit = MAX_SUGGESTIONS,
): TagSuggestion[] {
  const chosen = new Set(selected.map(tagKey));
  const openQuests = quests.filter((q) => q.status === "open");
  const groups = [...guilds.map((g) => g.tags), ...openQuests.map((q) => q.tags)];
  const fromScan = new Set(scan.tags.map(tagKey));
  const candidates = normalizeTags([...scan.tags, ...collectTagVocabulary(guilds, quests)]);

  const scored = candidates
    .filter((tag) => !chosen.has(tagKey(tag)))
    .map((tag, index) => {
      const key = tagKey(tag);
      const has = (tags: readonly string[]) => tags.some((t) => tagKey(t) === key);
      const tagStems = stems(tag);
      const reasons: string[] = [];
      let score = 0;

      if (fromScan.has(key)) {
        score += 3;
        reasons.push("Found in your scan");
      }
      const skill = scan.skills.find((s) => overlaps(tagStems, stems(s.name)));
      if (skill) {
        score += 2;
        reasons.push(`Fits your skill “${skill.name}”`);
      }
      const job = scan.secondJobs.find((j) => overlaps(tagStems, stems(j.title)));
      if (job) {
        score += 1;
        reasons.push(`Fits “${job.title}” as a second career`);
      }
      const mine = (tags: readonly string[]) => tags.filter((t) => chosen.has(tagKey(t)));
      const pairedGroups = groups.filter((tags) => has(tags) && mine(tags).length > 0);
      if (pairedGroups.length > 0) {
        score += 2 * pairedGroups.length;
        reasons.push(`Often paired with ${normalizeTags(pairedGroups.flatMap(mine)).join(", ")}`);
      }

      return {
        index,
        suggestion: {
          tag,
          reasons,
          guildCount: guilds.filter((g) => has(g.tags)).length,
          openQuestCount: openQuests.filter((q) => has(q.tags)).length,
          score,
        },
      };
    });

  return scored
    .filter(({ suggestion }) => suggestion.score > 0)
    .sort(
      (a, b) =>
        b.suggestion.score - a.suggestion.score ||
        b.suggestion.openQuestCount - a.suggestion.openQuestCount ||
        a.index - b.index,
    )
    .slice(0, limit)
    .map(({ suggestion }) => suggestion);
}

/** 저장 가능한 태그: 검사에서 AI가 뽑은 태그 ∪ 길드·일감 태그. 위조한 임의 태그를 막는다. */
export function allowedTags(scanTags: readonly string[], guilds: readonly Guild[], quests: readonly Quest[]) {
  return normalizeTags([...scanTags, ...collectTagVocabulary(guilds, quests)]);
}

/**
 * 요청 태그를 허용 목록의 표기로 바꾼다. 목록 밖 태그가 하나라도 있으면 null.
 * 대소문자·공백 차이는 같은 태그로 본다.
 */
export function canonicalizeTags(requested: readonly string[], allowed: readonly string[]): string[] | null {
  const byKey = new Map(allowed.map((t) => [tagKey(t), t]));
  const out: string[] = [];
  for (const tag of normalizeTags(requested)) {
    const canonical = byKey.get(tagKey(tag));
    if (!canonical) return null;
    out.push(canonical);
  }
  return out;
}
