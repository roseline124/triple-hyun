import Link from "next/link";
import { recruitStatus, type RecruitStatus } from "@/features/guild/rules";
import { formatUsd } from "@/lib/format";
import type { Guild } from "@/lib/types";

const BADGE: Record<RecruitStatus, { label: string; className: string }> = {
  recruiting: { label: "Recruiting", className: "bg-success-soft text-success" },
  full: { label: "Full", className: "bg-sand-300 text-brown-950" },
  closed: { label: "Closed", className: "bg-sand-300 text-brown-950" },
};

/** 색만으로 구분하지 않도록 텍스트를 항상 함께 쓴다. */
export function StatusBadge({ guild }: { guild: Guild }) {
  const { label, className } = BADGE[recruitStatus(guild)];
  return <span className={`rounded-pill px-3 py-1 text-caption font-bold ${className}`}>{label}</span>;
}

export const memberCount = (g: Guild) => `${g.memberIds.length} / ${g.maxMembers} members`;

export function GuildCard({ guild }: { guild: Guild }) {
  return (
    <li className="rounded-tile bg-sand-100 p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="m-0 text-h3 font-bold">
          <Link href={`/guilds/${guild.id}`}>{guild.name}</Link>
        </h2>
        <StatusBadge guild={guild} />
      </div>
      <p className="mt-2 mb-0">{guild.description}</p>
      <ul className="mt-3 mb-0 flex flex-wrap gap-x-4 gap-y-1 p-0 text-small text-muted" style={{ listStyle: "none" }}>
        <li>{guild.region}</li>
        <li>{memberCount(guild)}</li>
        <li>Join fee {formatUsd(guild.joinFee)}</li>
      </ul>
      {guild.lookingFor.length > 0 && (
        <p className="mt-2 mb-0 text-small">
          <strong>Looking for:</strong> {guild.lookingFor.join(", ")}
        </p>
      )}
      {guild.tags.length > 0 && (
        <ul aria-label="Guild tags" className="mt-3 mb-0 flex list-none flex-wrap gap-2 p-0">
          {guild.tags.map((t) => (
            <li key={t} className="rounded-pill bg-sand-300 px-3 py-1 text-caption font-bold text-brown-950">
              {t}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
