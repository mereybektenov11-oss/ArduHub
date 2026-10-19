"use client";
import { learningRu as c } from "@/content/learning.ru";
import type { StepState } from "@/domain/projects/storage";
import { lessonStepOrder, canOpenLessonStep } from "@/domain/lessons/quiz";
import { lessonQuizRu } from "@/content/lesson-quiz.ru";
export default function LessonStepper({
  step,
  steps,
  onStep,
}: {
  step: number;
  steps: StepState;
  onStep: (step: number) => void;
}) {
  return (
    <ol
      className="l2-stepper"
      data-tour="lesson-steps"
      aria-label={c.workspace}
    >
      {lessonStepOrder.map(({ id, key }, i) => {
        const title = key === "quiz" ? lessonQuizRu.title : c.steps[id];
        return (
          <li key={title}>
            <button
              aria-current={step === id ? "step" : undefined}
              disabled={!canOpenLessonStep(id, steps)}
              onClick={() => onStep(id)}
            >
              <span aria-hidden="true">{steps[key] ? "✓" : i + 1}</span>
              {title}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
