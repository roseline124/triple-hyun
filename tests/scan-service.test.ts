import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { ScanInputSchema } from "@/features/scan/schema";
import { ScanError, SCAN_MODEL, runScan } from "@/features/scan/service";
import type { ScanResult } from "@/lib/types";

const input = { background: "10년간 영한 번역가로 일했습니다." };
const result: ScanResult = {
  archetype: "문장 연금술사",
  summary: "번역 경험에서 검수 능력이 보입니다.",
  stats: [
    { name: "언어 감각", score: 90 },
    { name: "꼼꼼함", score: 80 },
    { name: "조사력", score: 60 },
  ],
  secondJobs: [
    { title: "AI 번역 검수자", reason: "번역 경력" },
    { title: "콘텐츠 현지화 PM", reason: "문맥 이해" },
  ],
  questTags: ["번역", "콘텐츠"],
};

function fakeClient(parse: (args: unknown) => Promise<unknown>) {
  const spy = vi.fn(parse);
  return { client: { messages: { parse: spy } } as unknown as Pick<Anthropic, "messages">, spy };
}

describe("runScan", () => {
  it("returns parsed output and calls the configured model", async () => {
    const { client, spy } = fakeClient(async () => ({ stop_reason: "end_turn", parsed_output: result }));
    await expect(runScan(input, client)).resolves.toEqual(result);
    expect(spy.mock.calls[0][0]).toMatchObject({ model: SCAN_MODEL });
  });

  it("maps a refusal to ScanError(refusal)", async () => {
    const { client } = fakeClient(async () => ({ stop_reason: "refusal", parsed_output: null }));
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "refusal" });
  });

  it("maps missing parsed output to ScanError(empty_output)", async () => {
    const { client } = fakeClient(async () => ({ stop_reason: "end_turn", parsed_output: null }));
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "empty_output" });
  });

  it("maps SDK timeouts to ScanError(timeout)", async () => {
    const { client } = fakeClient(async () => {
      throw new Anthropic.APIConnectionTimeoutError();
    });
    await expect(runScan(input, client)).rejects.toMatchObject({ code: "timeout" });
  });

  it("maps other failures to ScanError(upstream) without leaking details", async () => {
    const { client } = fakeClient(async () => {
      throw new Error("secret internal detail");
    });
    const err = await runScan(input, client).catch((e) => e);
    expect(err).toBeInstanceOf(ScanError);
    expect(err.code).toBe("upstream");
    expect(err.message).not.toContain("secret");
  });
});

describe("ScanInputSchema", () => {
  it("rejects too-short background", () => {
    expect(ScanInputSchema.safeParse({ background: "짧음" }).success).toBe(false);
  });
  it("rejects over-long background", () => {
    expect(ScanInputSchema.safeParse({ background: "a".repeat(2001) }).success).toBe(false);
  });
  it("accepts a valid input", () => {
    expect(ScanInputSchema.safeParse(input).success).toBe(true);
  });
});
