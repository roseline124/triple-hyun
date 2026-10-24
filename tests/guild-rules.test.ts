import { describe, expect, it } from "vitest";
import {
  allRegions,
  allTags,
  filterGuilds,
  isOpen,
  joinBlockReason,
  memberRole,
  normalizeGuildName,
  parseList,
  profileIdOf,
  recruitStatus,
  withDefaults,
} from "@/features/guild/rules";
import { normalizeNickname } from "@/features/scan/profile";
import { CreateGuildSchema, GuildInputSchema, JOIN_FEE_USD } from "@/features/guild/schema";
import type { Guild } from "@/lib/types";

const valid = {
  name: "Docs Alchemists",
  region: "Austin, TX",
  description: "Technical writers shipping developer content.",
  tags: ["Technical writing"],
};
const err = (input: unknown) => {
  const r = GuildInputSchema.safeParse(input);
  return r.success ? null : r.error.issues[0]?.message;
};

describe("GuildInputSchema", () => {
  it("accepts a minimal valid guild and fills defaults", () => {
    const r = GuildInputSchema.parse(valid);
    expect(r).toMatchObject({ maxMembers: 20, lookingFor: [] });
  });

  it.each([
    ["ab", false],
    ["abc", true],
    ["a".repeat(40), true],
    ["a".repeat(41), false],
    ["bad<name>", false],
    ["Q&A Club's-1", true],
  ])("name %j valid=%s", (name, ok) => {
    expect(GuildInputSchema.safeParse({ ...valid, name }).success).toBe(ok);
  });

  it.each([
    [19, false],
    [20, true],
    [280, true],
    [281, false],
  ])("description length %i valid=%s", (n, ok) => {
    expect(GuildInputSchema.safeParse({ ...valid, description: "d".repeat(n) }).success).toBe(ok);
  });

  it("requires 1-5 tags of at most 3 words and 30 characters", () => {
    expect(err({ ...valid, tags: [] })).toBe("Add at least 1 tag.");
    expect(err({ ...valid, tags: ["a", "b", "c", "d", "e", "f"] })).toBe("Add up to 5 tags.");
    expect(err({ ...valid, tags: ["one two three four"] })).toBe("Keep each tag to 3 words or fewer.");
    expect(err({ ...valid, tags: ["x".repeat(31)] })).toBe("Keep each tag under 30 characters.");
    expect(err({ ...valid, tags: ["   "] })).toBe("Tags can't be empty.");
  });

  it("collapses whitespace and removes case-insensitive duplicate tags, keeping the first spelling", () => {
    const r = GuildInputSchema.parse({ ...valid, tags: ["  QA   automation ", "qa automation", "Support ops"] });
    expect(r.tags).toEqual(["QA automation", "Support ops"]);
  });

  it.each([
    [1, false],
    [2, true],
    [50, true],
    [51, false],
    [2.5, false],
  ])("maxMembers %f valid=%s", (maxMembers, ok) => {
    expect(GuildInputSchema.safeParse({ ...valid, maxMembers }).success).toBe(ok);
  });

  it("allows up to 3 roles to look for", () => {
    expect(GuildInputSchema.safeParse({ ...valid, lookingFor: ["a", "b", "c"] }).success).toBe(true);
    expect(err({ ...valid, lookingFor: ["a", "b", "c", "d"] })).toBe("List up to 3 roles.");
  });
});

describe("CreateGuildSchema", () => {
  it("requires credentials in addition to the guild fields", () => {
    expect(CreateGuildSchema.safeParse(valid).success).toBe(false);
    expect(CreateGuildSchema.safeParse({ ...valid, nickname: "Maya", pin: "1234" }).success).toBe(true);
    expect(CreateGuildSchema.safeParse({ ...valid, nickname: "Maya", pin: "12" }).success).toBe(false);
  });
});

const guild = (over: Partial<Guild> = {}): Guild => ({
  id: "g-x",
  name: "Docs Alchemists",
  region: "Austin, TX",
  description: "d",
  tags: ["Technical writing", "AI review"],
  ownerId: "maya",
  memberIds: ["maya"],
  joinFee: JOIN_FEE_USD,
  recruiting: true,
  maxMembers: 3,
  lookingFor: [],
  ...over,
});

describe("recruitStatus / isOpen", () => {
  it("is recruiting while there is room", () => {
    expect(recruitStatus(guild({ memberIds: ["a", "b"] }))).toBe("recruiting");
    expect(isOpen(guild({ memberIds: ["a", "b"] }))).toBe(true);
  });
  it("is full once the member count reaches the limit", () => {
    expect(recruitStatus(guild({ memberIds: ["a", "b", "c"] }))).toBe("full");
    expect(isOpen(guild({ memberIds: ["a", "b", "c"] }))).toBe(false);
  });
  it("is closed when the owner stopped recruiting, even if there is room", () => {
    expect(recruitStatus(guild({ recruiting: false }))).toBe("closed");
  });
});

describe("filterGuilds", () => {
  const a = guild({ id: "a", name: "Docs Alchemists", region: "San Francisco, CA" });
  const b = guild({ id: "b", name: "Austin Test Guardians", region: "Austin, TX", tags: ["QA automation"], recruiting: false });
  const c = guild({ id: "c", name: "Remote Ops", region: "Remote", tags: ["Support ops"], memberIds: ["1", "2", "3"] });
  const all = [a, b, c];
  const none = { query: "", region: "", recruitingOnly: false, tag: null };

  it("returns everything with no filters", () => {
    expect(filterGuilds(all, none)).toHaveLength(3);
  });
  it("matches the query against region, name and tags, ignoring case", () => {
    expect(filterGuilds(all, { ...none, query: "austin" }).map((g) => g.id)).toEqual(["b"]);
    expect(filterGuilds(all, { ...none, query: "  SUPPORT" }).map((g) => g.id)).toEqual(["c"]);
    expect(filterGuilds(all, { ...none, query: "san fran" }).map((g) => g.id)).toEqual(["a"]);
  });
  it("keeps only guilds that are recruiting with room when asked", () => {
    expect(filterGuilds(all, { ...none, recruitingOnly: true }).map((g) => g.id)).toEqual(["a"]);
  });
  it("filters by exact tag, ignoring case", () => {
    expect(filterGuilds(all, { ...none, tag: "qa AUTOMATION" }).map((g) => g.id)).toEqual(["b"]);
    expect(filterGuilds(all, { ...none, tag: "QA" })).toEqual([]);
  });
  it("filters by exact region", () => {
    expect(filterGuilds(all, { ...none, region: "Austin, TX" }).map((g) => g.id)).toEqual(["b"]);
    expect(filterGuilds(all, { ...none, region: "Austin" })).toEqual([]);
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterGuilds(all, { ...none, query: "zzz" })).toEqual([]);
  });
  it("combines filters", () => {
    expect(filterGuilds(all, { query: "docs", region: "San Francisco, CA", recruitingOnly: true, tag: "AI review" }).map((g) => g.id)).toEqual(["a"]);
    expect(filterGuilds(all, { query: "austin", region: "", recruitingOnly: true, tag: null })).toEqual([]);
  });
});

describe("allRegions", () => {
  it("lists each region once, skipping blanks, sorted", () => {
    const regions = allRegions([guild({ region: "Remote" }), guild({ region: "Austin, TX" }), guild({ region: "Remote" }), guild({ region: "" })]);
    expect(regions).toEqual(["Austin, TX", "Remote"]);
  });
});

describe("helpers", () => {
  it("normalizes guild names for uniqueness", () => {
    expect(normalizeGuildName("  Docs   ALCHEMISTS ")).toBe("docs alchemists");
  });
  it("fills missing recruiting fields for rows saved before they existed", () => {
    const old = { id: "g-old", name: "Old", tags: [], memberIds: ["u"] } as Partial<Guild> & Pick<Guild, "id">;
    expect(withDefaults(old)).toMatchObject({ recruiting: true, maxMembers: 20, lookingFor: [], joinFee: JOIN_FEE_USD, name: "Old" });
  });
  it("charges the current join fee even for rows saved with an old fee", () => {
    expect(withDefaults({ id: "g-1", joinFee: 5 }).joinFee).toBe(35);
  });
  it("lists each tag once across guilds, ignoring case, sorted", () => {
    expect(allTags([guild({ tags: ["b tag", "A tag"] }), guild({ tags: ["B TAG", "c"] })])).toEqual(["A tag", "b tag", "c"]);
  });
});

describe("memberRole / joinBlockReason / parseList / profileIdOf", () => {
  const g = guild({ ownerId: "maya", memberIds: ["maya", "sam"] });

  it("tells the owner, a member and an outsider apart by nickname, ignoring case and spacing", () => {
    expect(memberRole(g, "  MAYA ")).toBe("owner");
    expect(memberRole(g, "Sam")).toBe("member");
    expect(memberRole(g, "lee")).toBe("none");
    expect(memberRole(g, "   ")).toBe("none");
  });

  it("uses the same profile id rule as the server's normalizeNickname", () => {
    for (const n of ["  Maya   Kim ", "SAM", "a_b-c"]) expect(profileIdOf(n)).toBe(normalizeNickname(n));
  });

  it("explains why joining is blocked, or returns null when it is possible", () => {
    expect(joinBlockReason(g)).toBeNull();
    expect(joinBlockReason({ ...g, recruiting: false })).toBe("This guild isn't recruiting right now.");
    expect(joinBlockReason({ ...g, maxMembers: 2 })).toBe("This guild is full.");
  });

  it("splits comma-separated input and drops blanks", () => {
    expect(parseList(" a , b,, c ,")).toEqual(["a", "b", "c"]);
    expect(parseList("")).toEqual([]);
  });
});
