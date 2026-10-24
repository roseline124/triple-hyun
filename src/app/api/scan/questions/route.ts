import { fail, ok } from "@/lib/api";
import { credentialFailure, MISSING_KEY, scanFailure } from "@/features/scan/http";
import { checkCredentials, ProfileError } from "@/features/scan/profile";
import { QuestionsInputSchema } from "@/features/scan/schema";
import { ScanError, createAnthropicClient, generateQuestions } from "@/features/scan/service";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return MISSING_KEY();
  const parsed = QuestionsInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  const { nickname, pin, ...content } = parsed.data;
  try {
    // 프로필은 만들지 않고 자격만 확인한다. 질문 3개를 답한 뒤에야 닉네임 충돌을 알게 되는 일을 막는다.
    await checkCredentials({ nickname, pin });
    return ok({ questions: await generateQuestions(content, createAnthropicClient()) });
  } catch (e) {
    if (e instanceof ProfileError) {
      return credentialFailure(e, "That nickname is taken and the PIN doesn't match. Pick another nickname or enter the original PIN.");
    }
    if (e instanceof ScanError) return scanFailure(e);
    return fail("internal", "An unexpected error occurred.", 500);
  }
}
