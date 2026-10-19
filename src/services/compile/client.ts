import type { Diagnostic } from "./explain";
export type CompileResult = {
  hex?: string;
  warnings?: Diagnostic[];
  diagnostics?: Diagnostic[];
  error?: string;
  source?: "precompiled" | "service";
};
export async function compile(code: string): Promise<CompileResult> {
  try {
    const response = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, board: "uno" }),
      signal: AbortSignal.timeout(24000),
    });
    return await response.json();
  } catch {
    return { error: "compiler_unavailable" };
  }
}
