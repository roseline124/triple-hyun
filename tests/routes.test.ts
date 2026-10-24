import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/scan/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/scan/service")>();
  return { ...actual, createAnthropicClient: vi.fn(() => ({})), runScan: vi.fn() };
});

import { runScan, ScanError } from "@/features/scan/service";
import { POST as scanPost } from "@/app/api/scan/route";

const valid = { background: "A sufficiently long experience description." };
const req = (body: unknown) =>
  new Request("http://x/api/scan", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("POST /api/scan", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.mocked(runScan).mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("503 when the server key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await scanPost(req(valid));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("missing_api_key");
  });

  it("400 on malformed JSON and on short input", async () => {
    expect((await scanPost(req("not json"))).status).toBe(400);
    expect((await scanPost(req({ background: "short" }))).status).toBe(400);
    expect(runScan).not.toHaveBeenCalled();
  });

  it("200 returns the result", async () => {
    const result = { archetype: "a", summary: "s", stats: [], secondJobs: [], questTags: [] };
    vi.mocked(runScan).mockResolvedValue(result);
    const res = await scanPost(req(valid));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual(result);
  });

  it("maps ScanError to 502 / 504", async () => {
    vi.mocked(runScan).mockRejectedValueOnce(new ScanError("upstream", "x"));
    expect((await scanPost(req(valid))).status).toBe(502);
    vi.mocked(runScan).mockRejectedValueOnce(new ScanError("timeout", "x"));
    expect((await scanPost(req(valid))).status).toBe(504);
  });
});
