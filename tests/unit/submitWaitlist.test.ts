import { it, expect, vi, afterEach } from "vitest";
import { submitWaitlist } from "@/lib/submitWaitlist";
afterEach(() => vi.unstubAllGlobals());
it.each([
  [201, { ok: true }, "success"],
  [200, { ok: false }, "server_error"],
  [429, { ok: false }, "rate_limited"],
  [500, { ok: false }, "server_error"],
])("handles status %s", async (status, body, result) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(Response.json(body, { status: status as number })),
  );
  expect(await submitWaitlist({ email: "a@example.com", website: "" })).toBe(
    result,
  );
});
it("propagates offline failures to the UI", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  await expect(
    submitWaitlist({ email: "a@example.com", website: "" }),
  ).rejects.toThrow("offline");
});
