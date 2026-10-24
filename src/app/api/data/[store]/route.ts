import { fail, ok } from "@/lib/api";
import { getAll } from "@/lib/db";
import { isReadableStore } from "@/lib/remote";

export async function GET(_req: Request, ctx: { params: Promise<{ store: string }> }) {
  const { store } = await ctx.params;
  if (!isReadableStore(store)) return fail("not_found", "Unknown resource.", 404);
  try {
    return ok(await getAll(store));
  } catch {
    return fail("internal", "Couldn't load the data.", 500);
  }
}
