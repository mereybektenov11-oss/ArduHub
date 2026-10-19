import type { Progress } from "@/domain/types";
export function dayInZone(date = new Date(), timezone = "Asia/Almaty") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function millisecondsToReset(
  now = new Date(),
  timezone = "Asia/Almaty",
) {
  const today = dayInZone(now, timezone);
  let lo = now.getTime(),
    hi = lo + 48 * 3600000;
  while (hi - lo > 1000) {
    const middle = Math.floor((lo + hi) / 2);
    if (dayInZone(new Date(middle), timezone) === today) lo = middle;
    else hi = middle;
  }
  return hi - now.getTime();
}
export function dailyState(
  p: Progress,
  date = new Date(),
): NonNullable<Progress["daily"]> {
  const day = dayInZone(date, p.account?.timezone);
  return p.daily?.day === day
    ? p.daily
    : {
        day,
        lessonIds: [],
        xp: 0,
        perfect: false,
        claimed: false,
        quiz: false,
      };
}
export function recordDaily(
  before: Progress,
  next: Progress,
  date = new Date(),
): Progress {
  const daily = dailyState(next, date);
  const completed = Object.keys(next.lessons).filter(
    (id) =>
      next.lessons[id].status === "done" &&
      before.lessons[id]?.status !== "done",
  );
  return {
    ...next,
    daily: {
      ...daily,
      lessonIds: [...new Set([...daily.lessonIds, ...completed])],
      xp: daily.xp + Math.max(0, next.xp - before.xp),
      perfect:
        daily.perfect ||
        completed.some(
          (id) =>
            next.lessons[id].attempts === 1 &&
            next.lessons[id].bestErrors === 0,
        ),
    },
  };
}
export function missionsDone(p: Progress, date = new Date()) {
  const d = dailyState(p, date);
  return d.lessonIds.length > 0 && d.xp >= 50 && d.perfect;
}
export function claimDaily(p: Progress, date = new Date()): Progress {
  const daily = dailyState(p, date);
  if (daily.claimed || !missionsDone(p, date)) return p;
  return {
    ...p,
    daily: { ...daily, claimed: true },
    sparks: p.sparks + 10,
    mentor: { ...p.mentor, tokens: p.mentor.tokens + 5 },
  };
}
