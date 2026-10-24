import { fail, ok } from "@/lib/api";
import { credentialFailure } from "@/features/scan/http";
import { lookupProfile, ProfileError } from "@/features/scan/profile";
import { CredentialsSchema } from "@/features/scan/schema";

export async function POST(req: Request) {
  const parsed = CredentialsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  try {
    return ok(await lookupProfile(parsed.data));
  } catch (e) {
    if (e instanceof ProfileError) return credentialFailure(e, e.message);
    return fail("internal", "Couldn't look up your results. Try again.", 500);
  }
}
