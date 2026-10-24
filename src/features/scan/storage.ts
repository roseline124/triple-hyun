import { apiFetch } from "@/lib/api";
import type { ScanResult } from "@/lib/types";

/** 검사 결과를 현재 유저에 저장한다(서버 DB). 브라우저에서 호출한다. */
export async function saveScan(scan: ScanResult): Promise<void> {
  const res = await apiFetch<ScanResult>("/api/me/scan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scan),
  });
  if (!res.ok) throw new Error(res.error.message);
}

export async function getMyScan(): Promise<ScanResult | null> {
  const res = await apiFetch<ScanResult | null>("/api/me/scan", { cache: "no-store" });
  if (!res.ok) throw new Error(res.error.message);
  return res.data;
}
