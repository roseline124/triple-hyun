import { guildRoute } from "@/features/guild/http";
import { CreateGuildSchema } from "@/features/guild/schema";
import { createGuild } from "@/features/guild/server";

export const POST = (req: Request) => guildRoute(req, CreateGuildSchema, (input) => createGuild(input), 201);
