import { failFrom, ok } from "@/lib/api";
import { CURRENT_USER_ID } from "@/lib/seed";
import { completeQuest } from "@/features/quest/actions";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    return ok(await completeQuest(id, CURRENT_USER_ID));
  } catch (e) {
    return failFrom(e, "Couldn't complete this quest.");
  }
}
