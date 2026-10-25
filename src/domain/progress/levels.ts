export const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000] as const;
export function levelFromXp(xp: number): number {
  return XP_THRESHOLDS.filter(
    (threshold) => Math.max(0, Number.isFinite(xp) ? xp : 0) >= threshold,
  ).length;
}
