import { describe, expect, it } from "vitest";
import { fail, ok } from "@/lib/api";

describe("api helpers", () => {
  it("ok wraps data", async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });

  it("fail carries code, message and status", async () => {
    const res = fail("not_found", "Not found", 404);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: { code: "not_found", message: "Not found" } });
  });

});
