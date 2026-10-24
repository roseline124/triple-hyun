import { guildRoute } from "@/features/guild/http";
import { joinGuild } from "@/features/guild/server";
import { CredentialsSchema } from "@/features/scan/schema";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return guildRoute(req, CredentialsSchema, (credentials) => joinGuild(credentials, id));
}
