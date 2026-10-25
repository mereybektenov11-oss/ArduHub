import { lessonQuizzes } from "@/content/lesson-quiz.ru";
import { initialFlowQuiz } from "@/domain/lessons/flow";

export function progressEvidence(id: string) {
  const quiz = initialFlowQuiz();
  quiz.answers = Object.fromEntries(
    lessonQuizzes[id].map((question, i) => [`q${i + 1}`, question.correct]),
  );
  quiz.phase = "result";
  quiz.lastScore = 100;
  return {
    stages: { video: true, test: true, practice: true },
    video: { confirmed: true },
    quiz,
    practice: { circuit: true, code: true, run: true },
    flowUpdatedAt: "2026-10-25T10:00:00.000Z",
  };
}
export const completeEvidence = progressEvidence;
