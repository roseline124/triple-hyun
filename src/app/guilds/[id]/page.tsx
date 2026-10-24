"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Loadable } from "@/components/Loadable";
import { getGuild } from "@/features/guild/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export default function GuildPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(useCallback(() => getGuild(id), [id]));
  return (
    <Loadable state={state} isEmpty={(g) => !g} empty="Guild not found.">
      {(guild) =>
        guild && (
          <>
            <h1>{guild.name}</h1>
            <p>{guild.description}</p>
            <p className="muted">
              {guild.region} · {guild.memberIds.length} {guild.memberIds.length === 1 ? "member" : "members"} · Join
              fee {formatUsd(guild.joinFee)}
            </p>
            <p className="banner">Joining isn&apos;t available yet. (Owner: A)</p>
          </>
        )
      }
    </Loadable>
  );
}
