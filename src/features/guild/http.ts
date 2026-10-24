import type { z } from "zod";
import { fail, failFrom, ok } from "@/lib/api";
import { credentialFailure } from "@/features/scan/http";
import { ProfileError } from "@/features/scan/profile";
import type { Guild } from "@/lib/types";
import { GuildError, type GuildErrorCode } from "./server";

const STATUS: Record<GuildErrorCode, number> = {
  not_found: 404,
  forbidden: 403,
  already_member: 409,
  closed: 409,
  full: 409,
  name_taken: 409,
  not_member: 409,
  owner_cannot_leave: 409,
};

/** 본문 검증 → 실행 → 오류 매핑을 한곳에서 처리하는 길드 쓰기 라우트 공통부. */
export async function guildRoute<S extends z.ZodType>(
  req: Request,
  schema: S,
  run: (data: z.infer<S>) => Promise<Guild>,
  status = 200,
): Promise<Response> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  try {
    return ok(await run(parsed.data), status);
  } catch (e) {
    if (e instanceof ProfileError) return credentialFailure(e, e.message);
    if (e instanceof GuildError) return fail(e.code, e.message, STATUS[e.code]);
    return failFrom(e, "Something went wrong. Try again.");
  }
}
