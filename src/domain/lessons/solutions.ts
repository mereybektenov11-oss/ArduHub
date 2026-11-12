import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { normalizeCode } from "@arduhub/arduino-core/compile/normalize";
import type { CompileResult } from "@/services/compile/client";
const outageErrors = new Set([
  "compiler_unconfigured",
  "compiler_unavailable",
  "compiler_unreachable",
  "compiler_timeout",
  "compiler_busy",
  "compiler_unauthorized",
]);
export function recordCompileAttempt(
  previous: number,
  result: CompileResult,
): number {
  return outageErrors.has(result.error ?? "") ? previous + 1 : 0;
}
export function matchesSolution(id: string, code: string): boolean {
  const solution = learningLessons.find((lesson) => lesson.id === id)?.code
    .solution;
  if (!solution) return false;
  return normalizeCode(solution) === normalizeCode(code);
}
