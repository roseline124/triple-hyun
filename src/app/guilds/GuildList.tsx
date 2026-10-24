"use client";

import Link from "next/link";
import { useState } from "react";
import { allTags, filterGuilds, type GuildFilter } from "@/features/guild/rules";
import type { Guild } from "@/lib/types";
import { GuildCard } from "./GuildCard";
import { outlineButton, textInput } from "@/app/scan/ui";

const NO_FILTER: GuildFilter = { query: "", recruitingOnly: false, tag: null };

export function GuildList({ guilds }: { guilds: Guild[] }) {
  const [filter, setFilter] = useState<GuildFilter>(NO_FILTER);
  const shown = filterGuilds(guilds, filter);
  const tags = allTags(guilds);
  const active = filter.query !== "" || filter.recruitingOnly || filter.tag !== null;

  return (
    <div>
      <div className="mb-6 grid gap-4">
        <div>
          <label htmlFor="guild-search">Search by region or tag</label>
          <input
            id="guild-search"
            type="search"
            className={textInput}
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 font-semibold">
          <input
            type="checkbox"
            className="size-5"
            checked={filter.recruitingOnly}
            onChange={(e) => setFilter({ ...filter, recruitingOnly: e.target.checked })}
          />
          Recruiting only
        </label>
        {tags.length > 0 && (
          <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = filter.tag?.toLowerCase() === t.toLowerCase();
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter({ ...filter, tag: on ? null : t })}
                  className={`min-h-11 rounded-pill border-2 border-brown-950 px-4 py-1 text-small font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 ${
                    on ? "bg-brown-950 text-cream-100" : "bg-transparent text-brown-950 hover:bg-sand-300"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p role="status" className="mb-4 text-small text-muted">
        {shown.length} {shown.length === 1 ? "guild" : "guilds"}
      </p>

      {shown.length === 0 ? (
        <div className="rounded-tile bg-sand-100 p-6">
          <p className="m-0 font-bold">No guilds match</p>
          <p className="mt-1 mb-0 text-small text-muted">
            {guilds.length === 0 ? "Be the first to create one." : "Clear the filters or create your own guild."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {active && (
              <button type="button" className={outlineButton} onClick={() => setFilter(NO_FILTER)}>
                Clear filters
              </button>
            )}
            <Link href="/guilds/new" className={`${outlineButton} inline-block no-underline`}>
              Create a guild
            </Link>
          </div>
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0">
          {shown.map((g) => (
            <GuildCard key={g.id} guild={g} />
          ))}
        </ul>
      )}
    </div>
  );
}
