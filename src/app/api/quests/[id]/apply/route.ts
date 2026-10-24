import { failFrom, ok } from "@/lib/api";
import { CURRENT_USER_ID } from "@/lib/seed";
import { applyToQuest } from "@/features/quest/actions";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    return ok(await applyToQuest(id, CURRENT_USER_ID));
  } catch (e) {
    return failFrom(e, "Couldn't apply to this quest.");
  }
}
