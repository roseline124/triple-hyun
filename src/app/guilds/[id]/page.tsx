"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Loadable } from "@/components/Loadable";
import { getGuild } from "@/features/guild/service";
import { useAsync } from "@/lib/useAsync";
import { GuildDetail } from "./GuildDetail";

export default function GuildPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(useCallback(() => getGuild(id), [id]));
  return (
    <Loadable
      state={state}
      isEmpty={(g) => !g}
      empty={
        <>
          Guild not found. <Link href="/guilds" className="underline">Browse all guilds</Link>.
        </>
      }
    >
      {(guild) => guild && <GuildDetail initial={guild} />}
    </Loadable>
  );
}
