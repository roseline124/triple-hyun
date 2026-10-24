"use client";

import { Loadable } from "@/components/Loadable";
import { getMyWallet } from "@/features/wallet/service";
import { formatUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export default function WalletPage() {
  const state = useAsync(getMyWallet);
  return (
    <>
      <h1>Wallet</h1>
      <Loadable state={state} isEmpty={(w) => !w} empty="Wallet not found.">
        {(wallet) =>
          wallet && (
            <p>
              Balance: <strong>{formatUsd(wallet.balance)}</strong>
            </p>
          )
        }
      </Loadable>
      <p className="banner">Top-ups will be a test payment. (Owner: B)</p>
    </>
  );
}
