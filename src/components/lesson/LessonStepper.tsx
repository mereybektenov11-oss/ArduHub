"use client";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import type { StepState } from "@/domain/projects/storage";
import { lessonStepOrder, canOpenLessonStep } from "@/domain/lessons/quiz";
import { lessonQuizRu } from "@arduhub/curriculum/lesson-quiz.ru";
import Boxicon from "@/components/icons/Boxicon";
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
              <span aria-hidden="true">
                {steps[key] ? <Boxicon name="check" /> : i + 1}
              </span>
              {title}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
