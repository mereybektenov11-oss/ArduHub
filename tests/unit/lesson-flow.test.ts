import { describe, it, expect } from "vitest";
import {
  migrateLessonFlow,
  canOpenStage,
  resolveStage,
  flowQuizResult,
  initialFlowQuiz,
} from "@/domain/lessons/flow";
import { initialSteps, type Draft } from "@/domain/projects/storage";
import { emptyScene } from "@/domain/scene/scene";
import { learningLessons } from "@/domain/lessons/content";
const draft = (): Draft => ({
  scene: emptyScene(),
  code: "",
  step: 0,
  steps: initialSteps(),
});
describe("three-stage gate and migration", () => {
  it("provides four distinct answers and explanations for every lesson question", () => {
    for (const lesson of learningLessons) {
      expect(lesson.quiz?.questions.length).toBeGreaterThanOrEqual(4);
      for (const question of lesson.quiz!.questions) {
        expect(question.options).toHaveLength(4);
        expect(
          new Set(question.options).size,
          `${lesson.id}/${question.id}`,
        ).toBe(4);
        expect(question.correctIndex).toBeLessThan(4);
        expect(question.explanation.length).toBeGreaterThan(10);
      }
    }
  });
  it("opens video, then test, then practice and protects deep links", () => {
    const f = migrateLessonFlow(draft());
    expect(canOpenStage(f, "test")).toBe(false);
    expect(resolveStage(f, "practice")).toBe("video");
    f.stages.video = true;
    expect(canOpenStage(f, "test")).toBe(true);
    expect(resolveStage(f, "practice")).toBe("test");
    f.stages.test = true;
    expect(resolveStage(f, "practice")).toBe("practice");
  });
  it("resets old stage flags without viewing or quiz evidence and keeps practice data", () => {
    const old = draft();
    old.steps = { ...old.steps, video: true, theory: true, quiz: true };
    old.step = 2;
    const f = migrateLessonFlow(old);
    expect(f.stages).toEqual({ video: false, test: false, practice: false });
    expect(f.stage).toBe("video");
    expect(old.steps.circuit).toBe(false);
  });
  it("requires 70 percent without rounding an incomplete score up", () => {
    const questions = Array.from({ length: 6 }, (_, i) => ({
      id: `q${i + 1}`,
      text: "",
      options: ["a", "b", "c", "d"],
      correctIndex: 0,
      explanation: "",
    }));
    const state = initialFlowQuiz();
    state.answers = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 1, q6: 1 };
    expect(flowQuizResult(questions, state)).toMatchObject({
      score: 4,
      percent: 67,
      passed: false,
    });
    state.retryAnswers.q5 = 0;
    expect(flowQuizResult(questions, state)).toMatchObject({
      score: 5,
      percent: 83,
      passed: true,
    });
  });
});
