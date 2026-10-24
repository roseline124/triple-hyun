"use client";

import Link from "next/link";
import { Loadable } from "@/components/Loadable";
import { listGuilds } from "@/features/guild/service";
import { useAsync } from "@/lib/useAsync";

export default function GuildsPage() {
  const state = useAsync(listGuilds);
  return (
    <>
      <h1>길드</h1>
      <Loadable state={state} isEmpty={(g) => g.length === 0} empty="아직 길드가 없습니다.">
        {(guilds) => (
          <ul className="cards">
            {guilds.map((g) => (
              <li key={g.id}>
                <Link href={`/guilds/${g.id}`}>
                  <strong>{g.name}</strong>
                </Link>
                <div className="muted">
                  {g.region} · 멤버 {g.memberIds.length}명 · 가입비 {g.joinFee.toLocaleString()}
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
