import type { Progress } from "../types";
import { localDate } from "./streak";

/** Only the most recently recorded run is known; older days stay unmarked. */
export function streakCalendar(streak: Progress["streak"], now = new Date()) {
  const end = streak.lastActiveDate
    ? Date.parse(`${streak.lastActiveDate}T12:00:00Z`) / 86400000
    : Number.NaN;
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + index,
      12,
    );
    const date = localDate(day);
    const ordinal = Date.parse(`${date}T12:00:00Z`) / 86400000;
    return {
      date,
      day: day.getDate(),
      weekday: day.getDay(),
      today: index === 6,
      active: ordinal <= end && ordinal > end - streak.count,
    };
  });
}
