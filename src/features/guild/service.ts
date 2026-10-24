import { remoteGetAll, remoteGetOne } from "@/lib/remote";
import type { Guild } from "@/lib/types";

// TODO(A): 검색/필터(지역·태그), 가입(joinGuild: 가입비 차감 + memberIds 추가)을 여기에 구현한다.
// 쓰기는 서버(route handler)에서 "@/lib/db" 로 처리한다.
export const listGuilds = () => remoteGetAll<Guild>("guilds");
export const getGuild = (id: string) => remoteGetOne<Guild>("guilds", id);
