import { afterEach, describe, expect, it, vi } from "vitest";
import { createMentorNudge } from "@/domain/mentor/nudge";
import { mentorRouteAllowed } from "@/domain/mentor/entry";

afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const nudge = createMentorNudge();
  nudge.configure({
    stageKey: "lesson-1:practice",
    active: true,
    enabled: true,
  });
  return nudge;
}
describe("mentor nudge timing", () => {
  it("preserves the once-per-stage limit across controller remounts", () => {
    vi.useFakeTimers();
    const shown = new Set<string>();
    const first = createMentorNudge(shown);
    const options = {
      stageKey: "lesson-1:practice",
      active: true,
      enabled: true,
    };
    first.configure(options);
    vi.advanceTimersByTime(180_000);
    first.dismiss();
    first.dispose();
    const second = createMentorNudge(shown);
    second.configure(options);
    second.recordCheck(false);
    second.recordCheck(false);
    vi.advanceTimersByTime(181_000);
    expect(second.getSnapshot()).toBe(false);
  });
  it("waits one second after two failures and cannot repeat after dismissal or revisiting", () => {
    const n = setup();
    n.recordCheck(false);
    vi.advanceTimersByTime(1000);
    expect(n.getSnapshot()).toBe(false);
    n.recordCheck(false);
    vi.advanceTimersByTime(999);
    expect(n.getSnapshot()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(n.getSnapshot()).toBe(true);
    n.dismiss();
    n.recordCheck(false);
    n.recordCheck(false);
    vi.advanceTimersByTime(180_000);
    expect(n.getSnapshot()).toBe(false);
    n.configure({ stageKey: "lesson-1:video", active: false, enabled: true });
    n.configure({ stageKey: "lesson-1:practice", active: true, enabled: true });
    vi.advanceTimersByTime(180_000);
    expect(n.getSnapshot()).toBe(false);
  });
  it("resets consecutive failures on success, cancelling a pending nudge", () => {
    const n = setup();
    n.recordCheck(false);
    n.recordCheck(true);
    n.recordCheck(false);
    vi.advanceTimersByTime(1000);
    expect(n.getSnapshot()).toBe(false);
    n.recordCheck(false);
    n.recordCheck(true);
    vi.advanceTimersByTime(1000);
    expect(n.getSnapshot()).toBe(false);
  });
  it("measures 180 seconds since the last activity, not since mounting", () => {
    const n = setup();
    vi.advanceTimersByTime(179_000);
    n.recordActivity();
    vi.advanceTimersByTime(179_999);
    expect(n.getSnapshot()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(n.getSnapshot()).toBe(true);
  });
  it("cancels pending timers when disabled and gives another stage its own nudge", () => {
    const n = setup();
    n.recordCheck(false);
    n.recordCheck(false);
    n.configure({
      stageKey: "lesson-1:practice",
      active: true,
      enabled: false,
    });
    n.recordCheck(false);
    n.recordCheck(false);
    vi.advanceTimersByTime(200_000);
    expect(n.getSnapshot()).toBe(false);
    n.configure({ stageKey: "lesson-2:practice", active: true, enabled: true });
    n.recordCheck(false);
    n.recordCheck(false);
    vi.advanceTimersByTime(1000);
    expect(n.getSnapshot()).toBe(true);
  });
  it("cancels when leaving practice and on disposal; supports Strict Mode restart", () => {
    const n = setup();
    n.recordCheck(false);
    n.recordCheck(false);
    n.configure({
      stageKey: "lesson-1:practice",
      active: false,
      enabled: true,
    });
    vi.advanceTimersByTime(200_000);
    expect(n.getSnapshot()).toBe(false);
    n.configure({ stageKey: "lesson-1:practice", active: true, enabled: true });
    n.dispose();
    vi.advanceTimersByTime(200_000);
    expect(n.getSnapshot()).toBe(false);
    n.configure({ stageKey: "lesson-1:practice", active: true, enabled: true });
    vi.advanceTimersByTime(180_000);
    expect(n.getSnapshot()).toBe(true);
  });
});
it("opens only in a lesson, project editor or game result with mistakes", () => {
  for (const path of [
    "/app",
    "/app/map",
    "/app/practice",
    "/app/projects",
    "/app/ideas",
    "/app/leaderboard",
    "/app/shop",
    "/app/profile",
  ])
    expect(mentorRouteAllowed(path, true)).toBe(false);
  expect(mentorRouteAllowed("/app/lesson/lesson-1", false)).toBe(true);
  expect(mentorRouteAllowed("/app/projects/project-1", false)).toBe(true);
  expect(mentorRouteAllowed("/app/practice/game-1", false)).toBe(false);
  expect(mentorRouteAllowed("/app/practice/game-1", true)).toBe(true);
});
