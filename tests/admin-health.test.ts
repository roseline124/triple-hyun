import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb, getAll, getOne, putOne } from "@/lib/db";
import { CURRENT_USER_ID, seedGuilds } from "@/lib/seed";
import { POST as resetRoute } from "@/app/api/admin/reset/route";
import { GET as healthRoute } from "@/app/api/health/route";
import type { Guild, Wallet, WalletTx } from "@/lib/types";

const reset = (token?: string) =>
  resetRoute(new Request("http://test", { method: "POST", headers: token ? { "x-reset-token": token } : {} }));

beforeEach(async () => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = "file::memory:";
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await closeDb();
});

describe("POST /api/admin/reset", () => {
  it("401 without the right token, and always when the server has no token", async () => {
    expect((await reset("anything")).status).toBe(401);
    vi.stubEnv("RESET_TOKEN", "secret-token");
    expect((await reset()).status).toBe(401);
    expect((await reset("wrong-token!")).status).toBe(401);
  });

  it("restores seeded guilds, wallets and transactions but keeps scan profiles", async () => {
    vi.stubEnv("RESET_TOKEN", "secret-token");
    const [g1] = seedGuilds();
    await putOne("guilds", { ...g1, memberIds: [...g1.memberIds, "maya"] });
    await putOne("guilds", { ...g1, id: "g-new", name: "Made during the demo" });
    await putOne("wallets", { userId: CURRENT_USER_ID, balance: 7 });
    await putOne("txs", { id: "tx-1", userId: CURRENT_USER_ID, type: "charge", amount: 5, createdAt: "x" });
    await putOne("profiles", { id: "maya", nickname: "Maya" });

    const res = await reset("secret-token");
    expect(res.status).toBe(200);
    expect((await getAll<Guild>("guilds")).map((g) => g.id)).toEqual(seedGuilds().map((g) => g.id));
    expect((await getOne<Guild>("guilds", "g-1"))?.memberIds).toEqual(g1.memberIds);
    expect((await getOne<Wallet>("wallets", CURRENT_USER_ID))?.balance).toBe(100);
    expect(await getAll<WalletTx>("txs")).toEqual([]);
    expect(await getOne("profiles", "maya")).toBeDefined();
  });
});

describe("GET /api/health", () => {
  it("reports ok when the database answers", async () => {
    const res = await healthRoute();
    expect(res.status).toBe(200);
    expect((await res.json()).data.status).toBe("ok");
  });
});
