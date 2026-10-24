import { seedGuilds, seedQuests, seedTxs, seedUsers, seedWallets } from "./seed";

/**
 * 브라우저 IndexedDB 저장소 (데모용, 서버 DB 없음).
 * 첫 오픈(upgrade) 때 seed 를 넣는다. 브라우저 데이터를 지우면 초기화된다.
 * 여러 store 를 건드리는 변경은 getDb() 로 받은 연결에서 하나의 transaction 으로 처리할 것.
 */
const DB_NAME = "guild-quest";
const DB_VERSION = 1;

const KEY_PATHS = {
  users: "id",
  guilds: "id",
  quests: "id",
  wallets: "userId",
  txs: "id",
} as const;
export type StoreName = keyof typeof KEY_PATHS;

const seeds = (): Record<StoreName, readonly object[]> => ({
  users: seedUsers(),
  guilds: seedGuilds(),
  quests: seedQuests(),
  wallets: seedWallets(),
  txs: seedTxs(),
});

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      const tx = open.transaction!;
      const data = seeds();
      for (const name of Object.keys(KEY_PATHS) as StoreName[]) {
        db.createObjectStore(name, { keyPath: KEY_PATHS[name] });
        for (const row of data[name]) tx.objectStore(name).put(row);
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  p.catch(() => {
    if (dbPromise === p) dbPromise = null;
  });
  dbPromise = p;
  return p;
}

/** 연결을 닫고 캐시를 비운다. 테스트와 데모 초기화용. */
export async function closeDb(): Promise<void> {
  const p = dbPromise;
  dbPromise = null;
  if (p) (await p.catch(() => null))?.close();
}

function wrap<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDb();
  return wrap<T[]>(db.transaction(store).objectStore(store).getAll());
}

export async function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await getDb();
  return wrap<T | undefined>(db.transaction(store).objectStore(store).get(key));
}

export async function putOne<T extends object>(store: StoreName, value: T): Promise<void> {
  const db = await getDb();
  await wrap(db.transaction(store, "readwrite").objectStore(store).put(value));
}
