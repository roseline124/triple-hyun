import type { Transaction } from "@libsql/client";
import { ApiFailure } from "@/lib/api";
import { getAll, txGetOne, txPutOne, withTransaction } from "@/lib/db";
import type { Wallet, WalletTx, WalletTxType } from "@/lib/types";

/**
 * 서버 전용 지갑 원장. route handler 에서만 import 한다.
 * debit/credit 은 호출자의 트랜잭션(withTransaction 의 tx) 안에서 실행해야
 * 잔액 검사와 다른 store 변경이 한 번에 커밋되거나 함께 롤백된다.
 */

/** 더미 충전 1회 상한(크레딧 = USD) */
export const MAX_CHARGE = 1000;

function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiFailure("invalid_input", "Enter a whole dollar amount greater than zero.", 400);
  }
}

export async function getWalletIn(tx: Transaction, userId: string): Promise<Wallet> {
  const wallet = await txGetOne<Wallet>(tx, "wallets", userId);
  if (!wallet) throw new ApiFailure("not_found", "Wallet not found.", 404);
  return wallet;
}

async function apply(
  tx: Transaction,
  userId: string,
  delta: number,
  type: WalletTxType,
  ref?: string,
): Promise<Wallet> {
  const wallet = await getWalletIn(tx, userId);
  if (wallet.balance + delta < 0) {
    throw new ApiFailure("insufficient_funds", "You don't have enough credits. Add credits and try again.", 402);
  }
  const next: Wallet = { ...wallet, balance: wallet.balance + delta };
  const entry: WalletTx = {
    id: `tx-${crypto.randomUUID()}`,
    userId,
    type,
    amount: delta,
    createdAt: new Date().toISOString(),
    ...(ref ? { ref } : {}),
  };
  await txPutOne(tx, "wallets", next);
  await txPutOne(tx, "txs", entry);
  return next;
}

/** 잔액에서 amount 를 빼고 음수 거래로 기록한다. 잔액이 모자라면 insufficient_funds(402). */
export async function debit(
  tx: Transaction,
  userId: string,
  amount: number,
  type: WalletTxType,
  ref?: string,
): Promise<Wallet> {
  assertAmount(amount);
  return apply(tx, userId, -amount, type, ref);
}

/** 잔액에 amount 를 더하고 양수 거래로 기록한다. */
export async function credit(
  tx: Transaction,
  userId: string,
  amount: number,
  type: WalletTxType,
  ref?: string,
): Promise<Wallet> {
  assertAmount(amount);
  return apply(tx, userId, amount, type, ref);
}

/** 더미 충전. 실제 결제는 일어나지 않는다. */
export async function charge(userId: string, amount: number): Promise<Wallet> {
  assertAmount(amount);
  if (amount > MAX_CHARGE) {
    throw new ApiFailure("invalid_input", `You can add up to $${MAX_CHARGE} at a time.`, 400);
  }
  return withTransaction((tx) => credit(tx, userId, amount, "charge"));
}

/** 유저의 거래 내역, 최신순. */
export async function listTransactions(userId: string): Promise<WalletTx[]> {
  const all = await getAll<WalletTx>("txs");
  return all.filter((t) => t.userId === userId).toReversed();
}
