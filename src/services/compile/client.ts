import type { Diagnostic } from "./explain";
import { cachedHex } from "./cache";
import { canInterpretArduino } from "@arduhub/arduino-core/sim/interpreter";
export type CompileResult = {
  hex?: string;
  warnings?: Diagnostic[];
  diagnostics?: Diagnostic[];
  error?: string;
  source?: "precompiled" | "service" | "interpreter";
  interpreterCode?: string;
};
export async function compile(code: string): Promise<CompileResult> {
  const cached = await cachedHex(code);
  if (cached) return { hex: cached, warnings: [], source: "precompiled" };
  if (canInterpretArduino(code))
    return { interpreterCode: code, source: "interpreter", warnings: [] };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, board: "uno" }),
        signal: AbortSignal.timeout(32000),
      });
      const data: CompileResult = await response.json();
      if (
        attempt === 0 &&
        ["compiler_busy", "compiler_timeout"].includes(data.error ?? "")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      if (data.error) console.info("[ArduHub compiler]", data.error);
      return data;
    } catch (error) {
      const timeout =
        error instanceof Error &&
        ["AbortError", "TimeoutError"].includes(error.name);
      if (timeout && attempt === 0) continue;
      return { error: timeout ? "compiler_timeout" : "compiler_unreachable" };
    }
  }
  return { error: "compiler_timeout" };
}
