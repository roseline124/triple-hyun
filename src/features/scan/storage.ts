import { getOne, putOne } from "@/lib/db";
import { CURRENT_USER_ID } from "@/lib/seed";
import type { ScanResult, User } from "@/lib/types";

/** 검사 결과를 현재 유저에 저장한다. 서버가 아니라 브라우저에서 호출한다. */
export async function saveScan(scan: ScanResult): Promise<void> {
  const user = await getOne<User>("users", CURRENT_USER_ID);
  if (!user) throw new Error("current user not found");
  await putOne("users", { ...user, scan });
}

export async function getMyScan(): Promise<ScanResult | null> {
  return (await getOne<User>("users", CURRENT_USER_ID))?.scan ?? null;
}
