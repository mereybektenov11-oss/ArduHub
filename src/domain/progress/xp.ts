import type { Progress } from "../types";
import { lessons, mentors } from "../seed";
import { recordActivity } from "./streak";
import {
  computeCourseState,
  computeStageState,
  normalizeProgress,
} from "./courseState";
import { learningLessons } from "@/domain/lessons/content";
export { levelFromXp as xpLevel } from "./levels";
export const syncLessonStates = normalizeProgress;
export function lessonOpen(p: Progress, id: string): boolean {
  if (!learningLessons.find((lesson) => lesson.id === id)?.available)
    return false;
  const state = computeCourseState(lessons, p).find((l) => l.id === id);
  return Boolean(state && state.status !== "locked");
}
export function awardLesson(
  p: Progress,
  id: string,
  source: "lesson" | "lesson_fallback" = "lesson",
): Progress {
  const lesson = lessons.find((l) => l.id === id);
  if (
    !lesson ||
    !lessonOpen(p, id) ||
    p.lessons[id].status === "done" ||
    !computeStageState(lesson, p).practice
  )
    return p;
  const next = structuredClone(p);
  const claimed = Boolean(p.lessons[id].rewarded);
  next.lessons[id].status = "done";
  next.lessons[id].rewarded = true;
  next.lessons[id].completionSource = source;
  if (!claimed) {
    next.xp += source === "lesson_fallback" ? lesson.xp / 2 : lesson.xp;
    next.sparks += source === "lesson_fallback" ? 5 : 10;
  }
  next.streak = recordActivity(p.streak);
  next.diagnostic.skillScores[lesson.topic] = Math.min(
    100,
    next.diagnostic.skillScores[lesson.topic] + 15,
  );
  return normalizeProgress(next);
}
export function unlockMentor(p: Progress, id: string): Progress {
  const mentor = mentors.find((m) => m.id === id);
  if (
    !mentor ||
    p.mentor.unlockedIds.includes(id) ||
    p.sparks < mentor.unlockCost
  )
    return p;
  return {
    ...p,
    sparks: p.sparks - mentor.unlockCost,
    mentor: {
      ...p.mentor,
      unlockedIds: [...p.mentor.unlockedIds, id],
      selectedId: id,
    },
  };
}
