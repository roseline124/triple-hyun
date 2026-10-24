import { fail, ok } from "@/lib/api";
import { ScanInputSchema } from "@/features/scan/schema";
import { ScanError, createAnthropicClient, runScan } from "@/features/scan/service";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("missing_api_key", "ANTHROPIC_API_KEY is not configured on the server.", 503);
  }
  const body = await req.json().catch(() => null);
  const parsed = ScanInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  try {
    const result = await runScan(parsed.data, createAnthropicClient());
    return ok(result);
  } catch (e) {
    if (e instanceof ScanError) return fail(e.code, e.message, e.code === "timeout" ? 504 : 502);
    return fail("internal", "An unexpected error occurred.", 500);
  }
}
