import { describe, it, expect } from "vitest";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import {
  quizResult,
  createQuizProgress,
  isQuizProgress,
  prepareLessonDraft,
  canOpenLessonStep,
} from "../../src/domain/lessons/quiz";
import {
  initialSteps,
  isDraft,
  LearningStore,
  type Draft,
} from "../../src/domain/projects/storage";

describe("lesson knowledge checkpoint", () => {
  for (const lesson of learningLessons)
    it(`${lesson.id}: six topic questions, wrong answers do not pass`, () => {
      const questions = lessonQuizzes[lesson.id];
      expect(questions).toHaveLength(6);
      expect(new Set(questions.map((q) => q.prompt)).size).toBe(6);
      for (const q of questions) {
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options[q.correct]).toBeTruthy();
        expect(q.explanation.length).toBeGreaterThan(20);
      }
      const answers = questions.map((q) => q.correct);
      expect(quizResult(questions, answers)).toMatchObject({
        score: 6,
        passed: true,
        complete: true,
      });
      expect(
        quizResult(questions, [(answers[0] + 1) % 3, ...answers.slice(1)]),
      ).toMatchObject({ score: 5, passed: false });
      expect(quizResult(questions, [null, ...answers.slice(1)]).complete).toBe(
        false,
      );
      expect(quizResult(questions, [...answers, 0]).passed).toBe(false);
    });
  const draft = (): Draft => ({
    scene: learningLessons[0].circuit.starterScene,
    code: "saved code",
    step: 2,
    steps: { ...initialSteps(), video: true, theory: true },
  });
  it("locks circuit and code until the quiz passes", () => {
    const d = draft();
    expect(canOpenLessonStep(5, d.steps)).toBe(true);
    expect(canOpenLessonStep(2, d.steps)).toBe(false);
    expect(canOpenLessonStep(3, { ...d.steps, quiz: true })).toBe(false);
    expect(canOpenLessonStep(2, { ...d.steps, quiz: true })).toBe(true);
    expect(canOpenLessonStep(99, d.steps)).toBe(false);
  });
  it("moves an unfinished legacy draft to the checkpoint without losing work", () => {
    const d = draft();
    delete d.steps.quiz;
    const migrated = prepareLessonDraft(d);
    expect(migrated.step).toBe(5);
    expect(migrated.scene).toBe(d.scene);
    expect(migrated.code).toBe(d.code);
  });
  it("keeps already verified legacy work accessible", () => {
    const d = draft();
    delete d.steps.quiz;
    d.steps.circuit = true;
    d.step = 3;
    expect(prepareLessonDraft(d)).toMatchObject({
      step: 3,
      steps: { quiz: true, circuit: true },
    });
    d.steps.quiz = false;
    expect(prepareLessonDraft(d).step).toBe(5);
  });
  it("persists partial answers, submitted results and the new step", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (k: string) => entries.get(k) ?? null,
      setItem: (k: string, v: string) => {
        entries.set(k, v);
      },
      removeItem: (k: string) => {
        entries.delete(k);
      },
    };
    const store = new LearningStore(storage);
    const quiz = {
      ...createQuizProgress(6),
      answers: [0, 1, null, null, null, null],
      current: 2,
    };
    store.drafts["lesson-1"] = { ...draft(), step: 5, quiz };
    store.save();
    const loaded = new LearningStore(storage);
    loaded.load();
    expect(loaded.corrupt).toBe(false);
    expect(loaded.drafts["lesson-1"].quiz).toEqual(quiz);
    expect(
      isDraft({
        ...draft(),
        step: 5,
        quiz: { ...quiz, submitted: true, attempts: 1 },
      }),
    ).toBe(true);
    expect(isDraft({ ...draft(), step: 6 })).toBe(false);
    expect(
      isQuizProgress({ ...quiz, answers: [99, 1, null, null, null, null] }),
    ).toBe(false);
    expect(isQuizProgress({ ...quiz, current: 6 })).toBe(false);
  });
});
