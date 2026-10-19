import { describe, it, expect, vi } from "vitest";
import {
  validateCode,
  parseDiagnostics,
} from "../../compiler-service/policy.mjs";
import { compileJob } from "../../compiler-service/compile-job.mjs";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createCompileHandler } from "@/services/compile/handler";
import { validateLocalCode } from "../../compiler-service/local-compile.mjs";
import { POST } from "@/app/api/compile/route";
const req = (body: unknown) =>
  new Request("http://localhost/api/compile", {
    method: "POST",
    body: JSON.stringify(body),
  });
describe("compiler security and responses", () => {
  it("local mode accepts Arduino and numeric macros, rejects directive and token bypasses", () => {
    expect(
      validateLocalCode('// comment\r#include "/etc/passwd"\r'),
    ).toBeTruthy();
    expect(
      validateLocalCode(
        "#include <Servo.h>\n#define MOTOR_PIN 9\nvoid setup(){}\nvoid loop(){}",
      ),
    ).toBeNull();
    expect(
      validateLocalCode('void loop(){Serial.println("pin#13");}'),
    ).toBeNull();
    for (const code of [
      '%:include "/etc/passwd"',
      '??=include "/etc/passwd"',
      "#define JOIN(a,b) a##b\nvoid setup(){}",
      "#if 1\n#endif",
      '#define HEADER "x"',
      "#include <unknown.h>",
      '__asm__("x")',
    ])
      expect(validateLocalCode(code)).toBeTruthy();
  });
  it("local compile route refuses cross-origin and non-loopback hosts", async () => {
    vi.stubEnv("LOCAL_COMPILER", "true");
    try {
      for (const [host, origin] of [
        ["127.0.0.1:3000", "https://other.example"],
        ["public.example", "http://public.example"],
      ]) {
        const response = await POST(
          new Request("http://127.0.0.1:3000/api/compile", {
            method: "POST",
            headers: { host, origin },
            body: JSON.stringify({
              board: "uno",
              code: "void setup(){} void loop(){}",
            }),
          }),
        );
        expect(response.status).toBe(403);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("accepts standard headers and rejects file/macro/pragma/asm includes", () => {
    expect(validateCode("#include <Arduino.h>\nvoid setup(){}")).toBeNull();
    for (const code of [
      "",
      null,
      '#include "/etc/passwd"',
      "#include HEADER",
      "#include_next <x>",
      'asm("nop")',
      "#pragma GCC x",
    ])
      expect(validateCode(code)).toBeTruthy();
    expect(validateCode("x".repeat(16385))).toBe("code_too_large");
    expect(parseDiagnostics("sketch.ino:4:3: error: expected ;")).toEqual([
      { line: 4, col: 3, message: "expected ;" },
    ]);
  });
  it("proxies success/diagnostics and handles unreachable or invalid service", async () => {
    for (const [status, data, expected] of [
      [200, { hex: ":00000001FF", warnings: [] }, 200],
      [400, { diagnostics: [{ line: 2, col: 3, message: "expected ;" }] }, 400],
      [500, {}, 503],
      [200, {}, 503],
    ] as const) {
      const fetcher = vi
        .fn()
        .mockResolvedValue(Response.json(data, { status }));
      const handler = createCompileHandler({
        url: "http://compiler/compile",
        key: "test",
        fetcher,
      });
      expect((await handler(req({ code: "x", board: "uno" }))).status).toBe(
        expected,
      );
      expect(fetcher).toHaveBeenCalled();
    }
    const handler = createCompileHandler({
      url: "http://compiler/compile",
      key: "test",
      fetcher: vi.fn().mockRejectedValue(Error()),
    });
    expect((await handler(req({ code: "x", board: "uno" }))).status).toBe(503);
  });
  it("rejects malformed or chunked oversized input", async () => {
    const h = createCompileHandler();
    expect(
      (
        await h(
          new Request("http://local", { method: "POST", body: "notjson" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await h(new Request("http://local", { method: "POST" }))).status,
    ).toBe(400);
    expect(
      (
        await h(
          new Request("http://local", {
            method: "POST",
            body: "x".repeat(21000),
          }),
        )
      ).status,
    ).toBe(413);
  });
  it.skipIf(!existsSync("tools/arduino/arduino-cli.exe"))(
    "official CLI produces line diagnostics for a trusted erroneous sketch",
    async () => {
      const result = await compileJob(
        "void setup() {\n  pinMode(13, OUTPUT)\n}\nvoid loop() {}",
        resolve("tools/arduino/arduino-cli.exe"),
        ["--config-file", resolve("tools/arduino/arduino-cli.yaml")],
      );
      expect(result.error).toBe("compile_error");
      expect(
        result.diagnostics?.some((d: { line: number }) => d.line >= 2),
      ).toBe(true);
    },
    30000,
  );
});
