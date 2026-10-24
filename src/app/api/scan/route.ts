import { fail, ok } from "@/lib/api";
import { getAll } from "@/lib/db";
import type { Guild, Quest } from "@/lib/types";
import { credentialFailure, MISSING_KEY, scanFailure } from "@/features/scan/http";
import { collectTagVocabulary } from "@/features/scan/match";
import { ensureProfile, ProfileError, saveScanResult } from "@/features/scan/profile";
import { ScanInputSchema } from "@/features/scan/schema";
import { ScanError, createAnthropicClient, runScan } from "@/features/scan/service";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return MISSING_KEY();
  const parsed = ScanInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  const { nickname, pin, background, interests, answers } = parsed.data;
  try {
    // AI 호출 전에 자격부터 확인한다. 틀린 PIN으로 크레딧을 쓰지 않는다.
    const profile = await ensureProfile({ nickname, pin });
    const [guilds, quests] = await Promise.all([getAll<Guild>("guilds"), getAll<Quest>("quests")]);
    const scan = await runScan(
      { background, interests, answers },
      createAnthropicClient(),
      collectTagVocabulary(guilds, quests),
    );
    await saveScanResult(profile, scan, { background, interests: interests ?? "", answers });
    return ok(scan);
  } catch (e) {
    if (e instanceof ProfileError) {
      return credentialFailure(e, "That nickname is taken and the PIN doesn't match. Pick another nickname or enter the original PIN.");
    }
    if (e instanceof ScanError) return scanFailure(e);
    return fail("internal", "Couldn't save your results. Try again.", 500);
  }
}
