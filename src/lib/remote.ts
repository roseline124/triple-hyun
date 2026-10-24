import { apiFetch } from "./api";

/** 브라우저에서 읽을 수 있는 저장소. users/txs 는 노출하지 않는다. */
const READABLE_STORES = ["guilds", "quests", "wallets"] as const;
export type ReadableStore = (typeof READABLE_STORES)[number];

export function isReadableStore(name: string): name is ReadableStore {
  return (READABLE_STORES as readonly string[]).includes(name);
}

/** 서버 DB 목록 조회. 실패하면 throw 하여 useAsync 의 error 상태로 이어진다. */
export async function remoteGetAll<T>(store: ReadableStore): Promise<T[]> {
  const res = await apiFetch<T[]>(`/api/data/${store}`, { cache: "no-store" });
  if (!res.ok) throw new Error(res.error.message);
  return res.data;
}

/** 서버 DB 단건 조회. 없으면 undefined, 그 외 실패는 throw. */
export async function remoteGetOne<T>(store: ReadableStore, id: string): Promise<T | undefined> {
  const res = await apiFetch<T>(`/api/data/${store}/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (res.ok) return res.data;
  if (res.error.code === "not_found") return undefined;
  throw new Error(res.error.message);
}
