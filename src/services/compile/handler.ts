import { createRateLimiter } from "@/lib/rateLimit";
import fixtures from "./fixtures.json" with { type: "json" };
import type { CompileResult } from "./client";
import { normalizeCode } from "@arduhub/arduino-core/compile/normalize";
export { normalizeCode } from "@arduhub/arduino-core/compile/normalize";
export function createCompileHandler(
  config: { url?: string; key?: string; fetcher?: typeof fetch } = {},
) {
  const limiter = createRateLimiter(10);
  return async (request: Request) => {
    const reply = (status: number, body: CompileResult) =>
      Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
    const ip = process.env.VERCEL
      ? (request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ??
        "unknown")
      : "local";
    if (!limiter.check(ip)) return reply(429, { error: "rate_limited" });
    if (Number(request.headers.get("content-length")) > 20000)
      return reply(413, { error: "code_too_large" });
    let raw = "";
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "bad_request" });
      const decoder = new TextDecoder();
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 20000) {
          await reader.cancel();
          return reply(413, { error: "code_too_large" });
        }
        raw += decoder.decode(part.value, { stream: true });
      }
      raw += decoder.decode();
    } catch {
      return reply(400, { error: "bad_request" });
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(400, { error: "bad_request" });
    }
    if (
      !body ||
      typeof body.code !== "string" ||
      body.board !== "uno" ||
      !body.code.trim()
    )
      return reply(400, { error: "bad_request" });
    if (new TextEncoder().encode(body.code).length > 16384)
      return reply(413, { error: "code_too_large" });
    const known = fixtures.find(
      (f) => normalizeCode(f.code) === normalizeCode(body.code),
    );
    if (known)
      return reply(200, {
        hex: known.hex,
        warnings: [],
        source: "precompiled",
      });
    if (config.url && config.key) {
      try {
        const response = await (config.fetcher ?? fetch)(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.key}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });
        if (response.status === 429)
          return reply(503, { error: "compiler_busy" });
        if (response.status === 401 || response.status === 403)
          return reply(503, { error: "compiler_unauthorized" });
        if (response.status === 504 || response.status === 408)
          return reply(503, { error: "compiler_timeout" });
        const data = await response.json();
        if (
          [
            "compiler_timeout",
            "compiler_busy",
            "compiler_unreachable",
          ].includes(data.error)
        )
          return reply(503, { error: data.error });
        if (
          response.ok &&
          typeof data.hex === "string" &&
          data.hex.length < 200000
        )
          return reply(200, {
            hex: data.hex,
            warnings: data.warnings ?? [],
            source: "service",
          });
        if (response.status === 400 && data.error === "forbidden_header")
          return reply(400, { error: "forbidden_header", diagnostics: [] });
        if (response.status === 400 && Array.isArray(data.diagnostics))
          return reply(400, {
            error: "compile_error",
            diagnostics: data.diagnostics,
          });
        return reply(503, { error: "compiler_unavailable" });
      } catch (error) {
        return reply(503, {
          error:
            error instanceof Error &&
            ["TimeoutError", "AbortError"].includes(error.name)
              ? "compiler_timeout"
              : "compiler_unreachable",
        });
      }
    }
    return reply(503, { error: "compiler_unconfigured" });
  };
}
