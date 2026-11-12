import { describe, expect, it } from "vitest";
import { createProgress } from "@/domain/seed";
import { initialFlowQuiz } from "@/domain/lessons/flow";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
import { mergeProgress } from "@/domain/progress/merge";
import { awardLesson } from "@/domain/progress/xp";

function completeLesson(id: string, progress = createProgress()) {
  const quiz = initialFlowQuiz();
  quiz.answers = Object.fromEntries(
    lessonQuizzes[id].map((q, i) => [`q${i + 1}`, q.correct]),
  );
  quiz.phase = "result";
  progress.lessons[id] = {
    ...progress.lessons[id],
    video: { confirmed: true },
    stages: { video: true, test: true, practice: true },
    quiz,
    practice: { circuit: true, code: true, run: true },
    flowUpdatedAt: "2026-10-24T10:00:00.000Z",
  };
  return awardLesson(progress, id);
}

describe("G1 independent merge review", () => {
  it("preserves an account completion when a newer imported draft is incomplete", () => {
    const account = completeLesson("lesson-1");
    const local = createProgress();
    local.lessons["lesson-1"] = {
      ...local.lessons["lesson-1"],
      video: { confirmed: true },
      stages: { video: true, test: false, practice: false },
      quiz: initialFlowQuiz(),
      practice: { circuit: false, code: false, run: false },
      flowUpdatedAt: "2026-10-25T10:00:00.000Z",
    };
    const merged = mergeProgress(local, account);
    expect(merged.lessons["lesson-1"].status).toBe("done");
    expect(merged.lessons["lesson-2"].status).toBe("current");
  });

  it("imports complete evidence without relying on a client timestamp", () => {
    const local = completeLesson("lesson-1");
    delete local.lessons["lesson-1"].flowUpdatedAt;
    const merged = mergeProgress(local, createProgress());
    expect(merged.lessons["lesson-1"].status).toBe("done");
    expect(merged.lessons["lesson-2"].status).toBe("current");
    expect(merged.lessons["lesson-1"].completionSource).toBe("lesson");
  });
});
