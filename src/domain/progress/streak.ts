import type { Progress } from "../types";
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function ordinal(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}
export function freezeStreak(p: Progress, today = localDate()): Progress {
  const boosts = p.boosts ?? { freeze: 0, hints: 0 };
  if (
    p.streak.lastActiveDate &&
    ordinal(today) - ordinal(p.streak.lastActiveDate) === 2 &&
    boosts.freeze > 0
  ) {
    const yesterday = new Date(`${today}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return {
      ...p,
      streak: {
        ...p.streak,
        lastActiveDate: yesterday.toISOString().slice(0, 10),
      },
      boosts: {
        freeze: boosts.freeze - 1,
        hints: boosts.hints,
      },
    };
  }
  return p;
}
export function activeStreak(
  streak: Progress["streak"],
  today = localDate(),
): number {
  return streak.lastActiveDate &&
    ordinal(today) - ordinal(streak.lastActiveDate) <= 1
    ? streak.count
    : 0;
}
export function recordActivity(
  streak: Progress["streak"],
  today = localDate(),
): Progress["streak"] {
  if (streak.lastActiveDate === today) return streak;
  return {
    count:
      streak.lastActiveDate &&
      ordinal(today) - ordinal(streak.lastActiveDate) === 1
        ? streak.count + 1
        : 1,
    lastActiveDate: today,
  };
}
