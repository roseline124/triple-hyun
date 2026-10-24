import { fail } from "@/lib/api";
import { ProfileError } from "./profile";
import { ScanError } from "./service";

/** 자격 오류를 응답으로 바꾼다. `mismatchMessage` 는 화면별 문구(닉네임 충돌 vs 조회 실패). */
export function credentialFailure(e: ProfileError, mismatchMessage: string): Response {
  return e.code === "locked"
    ? fail("locked", e.message, 429)
    : fail("invalid_credentials", mismatchMessage, 401);
}

const SCAN_STATUS = { timeout: 504, ungrounded: 422, refusal: 502, empty_output: 502, upstream: 502 } as const;

export function scanFailure(e: ScanError): Response {
  return fail(e.code, e.message, SCAN_STATUS[e.code]);
}

export const MISSING_KEY = () =>
  fail("missing_api_key", "ANTHROPIC_API_KEY is not configured on the server.", 503);
