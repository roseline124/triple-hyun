import { remoteGetOne } from "@/lib/remote";
import { CURRENT_USER_ID } from "@/lib/seed";
import type { Wallet } from "@/lib/types";

// TODO(B): 더미 충전(charge), 차감(debit), 지급(credit) + 거래 내역 기록.
// 길드 가입(A)과 작업 완료(B)가 이 모듈을 호출한다. 시그니처는 둘이 먼저 합의할 것.
export const getMyWallet = () => remoteGetOne<Wallet>("wallets", CURRENT_USER_ID);
