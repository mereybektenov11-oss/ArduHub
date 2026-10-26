import { describe, expect, it } from "vitest";
import { streakVisualState } from "@/lib/streakState";
const now = new Date(2026, 9, 26, 12);
const progress = (
  count: number,
  lastActiveDate: string | null,
  freeze = 0,
) => ({ streak: { count, lastActiveDate }, boosts: { freeze, hints: 0 } });
describe("streak visual state", () => {
  it("shows no flame for zero days", () =>
    expect(streakVisualState(progress(0, null), now)).toBe("none"));
  it("shows active after activity today", () =>
    expect(streakVisualState(progress(3, "2026-10-26"), now)).toBe("active"));
  it("shows pending if only yesterday has activity", () =>
    expect(streakVisualState(progress(3, "2026-10-25"), now)).toBe("pending"));
  it("shows the purchased freeze", () =>
    expect(streakVisualState(progress(3, "2026-10-25", 1), now)).toBe(
      "frozen",
    ));
  it("marks the seven day milestone", () =>
    expect(streakVisualState(progress(7, "2026-10-26"), now)).toBe(
      "milestone",
    ));
  it("extinguishes a streak lost yesterday", () =>
    expect(streakVisualState(progress(3, "2026-10-24"), now)).toBe("none"));
  it("cannot revive expired activity with inventory", () =>
    expect(streakVisualState(progress(9, "2026-10-21", 2), now)).toBe("none"));
  it("shows a freeze for the one day recoverable gap", () =>
    expect(streakVisualState(progress(3, "2026-10-24", 1), now)).toBe(
      "frozen",
    ));
  it("rejects future activity", () =>
    expect(streakVisualState(progress(3, "2026-10-27"), now)).toBe("none"));
});
