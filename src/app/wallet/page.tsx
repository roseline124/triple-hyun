"use client";

import { Loadable } from "@/components/Loadable";
import { getMyWallet } from "@/features/wallet/service";
import { useAsync } from "@/lib/useAsync";

export default function WalletPage() {
  const state = useAsync(getMyWallet);
  return (
    <>
      <h1>지갑</h1>
      <Loadable state={state} isEmpty={(w) => !w} empty="지갑을 찾을 수 없습니다.">
        {(wallet) =>
          wallet && (
            <p>
              잔액: <strong>{wallet.balance.toLocaleString()}</strong> 크레딧
            </p>
          )
        }
      </Loadable>
      <p className="banner">충전은 더미(테스트 결제)로 구현 예정입니다. (담당 B)</p>
    </>
  );
}
