import { describe, expect, it, vi } from "vitest";
import { createProgress } from "@/domain/seed";
import { mergeProgress } from "@/domain/progress/merge";
import {
  importAwardEvents,
  queueAwards,
  flushAwards,
} from "@/domain/progress/awardQueue";
import { progressEvidence } from "../helpers/progressEvidence";

describe("imported lesson award receipts", () => {
  function imported() {
    const guest = createProgress();
    guest.lessons["lesson-1"] = {
      ...guest.lessons["lesson-1"],
      ...progressEvidence("lesson-1"),
      status: "done",
      rewarded: true,
      completionSource: "lesson",
    };
    guest.lessons["lesson-2"] = {
      ...guest.lessons["lesson-2"],
      ...progressEvidence("lesson-2"),
      status: "done",
      rewarded: true,
      completionSource: "lesson_fallback",
    };
    guest.xp = 45;
    return mergeProgress(guest, createProgress());
  }
  it("queues real normal and fallback completion receipts after guest merge, despite rewarded flags", () => {
    const merged = imported();
    expect(merged.lessons["lesson-1"].rewarded).toBe(true);
    expect(importAwardEvents(merged)).toEqual([
      { source: "lesson", refId: "lesson-1", amount: 30 },
      { source: "lesson_fallback", refId: "lesson-2", amount: 15 },
    ]);
  });
  it("includes valid quiz receipts once before each lesson receipt in course order", () => {
    const merged = imported();
    merged.lessons["lesson-1"].quiz!.awarded = ["q1", "q1", "q2", "invalid"];
    merged.lessons["lesson-2"].quiz!.awarded = ["q1"];
    expect(importAwardEvents(merged).map((event) => event.refId)).toEqual([
      "lesson-1:q1",
      "lesson-1:q2",
      "lesson-1",
      "lesson-2:q1",
      "lesson-2",
    ]);
  });
  it("does not convert arbitrary guest XP or unsupported legacy done flags into reward receipts", () => {
    const progress = createProgress();
    progress.xp = 999;
    progress.lessons["lesson-1"].status = "done";
    progress.lessons["lesson-1"].rewarded = true;
    expect(importAwardEvents(progress)).toEqual([]);
  });
  it("keeps first credited quiz answer across later retries and skips unverified claims", () => {
    const progress = createProgress();
    const lesson = {
      ...progress.lessons["lesson-1"],
      ...progressEvidence("lesson-1"),
    };
    lesson.quiz.awarded = ["q1", "q2"];
    lesson.quiz.awardedAnswers = { q1: 0 };
    lesson.quiz.retryAnswers = { q1: 2, q2: 0 };
    progress.lessons["lesson-1"] = lesson;
    expect(importAwardEvents(progress)).toEqual([
      { source: "lesson_quiz", refId: "lesson-1:q1", amount: 1 },
    ]);
  });
  it("repeated import queues do not duplicate requests and existing server receipts drain with409", async () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
    };
    queueAwards(storage, "account", importAwardEvents(imported()));
    queueAwards(storage, "account", importAwardEvents(imported()));
    const fetcher = vi.fn(async () => new Response(null, { status: 409 }));
    await flushAwards(
      storage,
      "account",
      () => "account",
      async () => {},
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      JSON.parse(storage.getItem("arduhub.pending-awards:account")!),
    ).toEqual([]);
  });
});
