import { describe, expect, it } from "vitest";
import { allowedTags, canonicalizeTags, MAX_TAGS, suggestTags } from "@/features/scan/curate";
import { seedGuilds, seedQuests } from "@/lib/seed";
import type { Guild, Quest, ScanResult } from "@/lib/types";

const guild = (id: string, tags: string[]): Guild => ({
  id,
  name: id,
  region: "r",
  description: "d",
  tags,
  ownerId: "u",
  memberIds: [],
  joinFee: 1,
  recruiting: true,
  maxMembers: 20,
  lookingFor: [],
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
const skill = (name: string) => ({ name, score: 50, evidence: "two words", source: "resume" as const });
const scan = (patch: Partial<ScanResult> = {}): ScanResult => ({
  archetype: "a",
  summary: "s",
  skills: [skill("Mentoring"), skill("Public speaking"), skill("Budgeting")],
  secondJobs: [
    { title: "Course designer", reason: "r" },
    { title: "Event host", reason: "r" },
  ],
  tags: [],
  ...patch,
});

describe("suggestTags", () => {
  it("suggests catalog tags paired with my tags in the same guild or open quest, and never ones I already have", () => {
    const guilds = [guild("g", ["Technical writing", "AI review"])];
    const quests = [quest("q", ["technical writing", "Developer content"]), quest("done", ["Technical writing", "Closed tag"], "done")];
    const out = suggestTags(scan(), ["Technical writing"], guilds, quests);
    expect(out.map((s) => s.tag)).toEqual(["Developer content", "AI review"]);
    expect(out[1].reasons).toEqual(["Often paired with Technical writing"]);
    expect(out.find((s) => s.tag === "Closed tag")).toBeUndefined();
  });

  it("suggests tags whose words match my skills or second careers, even with no shared tags", () => {
    const guilds = [guild("g", ["Writing coach"]), guild("h", ["Course design"]), guild("i", ["Plumbing"])];
    const out = suggestTags(scan({ skills: [skill("Technical writing"), skill("x y"), skill("z w")] }), [], guilds, []);
    expect(out.map((s) => s.tag)).toEqual(["Writing coach", "Course design"]);
    expect(out[0].reasons).toEqual(["Fits your skill “Technical writing”"]);
    expect(out[1].reasons).toEqual(["Fits “Course designer” as a second career"]);
  });

  it("offers an AI tag back after I remove it, ranked first", () => {
    const out = suggestTags(scan({ tags: ["Mentoring help"] }), [], [guild("g", ["Budgeting"])], []);
    expect(out[0]).toMatchObject({ tag: "Mentoring help", reasons: ["Found in your scan", "Fits your skill “Mentoring”"] });
    expect(out[1].tag).toBe("Budgeting");
  });

  it("counts the guilds and open quests that use each tag, and breaks ties by open quests", () => {
    const guilds = [guild("g1", ["Budgeting"]), guild("g2", ["Mentoring"])];
    const quests = [quest("q1", ["Mentoring"]), quest("q2", ["Mentoring"], "done")];
    const out = suggestTags(scan(), [], guilds, quests);
    expect(out.map((s) => [s.tag, s.guildCount, s.openQuestCount])).toEqual([
      ["Mentoring", 1, 1],
      ["Budgeting", 1, 0],
    ]);
  });

  it("returns nothing when no signal links a tag to me, and at most 5 suggestions", () => {
    expect(suggestTags(scan(), [], [guild("g", ["Plumbing"])], [])).toEqual([]);
    const many = Array.from({ length: 8 }, (_, i) => guild(`g${i}`, ["Mine", `Other ${i}`]));
    expect(suggestTags(scan(), ["Mine"], many, [])).toHaveLength(5);
  });

  it("finds useful suggestions for the seeded catalog", () => {
    const out = suggestTags(scan({ tags: ["Technical writing"] }), ["Technical writing"], seedGuilds(), seedQuests());
    expect(out.map((s) => s.tag)).toEqual(["Developer content", "AI review"]);
  });
});

describe("canonicalizeTags", () => {
  const allowed = allowedTags(["My AI tag"], [guild("g", ["Technical writing"])], [quest("q", ["QA automation"])]);

  it("allows only tags from my scan or the catalog, in their catalog spelling, without duplicates", () => {
    expect(allowed).toEqual(["My AI tag", "Technical writing", "QA automation"]);
    expect(canonicalizeTags(["technical  WRITING", "my ai tag", "Technical writing"], allowed)).toEqual([
      "Technical writing",
      "My AI tag",
    ]);
  });

  it("rejects the whole request when any tag is outside the allowed list", () => {
    expect(canonicalizeTags(["Technical writing", "Made up"], allowed)).toBeNull();
  });

  it("keeps the same cap as AI tags", () => {
    expect(MAX_TAGS).toBe(6);
  });
});
