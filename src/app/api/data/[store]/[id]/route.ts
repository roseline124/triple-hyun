import { fail, ok } from "@/lib/api";
import { getOne } from "@/lib/db";
import { isReadableStore } from "@/lib/remote";

export async function GET(_req: Request, ctx: { params: Promise<{ store: string; id: string }> }) {
  const { store, id } = await ctx.params;
  if (!isReadableStore(store)) return fail("not_found", "Unknown resource.", 404);
  try {
    const row = await getOne(store, id);
    return row ? ok(row) : fail("not_found", "Not found.", 404);
  } catch {
    return fail("internal", "Couldn't load the data.", 500);
  }
}
