import { describe, it, expect, vi } from "vitest";
import { probeCompiler } from "@/services/compile/probe";
import { compilerStatusRu as c } from "@/content/compiler";

describe("real compiler probe", () => {
  it("does not report fixture success when configuration is absent", async () => {
    const fetcher = vi.fn();
    expect(await probeCompiler({}, fetcher)).toMatchObject({
      ok: false,
      message: c.missing,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends Blink directly to authenticated service rather than fixture handler", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ hex: ":00000001FF" }));
    expect(
      await probeCompiler(
        { url: "https://compiler.example", key: "secret" },
        fetcher,
      ),
    ).toMatchObject({ ok: true, message: c.ready });
    expect(String(fetcher.mock.calls[0][0])).toBe(
      "https://compiler.example/compile",
    );
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer secret",
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body).code).toContain(
      "delay(500)",
    );
  });
  it.each([
    [401, c.unauthorized],
    [429, c.busy],
    [400, c.compileError],
    [503, c.unavailable],
  ])(
    "diagnoses HTTP %s without leaking service details",
    async (status, message) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "sensitive output" },
            { status: Number(status) },
          ),
        );
      expect(
        await probeCompiler(
          { url: "https://compiler.example/compile", key: "secret" },
          fetcher,
        ),
      ).toMatchObject({ ok: false, message });
    },
  );
  it("distinguishes compiler timeout", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "compiler_timeout" }, { status: 503 }),
      );
    expect(
      await probeCompiler(
        { url: "https://compiler.example", key: "secret" },
        fetcher,
      ),
    ).toMatchObject({ ok: false, message: c.timeout });
  });
});
