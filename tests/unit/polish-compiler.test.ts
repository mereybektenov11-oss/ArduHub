import { describe, it, expect, vi } from "vitest";
import { createCompileHandler } from "@/services/compile/handler";
import { compilerHealth } from "@/services/compile/health";
const req = () =>
  new Request("http://local/api/compile", {
    method: "POST",
    body: JSON.stringify({
      board: "uno",
      code: "void setup(){int changed=143;}void loop(){}",
    }),
  });
describe("precise compiler diagnosis", () => {
  it("explains missing configuration", async () => {
    expect(await (await createCompileHandler()(req())).json()).toMatchObject({
      error: "compiler_unconfigured",
    });
  });
  it.each([
    [429, "compiler_busy"],
    [401, "compiler_unauthorized"],
    [504, "compiler_timeout"],
  ])("maps service HTTP %s", async (status, code) => {
    const handler = createCompileHandler({
      url: "http://compiler/compile",
      key: "test",
      fetcher: vi
        .fn()
        .mockResolvedValue(Response.json({}, { status: Number(status) })),
    });
    expect(await (await handler(req())).json()).toMatchObject({ error: code });
  });
  it.each([
    [new TypeError("fetch failed"), "compiler_unreachable"],
    [new DOMException("late", "TimeoutError"), "compiler_timeout"],
  ])("distinguishes network and timeout", async (error, code) => {
    const handler = createCompileHandler({
      url: "http://compiler/compile",
      key: "test",
      fetcher: vi.fn().mockRejectedValue(error),
    });
    expect(await (await handler(req())).json()).toMatchObject({ error: code });
  });
  it("keeps a compiler deadline distinct from a syntax error", async () => {
    const handler = createCompileHandler({
      url: "http://compiler/compile",
      key: "test",
      fetcher: vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "compiler_timeout" }, { status: 503 }),
        ),
    });
    const result = await handler(req());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: "compiler_timeout" });
  });
  it("probes health instead of compile without exposing a key", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    expect(
      await compilerHealth("https://compiler.example/compile", fetcher),
    ).toMatchObject({ configured: true, reachable: true });
    expect(String(fetcher.mock.calls[0][0])).toBe(
      "https://compiler.example/health",
    );
  });
});
