import { fail, failFrom, ok } from "@/lib/api";
import { CURRENT_USER_ID } from "@/lib/seed";
import { charge } from "@/features/wallet/ledger";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { amount?: unknown } | null;
  if (typeof body?.amount !== "number") {
    return fail("invalid_input", "Enter a whole dollar amount greater than zero.", 400);
  }
  try {
    return ok(await charge(CURRENT_USER_ID, body.amount));
  } catch (e) {
    return failFrom(e, "Couldn't add credits.");
  }
}
