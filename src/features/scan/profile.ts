import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { getDb, getOne, putOne } from "@/lib/db";
import type { ScanResult } from "@/lib/types";
import type { Credentials, ProfileView, ScanInputRecord } from "./schema";

/**
 * 닉네임 + 4자리 PIN 프로필(서버 전용). 로그인·세션이 아니라 요청마다 자격을 검증한다.
 * 클라이언트 코드에서 import 하지 않는다(node:crypto, DB).
 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export type Profile = {
  /** 정규화한 닉네임. 스토어 키 */
  id: string;
  /** 표시용 닉네임 */
  nickname: string;
  pinHash: string;
  pinSalt: string;
  failedAttempts: number;
  lockedUntil: string | null;
  scan: ScanResult | null;
  /** 사용자가 고른 태그. 이 필드가 없던 프로필은 undefined 다. 재검사하면 null 로 돌아간다. */
  curatedTags?: string[] | null;
  scanInput: ScanInputRecord | null;
  createdAt: string;
  updatedAt: string;
};

export class ProfileError extends Error {
  constructor(readonly code: "invalid_credentials" | "locked") {
    super(code === "locked" ? "Too many attempts. Try again in 15 minutes." : "Nickname or PIN doesn't match.");
  }
}

export const cleanNickname = (nickname: string) => nickname.trim().replace(/\s+/g, " ");
export const normalizeNickname = (nickname: string) => cleanNickname(nickname).toLowerCase();

function hashPin(pin: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, 32, (err, key) => (err ? reject(err) : resolve(key.toString("hex")))),
  );
}

async function pinMatches(profile: Profile, pin: string): Promise<boolean> {
  const actual = Buffer.from(await hashPin(pin, profile.pinSalt), "hex");
  const expected = Buffer.from(profile.pinHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * 프로필이 없으면 null. 있으면 잠금·PIN을 검증해 반환하고, 틀리면 실패 횟수를 올린다.
 * 잠금 중에는 맞는 PIN도 거부한다.
 */
export async function checkCredentials(
  { nickname, pin }: Credentials,
  now: Date = new Date(),
): Promise<Profile | null> {
  const profile = await getOne<Profile>("profiles", normalizeNickname(nickname));
  if (!profile) return null;

  const locked = profile.lockedUntil !== null && new Date(profile.lockedUntil) > now;
  if (locked) throw new ProfileError("locked");

  if (!(await pinMatches(profile, pin))) {
    const failedAttempts = profile.failedAttempts + 1;
    const lockNow = failedAttempts >= MAX_FAILED_ATTEMPTS;
    await putOne("profiles", {
      ...profile,
      failedAttempts: lockNow ? 0 : failedAttempts,
      lockedUntil: lockNow ? new Date(now.getTime() + LOCK_MS).toISOString() : null,
    });
    throw new ProfileError(lockNow ? "locked" : "invalid_credentials");
  }

  if (profile.failedAttempts > 0 || profile.lockedUntil !== null) {
    const cleared = { ...profile, failedAttempts: 0, lockedUntil: null };
    await putOne("profiles", cleared);
    return cleared;
  }
  return profile;
}

/** 검사 시작용. 없는 닉네임이면 새로 만들고, 있으면 PIN을 검증한다. */
export async function ensureProfile(credentials: Credentials, now: Date = new Date()): Promise<Profile> {
  const existing = await checkCredentials(credentials, now);
  if (existing) return existing;

  const pinSalt = randomBytes(16).toString("hex");
  const stamp = now.toISOString();
  const profile: Profile = {
    id: normalizeNickname(credentials.nickname),
    nickname: cleanNickname(credentials.nickname),
    pinHash: await hashPin(credentials.pin, pinSalt),
    pinSalt,
    failedAttempts: 0,
    lockedUntil: null,
    scan: null,
    curatedTags: null,
    scanInput: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const db = await getDb();
  const res = await db.execute({
    sql: "INSERT OR IGNORE INTO profiles (id, data) VALUES (?, ?)",
    args: [profile.id, JSON.stringify(profile)],
  });
  if (res.rowsAffected > 0) return profile;

  // 동시에 같은 닉네임이 만들어졌다. 먼저 만든 쪽의 PIN으로 다시 검증한다.
  const winner = await checkCredentials(credentials, now);
  if (!winner) throw new ProfileError("invalid_credentials");
  return winner;
}

export async function saveScanResult(
  profile: Profile,
  scan: ScanResult,
  scanInput: ScanInputRecord,
  now: Date = new Date(),
): Promise<void> {
  await putOne("profiles", { ...profile, scan, scanInput, curatedTags: null, updatedAt: now.toISOString() });
}

/** 고른 태그를 저장한다. 허용 목록 검증은 호출하는 쪽(route)이 끝낸 값을 받는다. */
export async function saveCuratedTags(profile: Profile, tags: string[], now: Date = new Date()): Promise<void> {
  await putOne("profiles", { ...profile, curatedTags: tags, updatedAt: now.toISOString() });
}

/** 조회용. 없는 닉네임과 틀린 PIN을 구분하지 않는다. */
export async function lookupProfile(credentials: Credentials, now: Date = new Date()): Promise<ProfileView> {
  const profile = await checkCredentials(credentials, now);
  if (!profile) throw new ProfileError("invalid_credentials");
  return {
    nickname: profile.nickname,
    scan: profile.scan,
    curatedTags: profile.curatedTags ?? null,
    scanInput: profile.scanInput,
    updatedAt: profile.updatedAt,
  };
}
