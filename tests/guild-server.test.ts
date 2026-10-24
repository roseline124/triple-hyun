import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiFailure } from "@/lib/api";
import { closeDb, getAll, getOne, putOne } from "@/lib/db";
import { ensureProfile, MAX_FAILED_ATTEMPTS, ProfileError } from "@/features/scan/profile";
import { createGuild, GuildError, joinGuild, leaveGuild, setRecruiting } from "@/features/guild/server";
import { JOIN_FEE_USD, STARTING_CREDIT_USD, type CreateGuildInput } from "@/features/guild/schema";
import type { Guild, Wallet, WalletTx } from "@/lib/types";

const maya = { nickname: "Maya", pin: "1234" };
const sam = { nickname: "Sam", pin: "4321" };
const lee = { nickname: "Lee", pin: "1111" };
const t0 = new Date("2026-10-24T10:00:00Z");

let dir: string | null = null;
const useDb = async (url: string) => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = url;
};

beforeEach(async () => {
  await useDb("file::memory:");
});
afterEach(async () => {
  await closeDb();
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e) => (e instanceof GuildError || e instanceof ProfileError || e instanceof ApiFailure ? e.code : `other:${String(e)}`),
  );
const guildOf = (id: string) => getOne<Guild>("guilds", id).then((g) => g!);
const walletOf = (id: string) => getOne<Wallet>("wallets", id);
const txs = () => getAll<WalletTx>("txs");

const input = (over: Partial<CreateGuildInput> = {}): CreateGuildInput => ({
  ...maya,
  name: "Docs Crew",
  region: "Remote",
  description: "A guild for technical writers.",
  tags: ["Technical writing"],
  maxMembers: 20,
  lookingFor: [],
  ...over,
});

describe("joinGuild", () => {
  it("adds the member, charges the join fee from a new $100 wallet and records a guild_fee transaction", async () => {
    await ensureProfile(maya, t0);
    const g = await joinGuild(maya, "g-1", t0);
    expect(g.memberIds).toEqual(["u-2", "maya"]);
    expect((await guildOf("g-1")).memberIds).toContain("maya");
    expect(await walletOf("maya")).toEqual({ userId: "maya", balance: STARTING_CREDIT_USD - JOIN_FEE_USD });
    expect(await txs()).toEqual([
      expect.objectContaining({ userId: "maya", type: "guild_fee", amount: -JOIN_FEE_USD, ref: "g-1" }),
    ]);
  });

  it("fails with not_found for an unknown guild without touching the wallet", async () => {
    await ensureProfile(maya, t0);
    expect(await code(joinGuild(maya, "g-nope", t0))).toBe("not_found");
    expect(await walletOf("maya")).toBeUndefined();
  });

  it("rejects a second guild with already_member, whether it is the same or another guild", async () => {
    await ensureProfile(maya, t0);
    await joinGuild(maya, "g-1", t0);
    expect(await code(joinGuild(maya, "g-1", t0))).toBe("already_member");
    expect(await code(joinGuild(maya, "g-2", t0))).toBe("already_member");
    expect((await walletOf("maya"))?.balance).toBe(STARTING_CREDIT_USD - JOIN_FEE_USD);
    expect(await txs()).toHaveLength(1);
  });

  it("rejects a guild that stopped recruiting or is full, leaving members and wallet unchanged", async () => {
    await ensureProfile(maya, t0);
    await putOne("guilds", { ...(await guildOf("g-1")), recruiting: false });
    expect(await code(joinGuild(maya, "g-1", t0))).toBe("closed");
    await putOne("guilds", { ...(await guildOf("g-2")), maxMembers: 1 });
    expect(await code(joinGuild(maya, "g-2", t0))).toBe("full");
    expect((await guildOf("g-1")).memberIds).toEqual(["u-2"]);
    expect(await walletOf("maya")).toBeUndefined();
  });

  it("fails with insufficient_funds and changes nothing when the balance is below the fee", async () => {
    await ensureProfile(maya, t0);
    await putOne("wallets", { userId: "maya", balance: JOIN_FEE_USD - 1 });
    expect(await code(joinGuild(maya, "g-1", t0))).toBe("insufficient_funds");
    expect((await guildOf("g-1")).memberIds).toEqual(["u-2"]);
    expect((await walletOf("maya"))?.balance).toBe(JOIN_FEE_USD - 1);
    expect(await txs()).toEqual([]);
  });

  it("lets a balance exactly equal to the fee join and leaves $0", async () => {
    await ensureProfile(maya, t0);
    await putOne("wallets", { userId: "maya", balance: JOIN_FEE_USD });
    await joinGuild(maya, "g-1", t0);
    expect((await walletOf("maya"))?.balance).toBe(0);
  });

  it("creates the profile with that nickname and PIN when none exists, then joins with a new $100 wallet", async () => {
    expect(await getOne("profiles", "maya")).toBeUndefined();
    expect(await code(joinGuild(maya, "g-1", t0))).toBe("ok");
    expect(await getOne("profiles", "maya")).toMatchObject({ nickname: "Maya", scan: null });
    expect((await guildOf("g-1")).memberIds).toEqual(["u-2", "maya"]);
    expect((await walletOf("maya"))?.balance).toBe(STARTING_CREDIT_USD - JOIN_FEE_USD);
    expect(await code(leaveGuild({ ...maya, pin: "9999" }, "g-1", t0))).toBe("invalid_credentials");
    expect(await code(leaveGuild(maya, "g-1", t0))).toBe("ok");
  });

  it("requires the right PIN for an existing profile, and writes nothing otherwise", async () => {
    await ensureProfile(maya, t0);
    expect(await code(joinGuild({ ...maya, pin: "9999" }, "g-1", t0))).toBe("invalid_credentials");
    expect((await guildOf("g-1")).memberIds).toEqual(["u-2"]);
    expect(await walletOf("maya")).toBeUndefined();
  });

  it("refuses while the profile is locked, even with the right PIN", async () => {
    await ensureProfile(maya, t0);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await code(joinGuild({ ...maya, pin: "0000" }, "g-1", t0));
    expect(await code(joinGuild(maya, "g-1", t0))).toBe("locked");
    expect((await guildOf("g-1")).memberIds).toEqual(["u-2"]);
  });

  it("lets only as many people join as there is room for when they join at the same time", async () => {
    dir = mkdtempSync(join(tmpdir(), "guild-test-"));
    await useDb(`file:${join(dir, "test.db")}`);
    await Promise.all([ensureProfile(maya, t0), ensureProfile(sam, t0), ensureProfile(lee, t0)]);
    await putOne("guilds", { ...(await guildOf("g-1")), maxMembers: 2 });

    const results = await Promise.all([maya, sam, lee].map((c) => code(joinGuild(c, "g-1", t0))));

    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === "full")).toHaveLength(2);
    expect((await guildOf("g-1")).memberIds).toHaveLength(2);
    expect(await txs()).toHaveLength(1);
  });
});

describe("leaveGuild", () => {
  it("removes the member without refunding the fee, and they can then join another guild", async () => {
    await ensureProfile(maya, t0);
    await joinGuild(maya, "g-1", t0);
    const g = await leaveGuild(maya, "g-1", t0);
    expect(g.memberIds).toEqual(["u-2"]);
    expect((await walletOf("maya"))?.balance).toBe(STARTING_CREDIT_USD - JOIN_FEE_USD);
    await joinGuild(maya, "g-2", t0);
    expect((await guildOf("g-2")).memberIds).toContain("maya");
    expect((await walletOf("maya"))?.balance).toBe(STARTING_CREDIT_USD - 2 * JOIN_FEE_USD);
  });

  it("rejects non-members and unknown guilds", async () => {
    await ensureProfile(maya, t0);
    expect(await code(leaveGuild(maya, "g-1", t0))).toBe("not_member");
    expect(await code(leaveGuild(maya, "g-nope", t0))).toBe("not_found");
  });

  it("does not let the owner leave", async () => {
    await ensureProfile(maya, t0);
    const g = await createGuild(input(), t0);
    expect(await code(leaveGuild(maya, g.id, t0))).toBe("owner_cannot_leave");
    expect((await guildOf(g.id)).memberIds).toEqual(["maya"]);
  });

  it("checks credentials first", async () => {
    await ensureProfile(maya, t0);
    await joinGuild(maya, "g-1", t0);
    expect(await code(leaveGuild({ ...maya, pin: "0000" }, "g-1", t0))).toBe("invalid_credentials");
    expect((await guildOf("g-1")).memberIds).toContain("maya");
  });
});

describe("createGuild", () => {
  it("creates a recruiting guild owned by the creator as its first member, free of charge", async () => {
    await ensureProfile(maya, t0);
    const g = await createGuild(input({ lookingFor: ["Editor"] }), t0);
    expect(g).toMatchObject({
      name: "Docs Crew",
      ownerId: "maya",
      memberIds: ["maya"],
      recruiting: true,
      joinFee: JOIN_FEE_USD,
      lookingFor: ["Editor"],
    });
    expect(g.id).toMatch(/^g-[0-9a-f]{8}$/);
    expect(await guildOf(g.id)).toEqual(g);
    expect(await walletOf("maya")).toBeUndefined();
    expect(await txs()).toEqual([]);
  });

  it("rejects a duplicate name regardless of case and spacing", async () => {
    await ensureProfile(maya, t0);
    await ensureProfile(sam, t0);
    await createGuild(input({ name: "Docs Crew" }), t0);
    expect(await code(createGuild(input({ ...sam, name: "docs   CREW" }), t0))).toBe("name_taken");
    expect(await code(createGuild(input({ ...sam, name: "DOCS ALCHEMISTS" }), t0))).toBe("name_taken");
    expect(await getAll<Guild>("guilds")).toHaveLength(3);
  });

  it("rejects creating a guild while already in one", async () => {
    await ensureProfile(maya, t0);
    await joinGuild(maya, "g-1", t0);
    expect(await code(createGuild(input(), t0))).toBe("already_member");
  });

  it("creates the profile with that nickname and PIN when none exists, so the same credentials work afterwards", async () => {
    expect(await getOne("profiles", "maya")).toBeUndefined();
    const g = await createGuild(input(), t0);
    expect(g.ownerId).toBe("maya");
    expect(await getOne("profiles", "maya")).toMatchObject({ nickname: "Maya", scan: null });
    expect(await code(setRecruiting(maya, g.id, false, t0))).toBe("ok");
    expect(await code(setRecruiting({ ...maya, pin: "0000" }, g.id, false, t0))).toBe("invalid_credentials");
  });

  it("rejects the wrong PIN for an existing profile without creating a guild", async () => {
    await ensureProfile(maya, t0);
    expect(await code(createGuild(input({ pin: "0000" }), t0))).toBe("invalid_credentials");
    expect(await getAll<Guild>("guilds")).toHaveLength(2);
  });
});

describe("setRecruiting", () => {
  it("lets the owner close and reopen recruiting, which then blocks and allows joining", async () => {
    await ensureProfile(maya, t0);
    await ensureProfile(sam, t0);
    const g = await createGuild(input(), t0);
    expect((await setRecruiting(maya, g.id, false, t0)).recruiting).toBe(false);
    expect(await code(joinGuild(sam, g.id, t0))).toBe("closed");
    expect((await setRecruiting(maya, g.id, true, t0)).recruiting).toBe(true);
    expect(await code(joinGuild(sam, g.id, t0))).toBe("ok");
  });

  it("rejects non-owners, including members", async () => {
    await ensureProfile(maya, t0);
    await ensureProfile(sam, t0);
    const g = await createGuild(input(), t0);
    await joinGuild(sam, g.id, t0);
    expect(await code(setRecruiting(sam, g.id, false, t0))).toBe("forbidden");
    expect((await guildOf(g.id)).recruiting).toBe(true);
  });

  it("rejects unknown guilds and wrong PINs", async () => {
    await ensureProfile(maya, t0);
    expect(await code(setRecruiting(maya, "g-nope", false, t0))).toBe("not_found");
    expect(await code(setRecruiting({ ...maya, pin: "0000" }, "g-1", false, t0))).toBe("invalid_credentials");
  });
});

describe("rows saved before the recruiting fields existed", () => {
  it("can still be joined, using default capacity", async () => {
    await ensureProfile(maya, t0);
    const legacy: Partial<Guild> = { ...(await guildOf("g-1")) };
    delete legacy.recruiting;
    delete legacy.maxMembers;
    delete legacy.lookingFor;
    await putOne("guilds", legacy);
    expect(await code(joinGuild(maya, "g-1", t0))).toBe("ok");
  });
});
