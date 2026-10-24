"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Loadable } from "@/components/Loadable";
import { getGuild } from "@/features/guild/service";
import { useAsync } from "@/lib/useAsync";

export default function GuildPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAsync(useCallback(() => getGuild(id), [id]));
  return (
    <Loadable state={state} isEmpty={(g) => !g} empty="길드를 찾을 수 없습니다.">
      {(guild) =>
        guild && (
          <>
            <h1>{guild.name}</h1>
            <p>{guild.description}</p>
            <p className="muted">
              {guild.region} · 멤버 {guild.memberIds.length}명 · 가입비 {guild.joinFee.toLocaleString()}
            </p>
            <p className="banner">가입 기능은 아직 구현 전입니다. (담당 A)</p>
          </>
        )
      }
    </Loadable>
  );
}
