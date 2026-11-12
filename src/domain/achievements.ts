import type { Progress, Topic } from "./types";
import { topics } from "./types";
import { lessons } from "./seed";
import { computeCourseState } from "./progress/courseState";
import { activeStreak, localDate } from "./progress/streak";
import { achievementDeck } from "@/content/achievements.ru";
export type AchievementId = (typeof achievementDeck)[number]["id"];
export const STICKER_REWARD = 5;
export function achievementState(p: Progress) {
  const valid = (values?: string[]) => [
    ...new Set(
      (Array.isArray(values) ? values : []).filter((id) =>
        achievementDeck.some((item) => item.id === id),
      ),
    ),
  ];
  return {
    unlocked: valid(p.achievements?.unlocked),
    notified: valid(p.achievements?.notified),
    claimed: valid(p.achievements?.claimed),
  };
}
export function achievementConditions(
  p: Progress,
  now = new Date(),
): Record<AchievementId, boolean> {
  const done = new Set(
    computeCourseState(lessons, p)
      .filter((l) => l.status === "done")
      .map((l) => l.id),
  );
  const led = lessons.filter((l) => l.topic === "leds");
  const perfect = [...done].filter(
    (id) => p.lessons[id]?.attempts === 1 && p.lessons[id]?.bestErrors === 0,
  ).length;
  const stats = p.achievementStats;
  const tried = new Set([
    ...(stats?.topics ?? []),
    ...lessons.filter((l) => done.has(l.id)).map((l) => l.topic),
  ]);
  return {
    "first-light": done.has("lesson-1"),
    "light-bearer": led.length > 0 && led.every((l) => done.has(l.id)),
    "seven-days": activeStreak(p.streak, localDate(now)) >= 7,
    perfect: perfect >= 1,
    "check-master": perfect >= 5,
    inventor: (stats?.projectIds?.length ?? 0) >= 1,
    buyer: (p.inventory?.length ?? 0) >= 1,
    "mentor-friend": new Set(stats?.mentorQuestionIds ?? []).size >= 10,
    speed: (stats?.blitzBest ?? 0) >= 10,
    explorer: topics.every((topic) => tried.has(topic)),
    electrician: done.size >= 10,
    "weekly-best":
      !!p.account?.userId &&
      (stats?.bestWeeklyRank ?? 0) >= 1 &&
      (stats?.bestWeeklyRank ?? 4) <= 3,
  };
}
export function unlockAchievements(p: Progress, now = new Date()): Progress {
  const state = achievementState(p),
    conditions = achievementConditions(p, now);
  const unlocked = achievementDeck
    .filter((item) => conditions[item.id] && !state.unlocked.includes(item.id))
    .map((item) => item.id);
  return unlocked.length
    ? {
        ...p,
        achievements: { ...state, unlocked: [...state.unlocked, ...unlocked] },
      }
    : p;
}
export function claimAchievement(
  p: Progress,
  id: AchievementId,
  now = new Date(),
): Progress {
  const next = unlockAchievements(p, now),
    state = achievementState(next);
  if (state.claimed.includes(id) || !state.unlocked.includes(id)) return p;
  return {
    ...next,
    sparks: next.sparks + STICKER_REWARD,
    achievements: { ...state, claimed: [...state.claimed, id] },
  };
}
export type AchievementEvent =
  | { kind: "project" | "mentor"; id: string }
  | { kind: "blitz"; correct: boolean }
  | { kind: "topic"; topic: Topic }
  | { kind: "ranking"; rank: number };
export function recordAchievementEvent(
  p: Progress,
  event: AchievementEvent,
): Progress {
  const stats = { ...p.achievementStats };
  if (event.kind === "project")
    stats.projectIds = [
      ...new Set([...(stats.projectIds ?? []), event.id]),
    ].slice(-20);
  if (event.kind === "mentor")
    stats.mentorQuestionIds = [
      ...new Set([...(stats.mentorQuestionIds ?? []), event.id]),
    ].slice(-10);
  if (event.kind === "topic")
    stats.topics = [...new Set([...(stats.topics ?? []), event.topic])];
  if (event.kind === "blitz") {
    stats.blitzCurrent = event.correct ? (stats.blitzCurrent ?? 0) + 1 : 0;
    stats.blitzBest = Math.max(stats.blitzBest ?? 0, stats.blitzCurrent);
  }
  if (
    event.kind === "ranking" &&
    p.account?.userId &&
    Number.isInteger(event.rank) &&
    event.rank >= 1
  )
    stats.bestWeeklyRank = Math.min(
      stats.bestWeeklyRank ?? Infinity,
      event.rank,
    );
  return unlockAchievements({ ...p, achievementStats: stats });
}
