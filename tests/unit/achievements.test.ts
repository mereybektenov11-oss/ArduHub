import { describe, expect, it } from "vitest";
import { createProgress, lessons } from "@/domain/seed";
import { topics, type Progress } from "@/domain/types";
import {
  achievementConditions,
  unlockAchievements,
  claimAchievement,
  recordAchievementEvent,
  achievementState,
  type AchievementId,
} from "@/domain/achievements";
import { completeEvidence } from "../helpers/progressEvidence";
import { mergeProgress } from "@/domain/progress/merge";
const now = new Date(2026, 9, 26, 12);
function completed(n: number) {
  const p = createProgress();
  for (const lesson of lessons.slice(0, n))
    p.lessons[lesson.id] = {
      ...p.lessons[lesson.id],
      ...completeEvidence(lesson.id),
      status: "done",
      attempts: 1,
      bestErrors: 0,
    };
  return p;
}
const cases: [AchievementId, () => Progress][] = [
  ["first-light", () => completed(1)],
  ["light-bearer", () => completed(7)],
  [
    "seven-days",
    () => ({
      ...createProgress(),
      streak: { count: 7, lastActiveDate: "2026-10-26" },
    }),
  ],
  ["perfect", () => completed(1)],
  ["check-master", () => completed(5)],
  [
    "inventor",
    () =>
      recordAchievementEvent(createProgress(), { kind: "project", id: "p1" }),
  ],
  ["buyer", () => ({ ...createProgress(), inventory: ["oma"] })],
  [
    "mentor-friend",
    () => ({
      ...createProgress(),
      achievementStats: {
        mentorQuestionIds: Array.from({ length: 10 }, (_, i) => String(i)),
      },
    }),
  ],
  [
    "speed",
    () => ({ ...createProgress(), achievementStats: { blitzBest: 10 } }),
  ],
  [
    "explorer",
    () => ({ ...createProgress(), achievementStats: { topics: [...topics] } }),
  ],
  ["electrician", () => completed(10)],
  [
    "weekly-best",
    () => ({
      ...createProgress(),
      account: { userId: "A", role: "student", timezone: "UTC" },
      achievementStats: { bestWeeklyRank: 3 },
    }),
  ],
];
describe("twelve evidence-based stickers", () => {
  it.each(cases)(
    "unlocks %s only when its condition is met",
    (id, eligible) => {
      expect(achievementConditions(createProgress(), now)[id]).toBe(false);
      expect(achievementConditions(eligible(), now)[id]).toBe(true);
    },
  );
  it("does not accept a forged done label or expired streak", () => {
    const p = createProgress();
    p.lessons["lesson-1"].status = "done";
    p.streak = { count: 7, lastActiveDate: "2026-10-20" };
    expect(achievementConditions(p, now)["first-light"]).toBe(false);
    expect(achievementConditions(p, now)["seven-days"]).toBe(false);
  });
  it("deduplicates successful actions and resets the blitz chain on a mistake", () => {
    let p = createProgress();
    for (let i = 0; i < 12; i++)
      p = recordAchievementEvent(p, { kind: "mentor", id: "same" });
    expect(achievementConditions(p, now)["mentor-friend"]).toBe(false);
    for (let i = 0; i < 9; i++)
      p = recordAchievementEvent(p, { kind: "blitz", correct: true });
    expect(p.achievementStats?.blitzBest).toBe(9);
    p = recordAchievementEvent(p, { kind: "blitz", correct: false });
    expect(p.achievementStats?.blitzCurrent).toBe(0);
    for (let i = 0; i < 10; i++)
      p = recordAchievementEvent(p, { kind: "blitz", correct: true });
    expect(achievementConditions(p, now).speed).toBe(true);
  });
  it("does not invent a ranking for a local learner", () => {
    const p = recordAchievementEvent(createProgress(), {
      kind: "ranking",
      rank: 1,
    });
    expect(achievementConditions(p, now)["weekly-best"]).toBe(false);
  });
  it("keeps unlock and notification separate from the explicit one-time reward", () => {
    const start = completed(1),
      unlocked = unlockAchievements(start, now);
    expect(unlocked.sparks).toBe(start.sparks);
    const claimed = claimAchievement(unlocked, "first-light", now);
    expect(claimed.sparks).toBe(start.sparks + 5);
    expect(claimAchievement(claimed, "first-light", now)).toBe(claimed);
    expect(claimAchievement(createProgress(), "first-light", now).sparks).toBe(
      0,
    );
  });
  it("retains unlocked stickers when a run ends, and does not transfer local currency receipts to account", () => {
    const local = claimAchievement(
      unlockAchievements(cases[2][1](), now),
      "seven-days",
      now,
    );
    local.streak = { count: 0, lastActiveDate: "2026-10-20" };
    expect(achievementState(local).unlocked).toContain("seven-days");
    const account = createProgress();
    const merged = mergeProgress(local, account);
    expect(merged.achievements?.unlocked).toContain("seven-days");
    expect(merged.achievements?.claimed).toEqual([]);
    expect(merged.sparks).toBe(account.sparks);
  });
});
