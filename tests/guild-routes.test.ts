import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createPost } from "@/app/api/guilds/route";
import { POST as joinPost } from "@/app/api/guilds/[id]/join/route";
import { POST as leavePost } from "@/app/api/guilds/[id]/leave/route";
import { POST as recruitingPost } from "@/app/api/guilds/[id]/recruiting/route";
import { GET as dataGet } from "@/app/api/data/[store]/route";
import { ensureProfile, MAX_FAILED_ATTEMPTS } from "@/features/scan/profile";
import { closeDb, getOne, putOne } from "@/lib/db";
import type { Guild } from "@/lib/types";

const maya = { nickname: "Maya", pin: "1234" };
const sam = { nickname: "Sam", pin: "4321" };
const post = (body: unknown) =>
  new Request("http://x/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const newGuild = {
  ...maya,
  name: "Docs Crew",
  region: "Remote",
  description: "A guild for technical writers.",
  tags: ["Technical writing"],
};

beforeEach(async () => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = "file::memory:";
  await ensureProfile(maya);
  await ensureProfile(sam);
});
afterEach(closeDb);

describe("POST /api/guilds/[id]/join", () => {
  it("200 returns the updated guild with the member added", async () => {
    const res = await joinPost(post(maya), ctx("g-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.memberIds).toEqual(["u-2", "maya"]);
  });

  it.each([
    ["malformed JSON", "not json"],
    ["bad PIN", { ...maya, pin: "12" }],
    ["missing nickname", { pin: "1234" }],
  ])("400 invalid_input on %s", async (_n, body) => {
    const res = await joinPost(post(body), ctx("g-1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    expect((await getOne<Guild>("guilds", "g-1"))?.memberIds).toEqual(["u-2"]);
  });

  it("401 for a wrong PIN on an existing profile", async () => {
    const res = await joinPost(post({ ...maya, pin: "0000" }), ctx("g-1"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe("Nickname or PIN doesn't match.");
  });

  it("200 for a nickname with no profile yet, creating it", async () => {
    const res = await joinPost(post({ nickname: "Newcomer", pin: "2468" }), ctx("g-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.memberIds).toEqual(["u-2", "newcomer"]);
    expect(await getOne("profiles", "newcomer")).toBeTruthy();
  });

  it("401 on leave for an unknown nickname, with the same message as a wrong PIN", async () => {
    const wrong = await leavePost(post({ ...maya, pin: "0000" }), ctx("g-1"));
    const unknown = await leavePost(post({ nickname: "Nobody", pin: "0000" }), ctx("g-1"));
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await wrong.json()).error.message).toBe((await unknown.json()).error.message);
  });

  it("429 locked after repeated wrong PINs", async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await joinPost(post({ ...maya, pin: "0000" }), ctx("g-1"));
    const res = await joinPost(post(maya), ctx("g-1"));
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe("locked");
  });

  it("maps guild errors to their status codes", async () => {
    expect((await joinPost(post(maya), ctx("g-nope"))).status).toBe(404);
    await joinPost(post(maya), ctx("g-1"));
    const again = await joinPost(post(maya), ctx("g-2"));
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe("already_member");

    await putOne("guilds", { ...(await getOne<Guild>("guilds", "g-2")), recruiting: false });
    expect((await joinPost(post(sam), ctx("g-2"))).status).toBe(409);

    await putOne("wallets", { userId: "sam", balance: 10 });
    const poor = await joinPost(post(sam), ctx("g-1"));
    expect(poor.status).toBe(402);
    expect((await poor.json()).error).toEqual({ code: "insufficient_funds", message: "You don't have enough credits. Add credits and try again." });
  });

  it("never includes the PIN hash or salt in a response", async () => {
    const text = await (await joinPost(post(maya), ctx("g-1"))).text();
    expect(text).not.toMatch(/pinHash|pinSalt/);
  });
});

describe("POST /api/guilds/[id]/leave", () => {
  it("200 removes the member; 409 when not a member", async () => {
    expect((await leavePost(post(maya), ctx("g-1"))).status).toBe(409);
    await joinPost(post(maya), ctx("g-1"));
    const res = await leavePost(post(maya), ctx("g-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).data.memberIds).toEqual(["u-2"]);
  });
});

describe("POST /api/guilds", () => {
  it("201 creates a guild owned by the caller", async () => {
    const res = await createPost(post(newGuild));
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data).toMatchObject({ name: "Docs Crew", ownerId: "maya", memberIds: ["maya"], recruiting: true, maxMembers: 20 });
    expect(await getOne<Guild>("guilds", data.id)).toEqual(data);
  });

  it("400 with the first validation message for bad fields", async () => {
    const res = await createPost(post({ ...newGuild, tags: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual({ code: "invalid_input", message: "Add at least 1 tag." });
  });

  it("409 name_taken for a duplicate name and 401 for a wrong PIN", async () => {
    expect((await createPost(post({ ...newGuild, ...sam, name: "docs alchemists" }))).status).toBe(409);
    expect((await createPost(post({ ...newGuild, pin: "0000" }))).status).toBe(401);
  });
});

describe("POST /api/guilds/[id]/recruiting", () => {
  it("200 for the owner, 403 for others, 400 without a boolean", async () => {
    const { data } = await (await createPost(post(newGuild))).json();
    const ok = await recruitingPost(post({ ...maya, recruiting: false }), ctx(data.id));
    expect(ok.status).toBe(200);
    expect((await ok.json()).data.recruiting).toBe(false);
    expect((await recruitingPost(post({ ...sam, recruiting: true }), ctx(data.id))).status).toBe(403);
    expect((await recruitingPost(post({ ...maya, recruiting: "no" }), ctx(data.id))).status).toBe(400);
  });
});

describe("reading guilds", () => {
  it("still exposes guilds through the read-only data API, including the new fields", async () => {
    const res = await dataGet(new Request("http://x/api/data/guilds"), { params: Promise.resolve({ store: "guilds" }) });
    const { data } = await res.json();
    expect(data[0]).toMatchObject({ recruiting: true, maxMembers: 20, joinFee: 35 });
  });
});
