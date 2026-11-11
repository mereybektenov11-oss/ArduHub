import { test, expect } from "vitest";
import {
  practiceAfterQuiz,
  type LessonFlowState,
} from "../../src/domain/lessons/flow";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { completeEvidence } from "../helpers/progressEvidence";
const ready = (): LessonFlowState => ({
  version: 2,
  stage: "test",
  ...completeEvidence("lesson-1"),
  stages: { video: true, test: false, practice: false },
  practice: { circuit: false, code: false, run: false },
});
test("verified quiz answers repair a stale flag without issuing any reward", () => {
  const flow = ready();
  flow.quiz.lastScore = 0;
  const next = practiceAfterQuiz(learningLessons[0], flow);
  expect(next?.stage).toBe("practice");
  expect(next?.stages.test).toBe(true);
  expect(next?.quiz).toEqual(flow.quiz);
  expect(flow.stages.test).toBe(false);
});
test("practice still requires video evidence, submitted answers and 70 percent", () => {
  const lesson = learningLessons[0];
  const missingVideo = ready();
  missingVideo.video = undefined;
  expect(practiceAfterQuiz(lesson, missingVideo)).toBeNull();
  const unfinished = ready();
  unfinished.quiz.phase = "questions";
  expect(practiceAfterQuiz(lesson, unfinished)).toBeNull();
  const missingAnswer = ready();
  delete missingAnswer.quiz.answers.q6;
  expect(practiceAfterQuiz(lesson, missingAnswer)).toBeNull();
  const failed = ready();
  for (const q of lesson.quiz!.questions)
    failed.quiz.answers[q.id] = (q.correctIndex + 1) % q.options.length;
  expect(practiceAfterQuiz(lesson, failed)).toBeNull();
});
