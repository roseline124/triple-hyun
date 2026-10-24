import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { closeDb, getAll, getOne, putOne } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/seed";
import { getMyScan, saveScan } from "@/features/scan/storage";
import { getGuild, listGuilds } from "@/features/guild/service";
import { getQuest, listQuests } from "@/features/quest/service";
import { getMyWallet } from "@/features/wallet/service";
import type { ScanResult, User, Wallet } from "@/lib/types";

beforeEach(async () => {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
});

describe("IndexedDB seed", () => {
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

  it("does not reseed over existing data on reopen", async () => {
    const wallet = (await getMyWallet()) as Wallet;
    await putOne("wallets", { ...wallet, balance: 777 });
    await closeDb();
    expect((await getMyWallet())?.balance).toBe(777);
  });
});

describe("scan storage", () => {
  const scan: ScanResult = {
    archetype: "문장 연금술사",
    summary: "s",
    stats: [],
    secondJobs: [],
    questTags: ["번역"],
  };

  it("persists the scan on the current user across reopen", async () => {
    expect(await getMyScan()).toBeNull();
    await saveScan(scan);
    await closeDb();
    expect(await getMyScan()).toEqual(scan);
  });
});
