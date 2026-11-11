import type { LessonQuestion } from "@arduhub/curriculum/lesson-quiz.ru";
import type { Draft, StepState } from "@/domain/projects/storage";

export type QuizProgress = {
  version: 1;
  answers: (number | null)[];
  current: number;
  submitted: boolean;
  attempts: number;
};
export const createQuizProgress = (count: number): QuizProgress => ({
  version: 1,
  answers: Array.from({ length: count }, () => null),
  current: 0,
  submitted: false,
  attempts: 0,
});
export function isQuizProgress(value: unknown): value is QuizProgress {
  if (!value || typeof value !== "object") return false;
  const v = value as QuizProgress;
  return (
    v.version === 1 &&
    Array.isArray(v.answers) &&
    v.answers.length >= 5 &&
    v.answers.length <= 7 &&
    v.answers.every(
      (a) => a === null || (Number.isInteger(a) && a >= 0 && a < 3),
    ) &&
    Number.isInteger(v.current) &&
    v.current >= 0 &&
    v.current < v.answers.length &&
    typeof v.submitted === "boolean" &&
    Number.isInteger(v.attempts) &&
    v.attempts >= 0
  );
}
export function quizResult(
  questions: readonly LessonQuestion[],
  answers: readonly (number | null)[],
) {
  const correct = questions.map((q, i) => answers[i] === q.correct);
  const complete =
    questions.length === answers.length &&
    answers.every(
      (a, i) =>
        a !== null &&
        Number.isInteger(a) &&
        a >= 0 &&
        a < questions[i].options.length,
    );
  return {
    correct,
    score: correct.filter(Boolean).length,
    complete,
    passed: complete && questions.length > 0 && correct.every(Boolean),
  };
}
// Keep the original persisted step IDs; 5 is the new checkpoint before circuit (2).
export const lessonStepOrder = [
  { id: 0, key: "video" },
  { id: 1, key: "theory" },
  { id: 5, key: "quiz" },
  { id: 2, key: "circuit" },
  { id: 3, key: "code" },
  { id: 4, key: "run" },
] as const;
export function canOpenLessonStep(step: number, steps: StepState) {
  const index = lessonStepOrder.findIndex((s) => s.id === step);
  return (
    index >= 0 && lessonStepOrder.slice(0, index).every((s) => steps[s.key])
  );
}
export function prepareLessonDraft(draft: Draft): Draft {
  // Previously verified circuits remain accessible when adding this checkpoint.
  const quiz =
    draft.steps.quiz ??
    (draft.steps.circuit || draft.steps.code || draft.steps.run);
  return {
    ...draft,
    steps: { ...draft.steps, quiz },
    step: draft.step >= 2 && draft.step <= 4 && !quiz ? 5 : draft.step,
  };
}
