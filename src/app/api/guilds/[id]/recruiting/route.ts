import { guildRoute } from "@/features/guild/http";
import { SetRecruitingSchema } from "@/features/guild/schema";
import { setRecruiting } from "@/features/guild/server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return guildRoute(req, SetRecruitingSchema, ({ nickname, pin, recruiting }) =>
    setRecruiting({ nickname, pin }, id, recruiting),
  );
}
