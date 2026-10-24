"use client";

import { useState } from "react";
import { Loadable } from "@/components/Loadable";
import { chargeWallet, getMyWallet, listMyTransactions } from "@/features/wallet/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import type { Wallet, WalletTx, WalletTxType } from "@/lib/types";

const TOP_UP_AMOUNTS = [10, 50, 100] as const;

const TX_LABEL: Record<WalletTxType, string> = {
  charge: "Added credits",
  guild_fee: "Guild joining fee",
  quest_reward: "Quest reward",
};

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

type View = { wallet: Wallet | undefined; txs: WalletTx[] };

const loadView = async (): Promise<View> => {
  const [wallet, txs] = await Promise.all([getMyWallet(), listMyTransactions()]);
  return { wallet, txs };
};

export default function WalletPage() {
  const state = useAsync(loadView);
  return (
    <>
      <h1>Wallet</h1>
      <Loadable state={state} isEmpty={(v) => !v.wallet} empty="Wallet not found.">
        {(view) => view.wallet && <WalletView initialWallet={view.wallet} initialTxs={view.txs} />}
      </Loadable>
    </>
  );
}

type TopUp =
  | { status: "idle" }
  | { status: "pending"; amount: number }
  | { status: "error"; message: string }
  | { status: "success"; amount: number };

function WalletView({ initialWallet, initialTxs }: { initialWallet: Wallet; initialTxs: WalletTx[] }) {
  const [wallet, setWallet] = useState(initialWallet);
  const [txs, setTxs] = useState(initialTxs);
  const [topUp, setTopUp] = useState<TopUp>({ status: "idle" });

  async function onTopUp(amount: number) {
    setTopUp({ status: "pending", amount });
    const res = await chargeWallet(amount);
    if (!res.ok) {
      setTopUp({ status: "error", message: res.error.message });
      return;
    }
    setWallet(res.data);
    setTopUp({ status: "success", amount });
    // 거래 내역은 서버 기록을 다시 읽는다. 실패하면 이전 목록을 유지한다.
    listMyTransactions().then(setTxs, () => {});
  }

  const pending = topUp.status === "pending";

  return (
    <>
      <section aria-labelledby="balance" className="rounded-tile bg-sand-100 p-6">
        <h2 id="balance" className="m-0 text-body font-bold">
          Balance
        </h2>
        <p className="my-2 font-display text-h1 font-extrabold tabular-nums">{formatUsd(wallet.balance)}</p>
        <p className="m-0 text-small text-muted">Use credits for guild joining fees. Quest rewards land here.</p>
      </section>

      <section aria-labelledby="add-credits">
        <h2 id="add-credits">Add credits</h2>
        <p className="banner">Test mode: no real payment is made, and no card is needed.</p>
        <div className="flex flex-wrap gap-3">
          {TOP_UP_AMOUNTS.map((amount) => (
            <button key={amount} type="button" disabled={pending} onClick={() => onTopUp(amount)}>
              {pending && topUp.amount === amount ? "Adding…" : `Add ${formatUsd(amount)}`}
            </button>
          ))}
        </div>
        <div aria-live="polite">
          {topUp.status === "error" && (
            <p role="alert" className="error">
              {topUp.message}
            </p>
          )}
          {topUp.status === "success" && (
            <p role="status" className="rounded-input border-2 border-success bg-success-soft px-3 py-2">
              You added {formatUsd(topUp.amount)} in credits.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="history">
        <h2 id="history">Transaction history</h2>
        {txs.length === 0 ? (
          <p className="muted">No transactions yet. Add credits or finish a quest to see them here.</p>
        ) : (
          <ul className="cards">
            {txs.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span>
                  <strong>{TX_LABEL[tx.type]}</strong>
                  <span className="block text-small text-muted">{dateTime.format(new Date(tx.createdAt))}</span>
                </span>
                <strong className={`tabular-nums ${tx.amount < 0 ? "text-danger" : "text-success"}`}>
                  {tx.amount < 0 ? "−" : "+"}
                  {formatUsd(Math.abs(tx.amount))}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
