import { fail, ok } from "@/lib/api";
import { getOne, putOne } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/seed";
import { ScanResultSchema } from "@/features/scan/schema";
import type { User } from "@/lib/types";

export async function GET() {
  try {
    const user = await getOne<User>("users", CURRENT_USER_ID);
    return ok(user?.scan ?? null);
  } catch {
    return fail("internal", "Couldn't load your scan.", 500);
  }
}

export async function PUT(req: Request) {
  const parsed = ScanResultSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_input", "The scan result format is invalid.", 400);
  try {
    const user = await getOne<User>("users", CURRENT_USER_ID);
    if (!user) return fail("not_found", "Current user not found.", 404);
    await putOne("users", { ...user, scan: parsed.data });
    return ok(parsed.data);
  } catch {
    return fail("internal", "Couldn't save your scan.", 500);
  }
}
