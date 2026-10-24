"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CredentialFields } from "@/app/scan/CredentialFields";
import { ErrorTile, primaryButton, textInput } from "@/app/scan/ui";
import { parseList } from "@/features/guild/rules";
import { DEFAULT_MAX_MEMBERS } from "@/features/guild/schema";
import { requestCreate } from "@/features/guild/service";
import type { ApiError } from "@/lib/api";

type Form = {
  nickname: string;
  pin: string;
  name: string;
  region: string;
  description: string;
  tags: string;
  maxMembers: string;
  lookingFor: string;
};

const EMPTY: Form = {
  nickname: "",
  pin: "",
  name: "",
  region: "",
  description: "",
  tags: "",
  maxMembers: String(DEFAULT_MAX_MEMBERS),
  lookingFor: "",
};

/** `suggestions` 는 기존 길드·일감 태그. 눌러서 태그 목록에 더한다. */
export function CreateGuildForm({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const chosen = parseList(form.tags).map((t) => t.toLowerCase());
  const addTag = (tag: string) => set({ tags: [...parseList(form.tags), tag].join(", ") });

  async function submit() {
    setPending(true);
    setError(null);
    const res = await requestCreate({
      nickname: form.nickname,
      pin: form.pin,
      name: form.name,
      region: form.region,
      description: form.description,
      tags: parseList(form.tags),
      maxMembers: Number(form.maxMembers),
      lookingFor: parseList(form.lookingFor),
    });
    if (res.ok) return router.push(`/guilds/${res.data.id}`);
    setPending(false);
    setError(res.error);
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="m-0 text-small text-muted">
        New here? Pick a nickname and a 4-digit PIN and we&apos;ll create your profile. Already scanned? Use the same ones.
      </p>
      <CredentialFields nickname={form.nickname} pin={form.pin} onNickname={(v) => set({ nickname: v })} onPin={(v) => set({ pin: v })} />

      <div>
        <label htmlFor="g-name">Guild name</label>
        <input
          id="g-name"
          className={textInput}
          required
          minLength={3}
          maxLength={40}
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="g-region">Region</label>
        <input
          id="g-region"
          className={textInput}
          required
          minLength={2}
          maxLength={60}
          aria-describedby="g-region-help"
          value={form.region}
          onChange={(e) => set({ region: e.target.value })}
        />
        <p id="g-region-help" className="mt-1 text-caption text-muted">
          A city like Austin, TX, or Remote.
        </p>
      </div>
      <div>
        <label htmlFor="g-description">Description</label>
        <textarea
          id="g-description"
          className={`${textInput} min-h-28`}
          required
          minLength={20}
          maxLength={280}
          aria-describedby="g-description-help"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
        <p id="g-description-help" className="mt-1 text-caption text-muted">
          {form.description.trim().length} / 280 characters. At least 20.
        </p>
      </div>
      <div>
        <label htmlFor="g-tags">Tags</label>
        <input
          id="g-tags"
          className={textInput}
          required
          aria-describedby="g-tags-help"
          value={form.tags}
          onChange={(e) => set({ tags: e.target.value })}
        />
        <p id="g-tags-help" className="mt-1 text-caption text-muted">
          1-5 tags, separated by commas. Tags that match your members&apos; scan results help the right people find you.
        </p>
        {suggestions.length > 0 && (
          <div role="group" aria-label="Suggested tags" className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                disabled={chosen.includes(t.toLowerCase())}
                onClick={() => addTag(t)}
                className="min-h-11 rounded-pill border-2 border-brown-950 bg-transparent px-4 py-1 text-small font-bold text-brown-950 hover:bg-sand-300 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label htmlFor="g-looking">Roles you&apos;re looking for (optional)</label>
        <input
          id="g-looking"
          className={textInput}
          aria-describedby="g-looking-help"
          value={form.lookingFor}
          onChange={(e) => set({ lookingFor: e.target.value })}
        />
        <p id="g-looking-help" className="mt-1 text-caption text-muted">
          Up to 3, separated by commas.
        </p>
      </div>
      <div>
        <label htmlFor="g-max">Max members</label>
        <input
          id="g-max"
          type="number"
          inputMode="numeric"
          className={textInput}
          required
          min={2}
          max={50}
          step={1}
          value={form.maxMembers}
          onChange={(e) => set({ maxMembers: e.target.value })}
        />
      </div>

      <div aria-live="polite">
        {error && <ErrorTile title="Couldn't create the guild">{error.message}</ErrorTile>}
      </div>
      <div>
        <button type="submit" className={primaryButton} disabled={pending}>
          {pending ? "Creating…" : "Create guild"}
        </button>
      </div>
    </form>
  );
}
