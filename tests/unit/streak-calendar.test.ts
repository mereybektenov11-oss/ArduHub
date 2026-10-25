import { describe, expect, it } from "vitest";
import { streakCalendar } from "@/domain/progress/streakCalendar";

describe("seven day streak calendar", () => {
  it("keeps new learner days empty", () => {
    const days = streakCalendar(
      { count: 0, lastActiveDate: null },
      new Date(2026, 9, 25),
    );
    expect(days).toHaveLength(7);
    expect(days.filter((day) => day.active)).toHaveLength(0);
    expect(days[6].date).toBe("2026-10-25");
  });
  it("marks only the recorded consecutive streak, including yesterday", () => {
    const days = streakCalendar(
      { count: 3, lastActiveDate: "2026-10-24" },
      new Date(2026, 9, 25),
    );
    expect(days.filter((day) => day.active).map((day) => day.date)).toEqual([
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
    ]);
    expect(days[6].active).toBe(false);
  });
  it("preserves known past activity without fabricating a new active streak", () => {
    const days = streakCalendar(
      { count: 9, lastActiveDate: "2026-10-21" },
      new Date(2026, 9, 25),
    );
    expect(days.filter((day) => day.active).map((day) => day.date)).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
    ]);
  });
  it("handles month boundaries with local dates", () => {
    const days = streakCalendar(
      { count: 2, lastActiveDate: "2026-11-01" },
      new Date(2026, 10, 1),
    );
    expect(days.filter((day) => day.active).map((day) => day.date)).toEqual([
      "2026-10-31",
      "2026-11-01",
    ]);
  });
});
