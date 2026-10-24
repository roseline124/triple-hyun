"use client";

import Link from "next/link";
import { Loadable } from "@/components/Loadable";
import { listGuilds } from "@/features/guild/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export default function GuildsPage() {
  const state = useAsync(listGuilds);
  return (
    <>
      <h1>Guilds</h1>
      <Loadable state={state} isEmpty={(g) => g.length === 0} empty="No guilds yet.">
        {(guilds) => (
          <ul className="cards">
            {guilds.map((g) => (
              <li key={g.id}>
                <Link href={`/guilds/${g.id}`}>
                  <strong>{g.name}</strong>
                </Link>
                <div className="muted">
                  {g.region} · {g.memberIds.length} {g.memberIds.length === 1 ? "member" : "members"} · Join fee{" "}
                  {formatUsd(g.joinFee)}
                </div>
                <div>{g.description}</div>
              </li>
            ))}
          </ul>
        )}
      </Loadable>
    </>
  );
}
