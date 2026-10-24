import type { Guild } from "@/lib/types";
import { DEFAULT_MAX_MEMBERS, JOIN_FEE_USD } from "./schema";

export type RecruitStatus = "recruiting" | "full" | "closed";

export const normalizeGuildName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * 이미 저장된 행에 새 필드가 없을 수 있어 기본값을 채운다.
 * 가입비는 모든 길드에 같은 규칙이라, 예전 seed($5·$3)로 저장된 행도 JOIN_FEE_USD 로 덮는다.
 */
export function withDefaults(raw: Partial<Guild> & Pick<Guild, "id">): Guild {
  return {
    name: "",
    region: "",
    description: "",
    tags: [],
    ownerId: "",
    memberIds: [],
    recruiting: true,
    maxMembers: DEFAULT_MAX_MEMBERS,
    lookingFor: [],
    ...raw,
    joinFee: JOIN_FEE_USD,
  };
}

/** 정원이 차면 `recruiting` 값과 상관없이 full 이다. */
export function recruitStatus(guild: Guild): RecruitStatus {
  if (!guild.recruiting) return "closed";
  return guild.memberIds.length >= guild.maxMembers ? "full" : "recruiting";
}

export const isOpen = (guild: Guild) => recruitStatus(guild) === "recruiting";

export type GuildFilter = { query: string; region: string; recruitingOnly: boolean; tag: string | null };

/** 지역·이름·태그에 질의어가 들어 있는지(대소문자 무시)와 모집 중, 정확 일치 태그·지역으로 거른다. */
export function filterGuilds(guilds: Guild[], { query, region, recruitingOnly, tag }: GuildFilter): Guild[] {
  const q = query.trim().toLowerCase();
  const wantedTag = tag?.trim().toLowerCase() ?? null;
  return guilds.filter((g) => {
    if (recruitingOnly && !isOpen(g)) return false;
    if (region && g.region !== region) return false;
    if (wantedTag && !g.tags.some((t) => t.toLowerCase() === wantedTag)) return false;
    if (!q) return true;
    return [g.name, g.region, ...g.tags].some((s) => s.toLowerCase().includes(q));
  });
}

/** 필터 칩·태그 제안용. 대소문자 무시로 합치고 알파벳순으로 정렬한다. */
export function allTags(items: { tags: string[] }[]): string[] {
  const byKey = new Map<string, string>();
  for (const item of items) for (const t of item.tags) if (!byKey.has(t.toLowerCase())) byKey.set(t.toLowerCase(), t);
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/** 지역 select 옵션용. 빈 값은 빼고 한 번씩만, 알파벳순으로. */
export const allRegions = (guilds: Guild[]): string[] =>
  [...new Set(guilds.map((g) => g.region).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/** 프로필 id. `features/scan/profile.ts` 의 `normalizeNickname` 과 같은 규칙이어야 한다(서버 전용이라 import 하지 않는다). */
export const profileIdOf = (nickname: string) => nickname.trim().replace(/\s+/g, " ").toLowerCase();

export type MemberRole = "owner" | "member" | "none";

/** 입력한 닉네임이 이 길드에서 어떤 위치인지. 화면에서 보여줄 행동만 고른다(권한 검증은 서버가 한다). */
export function memberRole(guild: Guild, nickname: string): MemberRole {
  const id = profileIdOf(nickname);
  if (!id) return "none";
  if (guild.ownerId === id) return "owner";
  return guild.memberIds.includes(id) ? "member" : "none";
}

/** 가입 버튼을 막는 이유. 가입할 수 있으면 null. */
export function joinBlockReason(guild: Guild): string | null {
  const status = recruitStatus(guild);
  if (status === "full") return "This guild is full.";
  if (status === "closed") return "This guild isn't recruiting right now.";
  return null;
}

/** 쉼표로 구분한 입력을 목록으로. 빈 항목은 버린다. */
export const parseList = (text: string): string[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
