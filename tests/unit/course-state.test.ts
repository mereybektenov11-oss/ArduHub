import { describe, expect, it } from "vitest";
import { createProgress, lessons } from "@/domain/seed";
import {
  computeCourseState,
  computeStageState,
  normalizeProgress,
} from "@/domain/progress/courseState";
import { levelFromXp } from "@/domain/progress/levels";
import { initialFlowQuiz } from "@/domain/lessons/flow";
import { lessonQuizzes } from "@/content/lesson-quiz.ru";
import { awardLesson } from "@/domain/progress/xp";

export function completeEvidence(id: string) {
  const quiz = initialFlowQuiz();
  quiz.answers = Object.fromEntries(
    lessonQuizzes[id].map((q, i) => [`q${i + 1}`, q.correct]),
  );
  quiz.phase = "result";
  quiz.lastScore = 100;
  return {
    stages: { video: true, test: true, practice: true },
    video: { confirmed: true },
    quiz,
    practice: { circuit: true, code: true, run: true },
  };
}
describe("sequential course evidence", () => {
  it("opens only lesson 2 when lesson 1 is completed", () => {
    const p = createProgress();
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...completeEvidence("lesson-1"),
      status: "done",
    };
    const states = computeCourseState(lessons, p);
    expect(states.map((s) => s.status)).toEqual([
      "done",
      "current",
      ...Array(10).fill("locked"),
    ]);
    expect(states.filter((s) => s.status === "current")).toHaveLength(1);
  });
  it("does not let XP or an old diagnostic unlock later chapters", () => {
    const p = createProgress();
    p.xp = 1000;
    p.profile.level = 4;
    p.lessons["lesson-4"].status = "current";
    expect(
      computeCourseState(lessons, p)
        .filter((s) => s.status === "current")
        .map((s) => s.id),
    ).toEqual(["lesson-1"]);
  });
  it("requires evidence rather than inherited stage flags or a stored score", () => {
    const p = createProgress();
    p.lessons["lesson-2"] = {
      ...p.lessons["lesson-2"],
      ...completeEvidence("lesson-2"),
      video: undefined,
    };
    expect(computeStageState(lessons[1], p)).toEqual({
      video: false,
      test: false,
      practice: false,
    });
    p.lessons["lesson-2"].video = { watchedRatio: 0.8 };
    p.lessons["lesson-2"].quiz = initialFlowQuiz();
    p.lessons["lesson-2"].quiz!.lastScore = 100;
    expect(computeStageState(lessons[1], p)).toEqual({
      video: true,
      test: false,
      practice: false,
    });
  });
  it("resets unconfirmed completion without erasing code-independent XP", () => {
    const p = createProgress();
    p.xp = 55;
    p.lessons["lesson-1"].status = "done";
    expect(normalizeProgress(p).lessons["lesson-1"].status).toBe("current");
    expect(normalizeProgress(p).xp).toBe(55);
  });
  it("rejects malformed truthy stage flags and a missing quiz phase", () => {
    const p = createProgress();
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...completeEvidence("lesson-1"),
    };
    const malformed = JSON.parse(JSON.stringify(p));
    malformed.lessons["lesson-1"].practice.run = "false";
    expect(computeStageState(lessons[0], malformed).practice).toBe(false);
    delete malformed.lessons["lesson-1"].quiz.phase;
    expect(computeStageState(lessons[0], malformed).test).toBe(false);
  });
  it("uses the requested XP thresholds and starts with empty progress", () => {
    expect([0, 55, 100, 250, 450, 700, 1000].map(levelFromXp)).toEqual([
      1, 1, 2, 3, 4, 5, 6,
    ]);
    const p = normalizeProgress(createProgress());
    expect([
      p.xp,
      p.streak.count,
      p.sparks,
      p.mentor.tokens,
      p.profile.level,
    ]).toEqual([0, 0, 0, 50, 1]);
    expect(computeStageState(lessons[1], p)).toEqual({
      video: false,
      test: false,
      practice: false,
    });
  });
  it("only awards a fully completed current lesson once", () => {
    let p = createProgress();
    expect(awardLesson(p, "lesson-1").xp).toBe(0);
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...completeEvidence("lesson-1"),
    };
    p = awardLesson(p, "lesson-1");
    expect(p.xp).toBe(30);
    expect(awardLesson(p, "lesson-1").xp).toBe(30);
  });
});
