import type { Progress } from "@/domain/types";
import { lessons, levels } from "@/domain/seed";
import { computeCourseState } from "@/domain/progress/courseState";
export function computeMapState(progress: Pick<Progress, "lessons">) {
  const course = computeCourseState(lessons, progress);
  return levels.map((level) => {
    const ids = lessons
      .filter((lesson) => lesson.levelId === level.id)
      .map((lesson) => lesson.id);
    const states = course.filter((lesson) => ids.includes(lesson.id));
    const done = states.filter((lesson) => lesson.status === "done").length;
    const status =
      states.length && done === states.length
        ? "done"
        : states.some((lesson) => lesson.status !== "locked")
          ? "current"
          : "locked";
    return { ...level, done, total: states.length, status } as const;
  });
}
