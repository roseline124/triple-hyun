import { apiFetch } from "@/lib/api";
import { remoteGetAll, remoteGetOne } from "@/lib/remote";
import type { Guild, Quest } from "@/lib/types";
import { allTags, withDefaults } from "./rules";
import type { CreateGuildInput } from "./schema";

// 읽기는 `/api/data/guilds`, 쓰기는 `/api/guilds*` (서버가 닉네임+PIN과 규칙을 검증한다).
export const listGuilds = async () => (await remoteGetAll<Guild>("guilds")).map(withDefaults);
export const getGuild = async (id: string) => {
  const guild = await remoteGetOne<Guild>("guilds", id);
  return guild && withDefaults(guild);
};

/** 길드 만들 때 제안하는 태그. 능력 검사 태그와 겹치도록 기존 길드·일감 태그를 쓴다. */
export async function listTagSuggestions(): Promise<string[]> {
  const [guilds, quests] = await Promise.all([listGuilds(), remoteGetAll<Quest>("quests")]);
  return allTags([...guilds, ...quests]);
}

type Credentials = { nickname: string; pin: string };
const send = (path: string, body: unknown) =>
  apiFetch<Guild>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const requestCreate = (input: CreateGuildInput) => send("/api/guilds", input);
export const requestJoin = (id: string, c: Credentials) => send(`/api/guilds/${id}/join`, c);
export const requestLeave = (id: string, c: Credentials) => send(`/api/guilds/${id}/leave`, c);
export const requestRecruiting = (id: string, c: Credentials, recruiting: boolean) =>
  send(`/api/guilds/${id}/recruiting`, { ...c, recruiting });
