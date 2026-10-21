import { it, expect, vi, afterEach } from "vitest";
vi.mock("@/services/compile/cache", () => ({
  cachedHex: vi.fn().mockResolvedValue(null),
}));
import { compile } from "@/services/compile/client";
afterEach(() => vi.unstubAllGlobals());
it("retries busy exactly once", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ error: "compiler_busy" }, { status: 503 }),
    )
    .mockResolvedValueOnce(
      Response.json({ hex: ":00000001FF", source: "service" }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect((await compile("changed")).hex).toBeTruthy();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("does not retry missing configuration or bad code", async () => {
  for (const error of ["compiler_unconfigured", "compile_error"]) {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ error }, { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    expect((await compile("changed")).error).toBe(error);
    expect(fetcher).toHaveBeenCalledTimes(1);
  }
});
it("retries a timeout once then returns the precise error", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValue(new DOMException("late", "TimeoutError"));
  vi.stubGlobal("fetch", fetcher);
  expect((await compile("changed")).error).toBe("compiler_timeout");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
