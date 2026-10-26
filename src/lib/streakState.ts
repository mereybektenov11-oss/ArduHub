import type { Progress } from "@/domain/types";
import { localDate } from "@/domain/progress/streak";

export type StreakVisualState =
  "none" | "active" | "pending" | "frozen" | "milestone";
/** Presentation only: never changes activity, rewards or freeze inventory. */
export function streakVisualState(
  progress: Pick<Progress, "streak" | "boosts">,
  now: Date,
): StreakVisualState {
  const { count, lastActiveDate } = progress.streak;
  if (count <= 0 || !lastActiveDate) return "none";
  const ordinal = (date: string) => Date.parse(`${date}T12:00:00Z`) / 86400000;
  const gap = ordinal(localDate(now)) - ordinal(lastActiveDate);
  if (!Number.isFinite(gap) || gap < 0 || gap > 2) return "none";
  if (gap === 2) return (progress.boosts?.freeze ?? 0) > 0 ? "frozen" : "none";
  if ((progress.boosts?.freeze ?? 0) > 0) return "frozen";
  if (gap === 1) return "pending";
  return [7, 14, 30].includes(count) ? "milestone" : "active";
}
