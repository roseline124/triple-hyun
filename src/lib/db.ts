import { createClient, type Client, type Transaction } from "@libsql/client";
import { seedGuilds, seedQuests, seedTxs, seedUsers, seedWallets } from "./seed";

/**
 * 서버 전용 SQLite(libSQL) 저장소. 브라우저에서 import 하지 말고 route handler 에서만 쓴다.
 * - 로컬: TURSO_DATABASE_URL 이 없으면 프로젝트 루트의 local.db 파일을 쓴다.
 * - Vercel: 파일시스템이 영속적이지 않으므로 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 이 필수다.
 * 각 테이블은 (id, data JSON) 두 컬럼이다. 첫 접속 때 테이블과 seed 를 만든다.
 */
const KEY_FIELDS = {
  users: "id",
  guilds: "id",
  quests: "id",
  wallets: "userId",
  txs: "id",
  // 능력 검사 프로필(닉네임+PIN). seed 없음, 브라우저 읽기 비허용(remote.ts).
  profiles: "id",
} as const;
export type StoreName = keyof typeof KEY_FIELDS;
const STORES = Object.keys(KEY_FIELDS) as StoreName[];

const seeds = (): Record<StoreName, readonly object[]> => ({
  users: seedUsers(),
  guilds: seedGuilds(),
  quests: seedQuests(),
  wallets: seedWallets(),
  txs: seedTxs(),
  profiles: [],
});

function seedInserts(name: StoreName, rows: readonly object[], verb: "INSERT" | "INSERT OR IGNORE") {
  return rows.map((row) => ({
    sql: `${verb} INTO ${name} (id, data) VALUES (?, ?)`,
    args: [String((row as Record<string, unknown>)[KEY_FIELDS[name]]), JSON.stringify(row)],
  }));
}

function connect(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url && process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL is not set.");
  }
  return createClient({ url: url ?? "file:local.db", authToken: process.env.TURSO_AUTH_TOKEN });
}

let dbPromise: Promise<Client> | null = null;

export function getDb(): Promise<Client> {
  if (dbPromise) return dbPromise;
  const p = (async () => {
    const client = connect();
    try {
      const data = seeds();
      await client.batch(
        STORES.flatMap((name) => [
          `CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
          // 이미 있는 행은 덮어쓰지 않으므로 재시작·동시 콜드스타트에도 안전하다.
          ...seedInserts(name, data[name], "INSERT OR IGNORE"),
        ]),
        "write",
      );
    } catch (e) {
      client.close();
      throw e;
    }
    return client;
  })();
  p.catch(() => {
    if (dbPromise === p) dbPromise = null;
  });
  dbPromise = p;
  return p;
}

/** 연결을 닫고 캐시를 비운다. 테스트용. */
export async function closeDb(): Promise<void> {
  const p = dbPromise;
  dbPromise = null;
  if (p) (await p.catch(() => null))?.close();
}

type Executor = Pick<Client | Transaction, "execute">;

async function readOne<T>(ex: Executor, store: StoreName, key: string): Promise<T | undefined> {
  const rs = await ex.execute({ sql: `SELECT data FROM ${store} WHERE id = ?`, args: [key] });
  const row = rs.rows[0];
  return row ? (JSON.parse(String(row.data)) as T) : undefined;
}

async function writeOne<T extends object>(ex: Executor, store: StoreName, value: T): Promise<void> {
  const id = String((value as Record<string, unknown>)[KEY_FIELDS[store]]);
  await ex.execute({
    sql: `INSERT INTO ${store} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    args: [id, JSON.stringify(value)],
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDb();
  const rs = await db.execute(`SELECT data FROM ${store} ORDER BY rowid`);
  return rs.rows.map((r) => JSON.parse(String(r.data)) as T);
}

export async function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  return readOne<T>(await getDb(), store, key);
}

export async function putOne<T extends object>(store: StoreName, value: T): Promise<void> {
  await writeOne(await getDb(), store, value);
}

/**
 * 여러 store 를 바꾸는 작업을 write 트랜잭션 하나로 실행한다. fn 이 throw 하면 롤백한다.
 * fn 안에서는 getOne/putOne 대신 txGetOne/txPutOne 만 쓴다(같은 연결에서 검사와 쓰기를 해야 한다).
 */
export async function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await (await getDb()).transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback().catch(() => {});
    throw e;
  } finally {
    tx.close();
  }
}

export const txGetOne = <T>(tx: Transaction, store: StoreName, key: string) => readOne<T>(tx, store, key);
export const txPutOne = <T extends object>(tx: Transaction, store: StoreName, value: T) =>
  writeOne(tx, store, value);

export function isStoreName(name: string): name is StoreName {
  return name in KEY_FIELDS;
}

/**
 * 시연 데이터 초기화. seed 가 있는 store(길드·일감·지갑·거래·유저)를 비우고 seed 를 다시 넣는다.
 * 능력 검사 프로필(profiles)은 사람마다 저장한 결과라 지우지 않는다.
 */
export async function resetSeededStores(): Promise<void> {
  const db = await getDb();
  const data = seeds();
  const seeded = STORES.filter((name) => name !== "profiles");
  await db.batch(
    seeded.flatMap((name) => [`DELETE FROM ${name}`, ...seedInserts(name, data[name], "INSERT")]),
    "write",
  );
}

/** DB 연결 확인용 가벼운 쿼리. */
export async function pingDb(): Promise<void> {
  await (await getDb()).execute("SELECT 1");
}
