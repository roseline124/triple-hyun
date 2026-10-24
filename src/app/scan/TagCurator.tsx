"use client";

import { useState } from "react";
import { apiFetch, type ApiError } from "@/lib/api";
import { MAX_TAGS, suggestTags } from "@/features/scan/curate";
import { tagKey } from "@/features/scan/match";
import type { Credentials } from "@/features/scan/schema";
import type { Guild, Quest, ScanResult } from "@/lib/types";
import { ErrorTile, outlineButton } from "./ui";

const primaryButton =
  "rounded-pill bg-brown-950 px-6 py-2 min-h-11 font-bold text-cream-100 hover:bg-brown-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55";
const chipButton =
  "inline-flex min-h-11 items-center gap-2 rounded-pill border-2 border-brown-950 px-4 py-1 text-small font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55";

type SaveState = { status: "idle" | "saving" | "saved" } | { status: "error"; error: ApiError };

const sameTags = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((t, i) => tagKey(t) === tagKey(b[i]));

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export type TagSelection = {
  scan: ScanResult;
  tags: string[];
  savedTags: string[];
  onChange: (tags: string[]) => void;
  onSaved: (tags: string[]) => void;
  /** 없으면 저장 버튼 없이 화면에서만 고른다. */
  credentials?: Credentials;
};

export function TagCurator({
  scan,
  tags,
  savedTags,
  onChange,
  onSaved,
  guilds,
  quests,
  credentials,
}: TagSelection & { guilds: Guild[]; quests: Quest[] }) {
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const suggestions = suggestTags(scan, tags, guilds, quests);
  const full = tags.length >= MAX_TAGS;
  const dirty = !sameTags(tags, savedTags);

  const change = (next: string[]) => {
    setSave({ status: "idle" });
    onChange(next);
  };

  async function onSave() {
    if (!credentials) return;
    setSave({ status: "saving" });
    const res = await apiFetch<{ tags: string[] }>("/api/profile/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, tags }),
    });
    if (res.ok) {
      onSaved(res.data.tags);
      setSave({ status: "saved" });
    } else {
      setSave({ status: "error", error: res.error });
    }
  }

  return (
    <section aria-labelledby="scan-curate" className="rounded-tile border-2 border-brown-950 bg-white p-6">
      <h3 id="scan-curate" className="mt-0">
        Tags that fit you
      </h3>
      <p className="mt-0 text-small text-muted">
        Tags decide which guilds and quests we show you. Keep the ones that sound like you and add the suggestions
        that fit. Matches below update as you go.
      </p>

      <h4 className="mb-2 text-body">
        Your tags <span className="font-normal text-muted tabular-nums">({tags.length} of {MAX_TAGS})</span>
      </h4>
      {tags.length === 0 ? (
        <p className="m-0 text-small">No tags yet. Add one from the suggestions to see matches.</p>
      ) : (
        <ul aria-label="Selected tags" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                className={`${chipButton} bg-brown-950 text-cream-100 hover:bg-brown-800`}
                aria-label={`Remove ${tag}`}
                onClick={() => change(tags.filter((t) => t !== tag))}
              >
                {tag}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-5 mb-2 text-body">Suggested for you</h4>
      {suggestions.length === 0 ? (
        <p className="m-0 text-small">No more suggestions right now. Try removing a tag to see other options.</p>
      ) : (
        <ul aria-label="Suggested tags" className="m-0 grid list-none gap-3 p-0">
          {suggestions.map((s) => (
            <li key={s.tag} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-tile bg-sand-100 p-3">
              <span className="min-w-0">
                <strong className="block">{s.tag}</strong>
                <span className="block text-small">{s.reasons.join(" · ")}</span>
                <span className="block text-caption text-muted">
                  {plural(s.guildCount, "guild")} · {plural(s.openQuestCount, "open quest")}
                </span>
              </span>
              <button
                type="button"
                className={`${chipButton} bg-white text-brown-950 hover:bg-sand-300`}
                aria-label={`Add ${s.tag}`}
                disabled={full}
                onClick={() => change([...tags, s.tag])}
              >
                <span aria-hidden="true">+</span> Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {full && suggestions.length > 0 && (
        <p className="mt-2 mb-0 text-caption text-muted">You have {MAX_TAGS} tags. Remove one to add another.</p>
      )}

      {credentials && (
        <div className="mt-5">
          {save.status === "error" && (
            <ErrorTile title="Couldn't save your tags">{save.error.message}</ErrorTile>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={!dirty || tags.length === 0 || save.status === "saving"}
              onClick={onSave}
            >
              {save.status === "saving" ? "Saving…" : save.status === "error" ? "Try again" : "Save my tags"}
            </button>
            {dirty && (
              <button type="button" className={outlineButton} onClick={() => change(savedTags)}>
                Undo changes
              </button>
            )}
          </div>
          <p role="status" className="mt-2 mb-0 text-small">
            {save.status === "saved" && !dirty
              ? "Tags saved. You'll see them next time you look up your results."
              : dirty && tags.length === 0
                ? "Keep at least one tag to save."
                : ""}
          </p>
        </div>
      )}
    </section>
  );
}
