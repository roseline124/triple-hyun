import { timingSafeEqual } from "node:crypto";
import { fail, ok } from "@/lib/api";
import { resetSeededStores } from "@/lib/db";

function tokenMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 시연 데이터 초기화. 서버 env RESET_TOKEN 이 없으면 항상 거부한다. */
export async function POST(req: Request) {
  if (!tokenMatches(req.headers.get("x-reset-token"), process.env.RESET_TOKEN)) {
    return fail("unauthorized", "Reset token is missing or wrong.", 401);
  }
  try {
    await resetSeededStores();
    return ok({ reset: true });
  } catch (e) {
    console.error(e);
    return fail("internal", "Couldn't reset the demo data.", 500);
  }
}
