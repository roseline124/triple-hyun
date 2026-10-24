import { fail, ok } from "@/lib/api";
import { pingDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDb();
    return ok({ status: "ok" });
  } catch (e) {
    console.error(e);
    return fail("unavailable", "Database is unavailable.", 503);
  }
}
