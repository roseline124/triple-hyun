"use client";

import Link from "next/link";
import { Loadable } from "@/components/Loadable";
import { listGuilds } from "@/features/guild/service";
import { useAsync } from "@/lib/useAsync";
import { primaryButton } from "@/app/scan/ui";
import { GuildList } from "./GuildList";

export default function GuildsPage() {
  const state = useAsync(listGuilds);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1>Guilds</h1>
        <Link href="/guilds/new" className={`${primaryButton} inline-block no-underline`}>
          Create a guild
        </Link>
      </div>
      <Loadable state={state} isEmpty={() => false} empty={null}>
        {(guilds) => <GuildList guilds={guilds} />}
      </Loadable>
    </>
  );
}
