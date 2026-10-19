import { terms } from "./seed";
import type { Progress } from "./types";
const termForError: Record<string, string> = {
  missing_resistor: "term-4",
  led_reversed: "term-3",
  power_ground_swap: "term-18",
  wrong_pin: "term-12",
  open_circuit: "term-39",
  short_circuit: "term-38",
  match: "term-4",
};
export function forgottenTerms(p: Progress) {
  const counts = new Map<string, number>();
  for (const e of p.reviewQueue) {
    const id = e.termOrLessonId.startsWith("term-")
      ? e.termOrLessonId
      : termForError[e.errorCode];
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .flatMap(([id, count]) => {
      const term = terms.find((t) => t.id === id);
      return term ? [{ term, count }] : [];
    });
}
