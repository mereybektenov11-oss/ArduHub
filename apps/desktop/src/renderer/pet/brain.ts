// What the companion notices in a lesson. Pure functions over the lesson
// context the site's LearningLesson broadcasts ("arduhub:mentor-context").
import { check } from "@arduhub/arduino-core/checker/check";
import { errorCopy } from "@arduhub/arduino-core/checker/errors.ru";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { legacyNetlist } from "@arduhub/arduino-core/scene/migrate";
import { shorted } from "@arduhub/arduino-core/scene/netlist";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import type { CheckError } from "@arduhub/arduino-core/types";
import { petT } from "./content";

export type LessonContext = {
  lessonId?: string;
  context?: {
    step?: string;
    code?: string;
    scene?: string;
    errors?: string[];
  };
};

/** Mistakes that could damage real parts: the companion stops the learner. */
export const FATAL = new Set([
  "short_circuit",
  "missing_resistor",
  "power_ground_swap",
]);
export type FatalCode =
  "short_circuit" | "missing_resistor" | "power_ground_swap";

export function parseScene(raw: string | undefined): SceneDoc | null {
  if (!raw) return null;
  try {
    const scene = JSON.parse(raw) as SceneDoc;
    return Array.isArray(scene?.components) && Array.isArray(scene?.wires)
      ? scene
      : null;
  } catch {
    return null;
  }
}

/** Danger visible while wiring, before any check: a short circuit. */
export function liveDanger(scene: SceneDoc | null): FatalCode | null {
  if (!scene) return null;
  try {
    return shorted(scene) ? "short_circuit" : null;
  } catch {
    return null;
  }
}

/** Coded circuit errors against the lesson reference (as the site checks). */
export function circuitErrors(
  scene: SceneDoc | null,
  lessonId: string | undefined,
): CheckError[] {
  const lesson = learningLessons.find((l) => l.id === lessonId);
  if (!scene || !lesson) return [];
  try {
    const ref = legacyNetlist(lesson.circuit.referenceScene);
    ref.components = ref.components.filter((c) => c.type !== "button");
    ref.links = ref.links.filter(
      (w) =>
        ref.components.some((c) => c.id === w.from.componentId) &&
        ref.components.some((c) => c.id === w.to.componentId),
    );
    if (!ref.components.some((p) => p.type === "led")) return [];
    const found = check(legacyNetlist(scene), ref).filter(
      (e) => e.severity === "error",
    );
    if (shorted(scene) && !found.some((e) => e.code === "short_circuit"))
      found.unshift({
        code: "short_circuit",
        message: errorCopy.short_circuit[0],
        hint1: errorCopy.short_circuit[1],
        hint2: errorCopy.short_circuit[2],
        answer: errorCopy.short_circuit[3],
        componentIds: [],
        severity: "error",
      });
    // Most dangerous first.
    return found.sort(
      (a, b) => Number(FATAL.has(b.code)) - Number(FATAL.has(a.code)),
    );
  } catch {
    return [];
  }
}

/** Hint for a repeated mistake: question, then hint, then the answer. */
export function hintFor(error: CheckError, count: number): string {
  const tip =
    count <= 1 ? error.hint1 : count === 2 ? error.hint2 : error.answer;
  const lead =
    count <= 1 ? `${error.message}.` : petT.again(error.message, count);
  return `${lead} ${tip}`;
}

export function signature(errors: string[] | undefined) {
  return (errors ?? []).join("\n");
}
