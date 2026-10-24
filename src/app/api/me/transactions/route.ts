import { failFrom, ok } from "@/lib/api";
import { CURRENT_USER_ID } from "@/lib/seed";
import { listTransactions } from "@/features/wallet/ledger";

export async function GET() {
  try {
    return ok(await listTransactions(CURRENT_USER_ID));
  } catch (e) {
    return failFrom(e, "Couldn't load your transactions.");
  }
}
