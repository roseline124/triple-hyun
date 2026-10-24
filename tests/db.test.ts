import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb, getAll, getOne, putOne } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/seed";
import { GET as listRoute } from "@/app/api/data/[store]/route";
import { GET as oneRoute } from "@/app/api/data/[store]/[id]/route";
import { getGuild, listGuilds } from "@/features/guild/service";
import { getQuest, listQuests } from "@/features/quest/service";
import { getMyWallet } from "@/features/wallet/service";
import type { User, Wallet } from "@/lib/types";

/** 브라우저 fetch 를 실제 route handler 로 연결한다. */
function stubFetchToRoutes() {
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const path = new URL(input, "http://test").pathname;
    const req = new Request(`http://test${path}`, init);
    const [, , , store, id] = path.split("/");
    return id
      ? oneRoute(req, { params: Promise.resolve({ store, id }) })
      : listRoute(req, { params: Promise.resolve({ store }) });
  });
}

beforeEach(async () => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = "file::memory:";
  stubFetchToRoutes();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await closeDb();
});

describe("SQLite seed", () => {
  it("seeds the current user and wallet on first open", async () => {
    expect((await getOne<User>("users", CURRENT_USER_ID))?.scan).toBeNull();
    expect((await getMyWallet())?.balance).toBeGreaterThanOrEqual(0);
  });

  it("guild members and owners reference existing users", async () => {
    const users = new Set((await getAll<User>("users")).map((u) => u.id));
    for (const g of await listGuilds()) {
      expect(users.has(g.ownerId)).toBe(true);
      for (const m of g.memberIds) expect(users.has(m)).toBe(true);
    }
  });

  it("starts with open quests and no applicants", async () => {
    const quests = await listQuests();
    expect(quests.length).toBeGreaterThan(0);
    for (const q of quests) {
      expect(q.status).toBe("open");
      expect(q.applicantIds).toEqual([]);
    }
  });

  it("returns undefined for unknown ids", async () => {
    expect(await getGuild("nope")).toBeUndefined();
    expect(await getQuest("nope")).toBeUndefined();
  });

  it("putOne overwrites an existing row instead of duplicating it", async () => {
    const wallet = (await getMyWallet()) as Wallet;
    await putOne("wallets", { ...wallet, balance: 777 });
    expect((await getMyWallet())?.balance).toBe(777);
    expect((await getAll<Wallet>("wallets")).filter((w) => w.userId === wallet.userId)).toHaveLength(1);
  });
});

describe("persistence across reopen (file DB)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "guild-quest-"));
    process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
  });
  afterEach(async () => {
    await closeDb();
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not reseed over existing data on reopen", async () => {
    const wallet = (await getMyWallet()) as Wallet;
    await putOne("wallets", { ...wallet, balance: 777 });
    await closeDb();
    expect((await getMyWallet())?.balance).toBe(777);
  });
});

describe("data routes", () => {
  const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;

  it("rejects stores that are not readable from the browser", async () => {
    const res = await listRoute(new Request("http://test"), ctx({ store: "users" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("never exposes scan profiles (nickname, PIN hash) to the browser", async () => {
    expect((await listRoute(new Request("http://test"), ctx({ store: "profiles" }))).status).toBe(404);
    expect((await oneRoute(new Request("http://test"), ctx({ store: "profiles", id: "maya" }))).status).toBe(404);
  });

  it("returns 404 for an unknown row", async () => {
    const res = await oneRoute(new Request("http://test"), ctx({ store: "quests", id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("surfaces a server failure as a thrown error to the client service", async () => {
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
    await expect(listQuests()).rejects.toThrow();
  });
});
