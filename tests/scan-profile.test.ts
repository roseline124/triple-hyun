import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getOne } from "@/lib/db";
import {
  LOCK_MS,
  MAX_FAILED_ATTEMPTS,
  ProfileError,
  checkCredentials,
  cleanNickname,
  ensureProfile,
  lookupProfile,
  normalizeNickname,
  saveScanResult,
  type Profile,
} from "@/features/scan/profile";
import type { ScanResult } from "@/lib/types";

const t0 = new Date("2026-10-24T10:00:00Z");
const maya = { nickname: "Maya", pin: "1234" };

const scan: ScanResult = {
  archetype: "Documentation Alchemist",
  summary: "s",
  skills: [1, 2, 3].map((n) => ({ name: `s${n}`, score: 50, evidence: "two words", source: "resume" as const })),
  secondJobs: [
    { title: "a", reason: "r" },
    { title: "b", reason: "r" },
  ],
  tags: ["Technical writing"],
};
const scanInput = { background: "b".repeat(60), interests: "", answers: [] };

const stored = (id: string) => getOne<Profile>("profiles", id);
const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e) => (e instanceof ProfileError ? e.code : "other"),
  );

beforeEach(async () => {
  await closeDb();
  process.env.TURSO_DATABASE_URL = "file::memory:";
});
afterEach(closeDb);

describe("nickname normalization", () => {
  it("treats case and repeated whitespace as the same nickname but keeps the display form", () => {
    expect(normalizeNickname("  Maya   Kim ")).toBe("maya kim");
    expect(cleanNickname("  Maya   Kim ")).toBe("Maya Kim");
  });
});

describe("ensureProfile", () => {
  it("creates a profile with a salted hash and never stores the PIN", async () => {
    const p = await ensureProfile(maya, t0);
    const row = await stored("maya");
    expect(row).toMatchObject({ id: "maya", nickname: "Maya", scan: null, scanInput: null, failedAttempts: 0, lockedUntil: null });
    expect(row?.pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(`"1234"`);
    expect(p.pinHash).toBe(row?.pinHash);
  });

  it("uses a different salt and hash for each profile even with the same PIN", async () => {
    await ensureProfile(maya, t0);
    await ensureProfile({ nickname: "Jordan", pin: "1234" }, t0);
    const [a, b] = await Promise.all([stored("maya"), stored("jordan")]);
    expect(a?.pinSalt).not.toBe(b?.pinSalt);
    expect(a?.pinHash).not.toBe(b?.pinHash);
  });

  it("returns the existing profile for the right PIN, in any letter case", async () => {
    const first = await ensureProfile(maya, t0);
    const again = await ensureProfile({ nickname: "  MAYA ", pin: "1234" }, new Date(t0.getTime() + 1000));
    expect(again.id).toBe(first.id);
    expect(again.createdAt).toBe(first.createdAt);
  });

  it("rejects a taken nickname with the wrong PIN and leaves the profile untouched", async () => {
    await ensureProfile(maya, t0);
    await saveScanResult((await stored("maya")) as Profile, scan, scanInput, t0);
    expect(await code(ensureProfile({ nickname: "maya", pin: "9999" }, t0))).toBe("invalid_credentials");
    expect((await stored("maya"))?.scan).toEqual(scan);
  });

  it("lets only one of two simultaneous creators win the nickname", async () => {
    const results = await Promise.allSettled([
      ensureProfile({ nickname: "race", pin: "1111" }, t0),
      ensureProfile({ nickname: "race", pin: "2222" }, t0),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toBeInstanceOf(ProfileError);
    expect(loser.reason.code).toBe("invalid_credentials");
  });
});

describe("checkCredentials", () => {
  it("returns null for an unknown nickname without creating anything", async () => {
    expect(await checkCredentials(maya, t0)).toBeNull();
    expect(await stored("maya")).toBeUndefined();
  });

  it("counts wrong PINs and clears the count after a correct one", async () => {
    await ensureProfile(maya, t0);
    expect(await code(checkCredentials({ ...maya, pin: "0000" }, t0))).toBe("invalid_credentials");
    expect(await code(checkCredentials({ ...maya, pin: "0000" }, t0))).toBe("invalid_credentials");
    expect((await stored("maya"))?.failedAttempts).toBe(2);
    await checkCredentials(maya, t0);
    expect((await stored("maya"))?.failedAttempts).toBe(0);
  });

  it(`locks after ${MAX_FAILED_ATTEMPTS} wrong PINs, rejects even the right PIN while locked, and unlocks later`, async () => {
    await ensureProfile(maya, t0);
    const wrong = { ...maya, pin: "0000" };
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      expect(await code(checkCredentials(wrong, t0))).toBe("invalid_credentials");
    }
    expect(await code(checkCredentials(wrong, t0))).toBe("locked");

    const during = new Date(t0.getTime() + LOCK_MS - 1000);
    expect(await code(checkCredentials(maya, during))).toBe("locked");
    expect(await code(checkCredentials(wrong, during))).toBe("locked");

    const after = new Date(t0.getTime() + LOCK_MS + 1000);
    expect((await checkCredentials(maya, after))?.id).toBe("maya");
    expect(await stored("maya")).toMatchObject({ failedAttempts: 0, lockedUntil: null });
  });

  it("starts counting from zero again after a lock expires", async () => {
    await ensureProfile(maya, t0);
    const wrong = { ...maya, pin: "0000" };
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) await code(checkCredentials(wrong, t0));
    const after = new Date(t0.getTime() + LOCK_MS + 1000);
    expect(await code(checkCredentials(wrong, after))).toBe("invalid_credentials");
    expect((await stored("maya"))?.failedAttempts).toBe(1);
  });
});

describe("saveScanResult and lookupProfile", () => {
  it("stores the scan and the original input and returns them for the right credentials", async () => {
    const p = await ensureProfile(maya, t0);
    await saveScanResult(p, scan, scanInput, new Date(t0.getTime() + 5000));
    const view = await lookupProfile(maya, t0);
    expect(view).toEqual({
      nickname: "Maya",
      scan,
      scanInput,
      updatedAt: new Date(t0.getTime() + 5000).toISOString(),
    });
  });

  it("never includes the PIN hash, salt, or lock fields in the lookup view", async () => {
    await ensureProfile(maya, t0);
    const view = await lookupProfile(maya, t0);
    expect(Object.keys(view).sort()).toEqual(["nickname", "scan", "scanInput", "updatedAt"]);
  });

  it("returns scan null for a profile that has not finished a scan", async () => {
    await ensureProfile(maya, t0);
    expect((await lookupProfile(maya, t0)).scan).toBeNull();
  });

  it("does not tell an unknown nickname apart from a wrong PIN", async () => {
    await ensureProfile(maya, t0);
    const unknown = await lookupProfile({ nickname: "nobody", pin: "1234" }, t0).catch((e) => e);
    const wrong = await lookupProfile({ ...maya, pin: "0000" }, t0).catch((e) => e);
    expect(unknown.code).toBe("invalid_credentials");
    expect(wrong.code).toBe("invalid_credentials");
    expect(unknown.message).toBe(wrong.message);
  });

  it("replaces the previous result when the same profile scans again", async () => {
    const p = await ensureProfile(maya, t0);
    await saveScanResult(p, scan, scanInput, t0);
    const next = { ...scan, archetype: "Support Strategist" };
    await saveScanResult((await ensureProfile(maya, t0)) as Profile, next, scanInput, t0);
    expect((await lookupProfile(maya, t0)).scan?.archetype).toBe("Support Strategist");
  });

  it("keeps each profile's data separate", async () => {
    const a = await ensureProfile(maya, t0);
    const b = await ensureProfile({ nickname: "Jordan", pin: "4321" }, t0);
    await saveScanResult(a, scan, scanInput, t0);
    expect((await lookupProfile({ nickname: "Jordan", pin: "4321" }, t0)).scan).toBeNull();
    expect(b.id).not.toBe(a.id);
  });
});
