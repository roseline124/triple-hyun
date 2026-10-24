import { fail, ok } from "@/lib/api";
import { getAll } from "@/lib/db";
import type { Guild, Quest } from "@/lib/types";
import { allowedTags, canonicalizeTags } from "@/features/scan/curate";
import { credentialFailure } from "@/features/scan/http";
import { checkCredentials, ProfileError, saveCuratedTags } from "@/features/scan/profile";
import { TagsInputSchema } from "@/features/scan/schema";

export async function POST(req: Request) {
  const parsed = TagsInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  const { nickname, pin, tags } = parsed.data;
  try {
    const profile = await checkCredentials({ nickname, pin });
    if (!profile) return fail("invalid_credentials", "Nickname or PIN doesn't match.", 401);
    if (!profile.scan) return fail("no_scan", "Finish a scan before choosing tags.", 409);

    const [guilds, quests] = await Promise.all([getAll<Guild>("guilds"), getAll<Quest>("quests")]);
    const canonical = canonicalizeTags(tags, allowedTags(profile.scan.tags, guilds, quests));
    if (!canonical) return fail("invalid_input", "Pick tags from your results or the suggestions.", 400);

    await saveCuratedTags(profile, canonical);
    return ok({ tags: canonical });
  } catch (e) {
    if (e instanceof ProfileError) return credentialFailure(e, e.message);
    console.error(e);
    return fail("internal", "Couldn't save your tags. Try again.", 500);
  }
}
