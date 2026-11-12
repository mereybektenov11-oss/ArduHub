import { describe, expect, it } from "vitest";
import { createProgress } from "@/domain/seed";
import { settleStreak, recordActivity } from "@/domain/progress/streak";
import { buildStreakCalendar } from "@/domain/progress/streakCalendar";
import { claimDaily, dayInZone } from "@/domain/missions";
describe("streak and daily reward events", () => {
  it("consumes a freeze once and never presents a frozen day as activity", () => {
    const p = createProgress();
    p.streak = { count: 7, lastActiveDate: "2026-10-24" };
    p.boosts = { freeze: 1, hints: 0 };
    const result = settleStreak(p, "2026-10-26");
    expect(result.event).toBe("frozen");
    expect(result.progress.streak.count).toBe(7);
    expect(result.progress.boosts?.freeze).toBe(0);
    expect(settleStreak(result.progress, "2026-10-26").event).toBeNull();
    const calendar = buildStreakCalendar(
      result.progress.streak,
      new Date("2026-10-26T12:00:00"),
    );
    expect(calendar).toHaveLength(7);
    expect(calendar[5]).toMatchObject({
      date: "2026-10-25",
      active: false,
      frozen: true,
    });
    expect(recordActivity(result.progress.streak, "2026-10-26").count).toBe(8);
  });
  it("resets an expired run once and emits loss", () => {
    const p = createProgress();
    p.streak = { count: 7, lastActiveDate: "2026-10-24" };
    const lost = settleStreak(p, "2026-10-26");
    expect(lost.event).toBe("lost");
    expect(lost.progress.streak.count).toBe(0);
    expect(
      buildStreakCalendar(
        lost.progress.streak,
        new Date("2026-10-26T12:00:00"),
      ).filter((day) => day.active),
    ).toHaveLength(5);
    expect(settleStreak(lost.progress, "2026-10-26").event).toBeNull();
  });
  it("requires three completed missions and claims only once per day", () => {
    const p = createProgress(),
      now = new Date("2026-10-26T12:00:00Z");
    p.daily = {
      day: dayInZone(now),
      lessonIds: ["lesson-1"],
      xp: 50,
      perfect: false,
      claimed: false,
      quiz: false,
    };
    expect(claimDaily(p, now)).toBe(p);
    p.daily.perfect = true;
    const won = claimDaily(p, now);
    expect(won.sparks).toBe(p.sparks + 10);
    expect(won.mentor.tokens).toBe(p.mentor.tokens + 5);
    expect(claimDaily(won, now)).toBe(won);
    expect(claimDaily(won, new Date("2026-10-27T12:00:00Z"))).toBe(won);
  });
});
