import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuildCard } from "@/app/guilds/GuildCard";
import { GuildList } from "@/app/guilds/GuildList";
import { CreateGuildForm } from "@/app/guilds/new/CreateGuildForm";
import { GuildHero } from "@/app/guilds/[id]/GuildDetail";
import { GuildPanel } from "@/app/guilds/[id]/GuildPanel";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { seedGuilds } from "@/lib/seed";
import type { Guild } from "@/lib/types";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const [docs, tests] = seedGuilds();
const withMembers = (g: Guild, n: number): Guild => ({ ...g, memberIds: Array.from({ length: n }, (_, i) => `m${i}`) });

describe("GuildCard", () => {
  it("shows name link, member count, fee, region, roles and a Recruiting badge", () => {
    const out = html(<GuildCard guild={docs} />);
    expect(out).toContain('href="/guilds/g-1"');
    expect(out).toContain("Docs Alchemists");
    expect(out).toContain("1 / 20 members");
    expect(out).toContain("Join fee $35");
    expect(out).toContain("San Francisco, CA");
    expect(out).toContain("Looking for:");
    expect(out).toContain("Developer advocate, Localization");
    expect(out).toContain(">Recruiting<");
  });

  it("shows a Full badge as text once the member limit is reached", () => {
    expect(html(<GuildCard guild={withMembers(tests, 12)} />)).toContain(">Full<");
  });

  it("shows a Closed badge when the owner stopped recruiting", () => {
    expect(html(<GuildCard guild={{ ...docs, recruiting: false }} />)).toContain(">Closed<");
  });

  it("omits the roles line when there are none", () => {
    expect(html(<GuildCard guild={{ ...docs, lookingFor: [] }} />)).not.toContain("Looking for");
  });
});

describe("GuildList", () => {
  it("renders every guild with a labeled search box, a Recruiting only toggle, tag filters and a count", () => {
    const out = html(<GuildList guilds={seedGuilds()} />);
    expect(out).toContain('<label for="guild-search">Search by region or tag</label>');
    expect(out).toContain('<label for="guild-region">Location</label>');
    expect(out).toContain("All locations");
    expect(out).toContain('<option value="Austin, TX">Austin, TX</option>');
    expect(out).toContain("Recruiting only");
    expect(out).toContain('aria-label="Filter by tag"');
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain("2 guilds");
    expect(out).toContain("Austin Test Guardians");
  });

  it("shows an empty state with a way to create a guild when there are no guilds", () => {
    const out = html(<GuildList guilds={[]} />);
    expect(out).toContain("No guilds match");
    expect(out).toContain("Be the first to create one.");
    expect(out).toContain('href="/guilds/new"');
    expect(out).not.toContain("Clear filters");
  });
});

describe("GuildHero", () => {
  it("shows the guild facts and tags", () => {
    const out = html(<GuildHero guild={docs} />);
    expect(out).toContain("Docs Alchemists");
    expect(out).toContain("Join fee $35");
    expect(out).toContain('aria-label="Guild tags"');
    expect(out).toContain("Technical writing");
  });
});

describe("GuildPanel", () => {
  const noop = () => {};

  it("offers Join guild for $35 with a fee note and labeled credential fields", () => {
    const out = html(<GuildPanel guild={docs} onChange={noop} />);
    expect(out).toContain("Join guild for $35");
    expect(out).toContain("No refunds if you leave.");
    expect(out).toContain('<label for="nickname">Nickname</label>');
    expect(out).toContain('type="password"');
    expect(out).toContain("we&#x27;ll create your profile");
    expect(out).not.toContain('disabled=""');
  });

  it("disables joining and explains why when the guild is full or closed", () => {
    const full = html(<GuildPanel guild={withMembers(tests, 12)} onChange={noop} />);
    expect(full).toContain('disabled=""');
    expect(full).toContain("This guild is full.");
    const closed = html(<GuildPanel guild={{ ...docs, recruiting: false }} onChange={noop} />);
    expect(closed).toContain('disabled=""');
    expect(closed).toContain("This guild isn&#x27;t recruiting right now.");
  });
});

describe("CreateGuildForm", () => {
  it("labels every field, shows limits, and offers suggested tags", () => {
    const out = html(<CreateGuildForm suggestions={["QA automation", "Support ops"]} />);
    for (const label of ["Guild name", "Region", "Description", "Tags", "Max members", "Nickname", "4-digit PIN"]) {
      expect(out).toContain(`>${label}</label>`);
    }
    expect(out).toContain("0 / 280 characters. At least 20.");
    expect(out).toContain('aria-label="Suggested tags"');
    expect(out).toContain("QA automation");
    expect(out).toContain('value="20"');
    expect(out).toContain(">Create guild<");
  });

  it("omits the suggested tag group when there are no suggestions", () => {
    expect(html(<CreateGuildForm suggestions={[]} />)).not.toContain("Suggested tags");
  });
});
