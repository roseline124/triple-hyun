import { getAll, getOne } from "@/lib/db";
import type { Guild } from "@/lib/types";

// TODO(A): 검색/필터(지역·태그), 가입(joinGuild: 가입비 차감 + memberIds 추가)을 여기에 구현한다.
export const listGuilds = () => getAll<Guild>("guilds");
export const getGuild = (id: string) => getOne<Guild>("guilds", id);
