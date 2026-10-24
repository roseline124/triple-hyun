import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiFailure } from "@/lib/api";
import { closeDb, getOne, withTransaction } from "@/lib/db";
import { CURRENT_USER_ID, seedQuests } from "@/lib/seed";
import { credit, debit, listTransactions } from "@/features/wallet/ledger";
import { filterQuests } from "@/features/quest/service";
import { POST as chargeRoute } from "@/app/api/me/wallet/charge/route";
import { GET as txsRoute } from "@/app/api/me/transactions/route";
import { POST as applyRoute } from "@/app/api/quests/[id]/apply/route";
import { POST as completeRoute } from "@/app/api/quests/[id]/complete/route";
import type { Quest, Wallet } from "@/lib/types";

const START_BALANCE = 100;

const balance = async (userId = CURRENT_USER_ID) => (await getOne<Wallet>("wallets", userId))?.balance;
const quest = (id: string) => getOne<Quest>("quests", id);

const charge = (body: unknown) =>
  chargeRoute(new Request("http://test/api/me/wallet/charge", { method: "POST", body: JSON.stringify(body) }));
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const apply = (id: string) => applyRoute(new Request("http://test", { method: "POST" }), ctx(id));
const complete = (id: string) => completeRoute(new Request("http://test", { method: "POST" }), ctx(id));
const json = async (res: Response) => res.json();

beforeEach(async () => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = "file::memory:";
});

afterEach(async () => {
  await closeDb();
});

describe("wallet ledger", () => {
  it("debit refuses to overdraw and leaves the balance and history untouched", async () => {
    await expect(
      withTransaction((tx) => debit(tx, CURRENT_USER_ID, START_BALANCE + 1, "guild_fee", "g-1")),
    ).rejects.toMatchObject({ code: "insufficient_funds", status: 402 });
    expect(await balance()).toBe(START_BALANCE);
    expect(await listTransactions(CURRENT_USER_ID)).toEqual([]);
  });

  it("records a debit as a negative transaction with its reference", async () => {
    await withTransaction((tx) => debit(tx, CURRENT_USER_ID, 5, "guild_fee", "g-1"));
    expect(await balance()).toBe(START_BALANCE - 5);
    expect(await listTransactions(CURRENT_USER_ID)).toMatchObject([
      { type: "guild_fee", amount: -5, ref: "g-1", userId: CURRENT_USER_ID },
    ]);
  });

  it("rolls back every write when a later step in the transaction fails", async () => {
    await expect(
      withTransaction(async (tx) => {
        await credit(tx, CURRENT_USER_ID, 40, "charge");
        throw new ApiFailure("boom", "x", 500);
      }),
    ).rejects.toThrow();
    expect(await balance()).toBe(START_BALANCE);
    expect(await listTransactions(CURRENT_USER_ID)).toEqual([]);
  });

  it("rejects non-positive and fractional amounts", async () => {
    for (const amount of [0, -5, 1.5]) {
      await expect(withTransaction((tx) => credit(tx, CURRENT_USER_ID, amount, "charge"))).rejects.toMatchObject({
        code: "invalid_input",
      });
    }
  });

  it("only lists the requested user's transactions", async () => {
    await withTransaction((tx) => credit(tx, "u-2", 10, "charge"));
    expect(await listTransactions(CURRENT_USER_ID)).toEqual([]);
    expect(await listTransactions("u-2")).toHaveLength(1);
  });
});

describe("POST /api/me/wallet/charge", () => {
  it("adds test credits and records a charge", async () => {
    const res = await charge({ amount: 50 });
    expect(res.status).toBe(200);
    expect((await json(res)).data).toEqual({ userId: CURRENT_USER_ID, balance: START_BALANCE + 50 });
    expect((await json(await txsRoute())).data).toMatchObject([{ type: "charge", amount: 50 }]);
  });

  it("returns 400 for invalid amounts without changing the balance", async () => {
    for (const body of [{ amount: 0 }, { amount: -1 }, { amount: 2.5 }, { amount: 1001 }, { amount: "10" }, {}]) {
      const res = await charge(body);
      expect(res.status).toBe(400);
      expect((await json(res)).error.code).toBe("invalid_input");
    }
    const malformed = await chargeRoute(new Request("http://test", { method: "POST", body: "not json" }));
    expect(malformed.status).toBe(400);
    expect(await balance()).toBe(START_BALANCE);
  });
});

describe("quest apply and complete", () => {
  it("assigns the quest to the applicant right away", async () => {
    const res = await apply("q-1");
    expect(res.status).toBe(200);
    expect(await quest("q-1")).toMatchObject({
      status: "in_progress",
      assigneeId: CURRENT_USER_ID,
      applicantIds: [CURRENT_USER_ID],
    });
  });

  it("rejects a second application and unknown quests", async () => {
    await apply("q-1");
    const again = await apply("q-1");
    expect(again.status).toBe(409);
    expect((await json(again)).error.code).toBe("already_applied");
    expect((await apply("nope")).status).toBe(404);
  });

  it("rejects applying to a quest someone else took", async () => {
    await withTransaction(async (tx) => {
      const q = seedQuests()[1];
      await tx.execute({
        sql: "UPDATE quests SET data = ? WHERE id = ?",
        args: [JSON.stringify({ ...q, status: "in_progress", assigneeId: "u-3", applicantIds: ["u-3"] }), q.id],
      });
    });
    const res = await apply("q-2");
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("not_open");
  });

  it("only lets the assignee complete, and pays the reward once", async () => {
    const notMine = await complete("q-1");
    expect(notMine.status).toBe(403);
    expect((await json(notMine)).error.code).toBe("not_assignee");

    await apply("q-1");
    const done = await complete("q-1");
    expect(done.status).toBe(200);
    const { data } = await json(done);
    expect(data.quest.status).toBe("done");
    expect(data.wallet.balance).toBe(START_BALANCE + 300);

    const again = await complete("q-1");
    expect(again.status).toBe(409);
    expect((await json(again)).error.code).toBe("invalid_state");
    expect(await balance()).toBe(START_BALANCE + 300);
  });

  it("completes a revenue-share quest without a wallet transaction", async () => {
    await apply("q-3");
    const res = await complete("q-3");
    expect(res.status).toBe(200);
    expect((await json(res)).data.wallet.balance).toBe(START_BALANCE);
    expect(await listTransactions(CURRENT_USER_ID)).toEqual([]);
  });

  it("keeps balance and history consistent across charge → apply → complete", async () => {
    await charge({ amount: 50 });
    await apply("q-1");
    await complete("q-1");
    expect(await balance()).toBe(START_BALANCE + 50 + 300);
    expect(await listTransactions(CURRENT_USER_ID)).toMatchObject([
      { type: "quest_reward", amount: 300, ref: "q-1" },
      { type: "charge", amount: 50 },
    ]);
  });
});

describe("filterQuests", () => {
  const quests = seedQuests();
  const none = { query: "", region: "", status: "" } as const;

  it("returns everything with no filters", () => {
    expect(filterQuests(quests, none)).toHaveLength(quests.length);
  });

  it("matches title, client, and tags case-insensitively", () => {
    expect(filterQuests(quests, { ...none, query: "API DOCS" }).map((q) => q.id)).toEqual(["q-1"]);
    expect(filterQuests(quests, { ...none, query: "northwind" }).map((q) => q.id)).toEqual(["q-2"]);
    expect(filterQuests(quests, { ...none, query: "open source" }).map((q) => q.id)).toEqual(["q-3"]);
  });

  it("combines location and status filters", () => {
    expect(filterQuests(quests, { ...none, region: "Austin, TX" }).map((q) => q.id)).toEqual(["q-2"]);
    expect(filterQuests(quests, { ...none, status: "done" })).toEqual([]);
  });
});
