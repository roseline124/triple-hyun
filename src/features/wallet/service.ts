import { apiFetch, type ApiResult } from "@/lib/api";
import { remoteGetOne } from "@/lib/remote";
import { CURRENT_USER_ID } from "@/lib/seed";
import type { Wallet, WalletTx } from "@/lib/types";

// 브라우저용. 쓰기와 잔액 검사는 서버(features/wallet/ledger.ts)에서 한다.
// 길드 가입(A)의 가입비 차감은 서버에서 ledger 의 debit(tx, userId, amount, "guild_fee", guildId)를 쓴다.
export const getMyWallet = () => remoteGetOne<Wallet>("wallets", CURRENT_USER_ID);

export async function listMyTransactions(): Promise<WalletTx[]> {
  const res = await apiFetch<WalletTx[]>("/api/me/transactions", { cache: "no-store" });
  if (!res.ok) throw new Error(res.error.message);
  return res.data;
}

/** 더미 충전. 실패해도 throw 하지 않고 화면이 error.message 를 보여주도록 결과를 그대로 돌려준다. */
export const chargeWallet = (amount: number): Promise<ApiResult<Wallet>> =>
  apiFetch<Wallet>("/api/me/wallet/charge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
