import { describe, expect, it } from "vitest";
import {
  collectTagVocabulary,
  normalizeTags,
  recommendGuilds,
  recommendQuests,
  sharedTags,
  tagKey,
} from "@/features/scan/match";
import type { Guild, Quest } from "@/lib/types";

const guild = (id: string, tags: string[]): Guild => ({
  id,
  name: id,
  region: "r",
  description: "d",
  tags,
  ownerId: "u",
  memberIds: [],
  joinFee: 1,
});
const quest = (id: string, tags: string[], status: Quest["status"] = "open"): Quest => ({
  id,
  title: id,
  description: "d",
  region: "r",
  tags,
  reward: 1,
  contract: "fixed",
  status,
  clientName: "c",
  applicantIds: [],
  assigneeId: null,
});

describe("tag helpers", () => {
  it("compares tags ignoring case and extra whitespace", () => {
    expect(tagKey("  Technical   Writing ")).toBe("technical writing");
  });

  it("normalizes spacing, drops empties and duplicates, and keeps the first spelling", () => {
    expect(normalizeTags(["  QA  automation", "qa automation", "", "   ", "Support ops"])).toEqual([
      "QA automation",
      "Support ops",
    ]);
  });

  it("returns the candidate's own spelling for shared tags", () => {
    expect(sharedTags(["technical writing", "open source"], ["Technical writing", "Community"])).toEqual([
      "Technical writing",
    ]);
  });

  it("collects the vocabulary from guilds and quests without duplicates", () => {
    const vocab = collectTagVocabulary(
      [guild("g1", ["Technical writing", "AI review"])],
      [quest("q1", ["technical writing", "QA automation"])],
    );
    expect(vocab).toEqual(["Technical writing", "AI review", "QA automation"]);
  });
});

describe("recommendGuilds", () => {
  const guilds = [
    guild("one-overlap", ["Technical writing"]),
    guild("two-overlap", ["Technical writing", "Developer content"]),
    guild("none", ["Startups"]),
    guild("another-one", ["developer content"]),
  ];

  it("ranks by overlap count, keeps original order on ties, and skips guilds with no overlap", () => {
    const result = recommendGuilds(["Technical writing", "Developer content"], guilds);
    expect(result.map((m) => m.guild.id)).toEqual(["two-overlap", "one-overlap", "another-one"]);
    expect(result[0].matched).toEqual(["Technical writing", "Developer content"]);
  });

  it("returns at most 3", () => {
    const many = Array.from({ length: 6 }, (_, i) => guild(`g${i}`, ["x"]));
    expect(recommendGuilds(["x"], many)).toHaveLength(3);
  });

  it("returns an empty list when nothing overlaps or the person has no tags", () => {
    expect(recommendGuilds(["Unrelated"], guilds)).toEqual([]);
    expect(recommendGuilds([], guilds)).toEqual([]);
  });
});

describe("recommendQuests", () => {
  it("uses the person's tags and the recommended guilds' tags, and only open quests", () => {
    const recommended = recommendGuilds(["Technical writing"], [guild("g", ["Technical writing", "AI review"])]);
    const quests = [
      quest("via-person", ["Technical writing"]),
      quest("via-guild", ["AI review"]),
      quest("closed", ["Technical writing"], "done"),
      quest("in-progress", ["Technical writing"], "in_progress"),
      quest("unrelated", ["Open source"]),
    ];
    const result = recommendQuests(["Technical writing"], recommended, quests);
    expect(result.map((m) => m.quest.id)).toEqual(["via-person", "via-guild"]);
    expect(result[1].matched).toEqual(["AI review"]);
  });

  it("does not use tags of guilds that were not recommended", () => {
    const quests = [quest("q", ["Startups"])];
    expect(recommendQuests(["Technical writing"], [], quests)).toEqual([]);
  });

  it("ranks by overlap and returns at most 3", () => {
    const quests = [
      quest("a", ["x"]),
      quest("b", ["x", "y"]),
      quest("c", ["x"]),
      quest("d", ["y"]),
      quest("e", ["x"]),
    ];
    expect(recommendQuests(["x", "y"], [], quests).map((m) => m.quest.id)).toEqual(["b", "a", "c"]);
  });
});
