import type { Progress } from "../types";
import { lessons, levels, mentors } from "../seed";
import { recordActivity } from "./streak";
import { learningLessons } from "@/domain/lessons/content";
export const xpLevel = (xp: number) =>
  [0, 150, 400, 800, 1400].filter((n) => xp >= n).length - 1;
export function syncLessonStates(p: Progress): Progress {
  return {
    ...p,
    lessons: Object.fromEntries(
      lessons.map((l) => [
        l.id,
        {
          ...p.lessons[l.id],
          status:
            p.lessons[l.id].status === "done"
              ? "done"
              : lessonOpen(p, l.id)
                ? "current"
                : "locked",
        },
      ]),
    ),
  };
}
export function lessonOpen(p: Progress, id: string): boolean {
  const l = lessons.find((l) => l.id === id);
  if (!l) return false;
  if (!learningLessons.find((l) => l.id === id)?.available) return false;
  const inLevel = lessons.filter((x) => x.levelId === l.levelId);
  const i = inLevel.findIndex((x) => x.id === id);
  return (
    l.levelId <= p.profile.level &&
    (i === 0 || p.lessons[inLevel[i - 1].id].status === "done")
  );
}
export function awardLesson(p: Progress, id: string): Progress {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson || !lessonOpen(p, id) || p.lessons[id].status === "done")
    return p;
  const next = structuredClone(p);
  next.lessons[id].status = "done";
  next.xp += lesson.xp;
  next.sparks += lesson.xp;
  next.streak = recordActivity(p.streak);
  next.diagnostic.skillScores[lesson.topic] = Math.min(
    100,
    next.diagnostic.skillScores[lesson.topic] + 15,
  );
  const finished = levels
    .filter((l) => lessons.some((lesson) => lesson.levelId === l.id))
    .filter((l) =>
      lessons
        .filter((x) => x.levelId === l.id)
        .every((x) => next.lessons[x.id].status === "done"),
    )
    .map((l) => Math.min(4, l.id + 1));
  next.profile.level = Math.max(
    next.profile.level,
    xpLevel(next.xp),
    ...finished,
  );
  for (const l of lessons)
    if (next.lessons[l.id].status !== "done")
      next.lessons[l.id].status = lessonOpen(next, l.id) ? "current" : "locked";
  return next;
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
