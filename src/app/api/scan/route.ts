import { fail, ok } from "@/lib/api";
import { ScanInputSchema } from "@/features/scan/schema";
import { ScanError, createAnthropicClient, runScan } from "@/features/scan/service";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("missing_api_key", "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.", 503);
  }
  const body = await req.json().catch(() => null);
  const parsed = ScanInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "입력이 올바르지 않습니다.", 400);
  }
  try {
    const result = await runScan(parsed.data, createAnthropicClient());
    return ok(result);
  } catch (e) {
    if (e instanceof ScanError) return fail(e.code, e.message, e.code === "timeout" ? 504 : 502);
    return fail("internal", "알 수 없는 오류가 발생했습니다.", 500);
  }
}
