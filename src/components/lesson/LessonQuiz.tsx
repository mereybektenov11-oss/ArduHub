"use client";
import { useRef } from "react";
import {
  lessonQuizRu as c,
  type LessonQuestion,
} from "@arduhub/curriculum/lesson-quiz.ru";
import {
  quizResult,
  createQuizProgress,
  type QuizProgress,
} from "@/domain/lessons/quiz";
import { Action, Card, Pill } from "@/components/cabinet/ui";

import Boxicon from "@/components/icons/Boxicon";
export default function LessonQuiz({
  questions,
  value,
  onChange,
  onContinue,
}: {
  questions: readonly LessonQuestion[];
  value?: QuizProgress;
  onChange: (value: QuizProgress, passed: boolean) => void;
  onContinue: () => void;
}) {
  const state =
    value && value.answers.length === questions.length
      ? value
      : createQuizProgress(questions.length);
  const result = quizResult(questions, state.answers);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[state.current];
  function move(current: number) {
    onChange({ ...state, current }, false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <Card className="l2-quiz">
      <header>
        <Pill>{c.title}</Pill>
        <h2>
          {state.submitted ? (result.passed ? c.passed : c.review) : c.title}
        </h2>
        <p>{c.intro}</p>
      </header>
      {state.submitted ? (
        <>
          <p className="l2-quiz-result" role="status">
            {c.result}: {result.score} {c.of} {questions.length}
          </p>
          <ol className="l2-quiz-review">
            {questions.map((q, i) => (
              <li
                key={q.prompt}
                className={result.correct[i] ? "is-correct" : "is-incorrect"}
              >
                <strong>
                  {result.correct[i] ? (
                    <>
                      <Boxicon name="check" /> {c.correct}
                    </>
                  ) : (
                    <>
                      <Boxicon name="retry" /> {c.incorrect}
                    </>
                  )}{" "}
                  · {q.prompt}
                </strong>
                {!result.correct[i] && (
                  <p>
                    {c.correctAnswer}: {q.options[q.correct]}
                  </p>
                )}
                <p>{q.explanation}</p>
              </li>
            ))}
          </ol>
          {result.passed ? (
            <Action onClick={onContinue}>
              {c.continue} <Boxicon name="next" />
            </Action>
          ) : (
            <Action
              onClick={() => {
                onChange(
                  {
                    ...state,
                    submitted: false,
                    current: result.correct.findIndex((p) => !p),
                    answers: state.answers.map((a, i) =>
                      result.correct[i] ? a : null,
                    ),
                  },
                  false,
                );
                requestAnimationFrame(() => heading.current?.focus());
              }}
            >
              {c.retry}
            </Action>
          )}
        </>
      ) : (
        <>
          <div
            className="l2-quiz-progress"
            aria-label={`${c.question} ${state.current + 1} ${c.of} ${questions.length}`}
          >
            {questions.map((q, i) => (
              <button
                key={q.prompt}
                aria-label={`${c.question} ${i + 1}`}
                aria-current={i === state.current ? "step" : undefined}
                className={state.answers[i] === null ? "" : "answered"}
                onClick={() => move(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <h3 ref={heading} tabIndex={-1}>
            {state.current + 1}. {question.prompt}
          </h3>
          <fieldset>
            <legend className="sr-only">
              {question.prompt} · {c.choose}
            </legend>
            {question.options.map((option, index) => (
              <label
                key={option}
                className={
                  state.answers[state.current] === index ? "selected" : ""
                }
              >
                <input
                  type="radio"
                  name={`quiz-question-${state.current}`}
                  checked={state.answers[state.current] === index}
                  onChange={() =>
                    onChange(
                      {
                        ...state,
                        answers: state.answers.map((answer, i) =>
                          i === state.current ? index : answer,
                        ),
                      },
                      false,
                    )
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <div className="l2-quiz-actions">
            <Action
              secondary
              disabled={state.current === 0}
              onClick={() => move(state.current - 1)}
            >
              {c.previous}
            </Action>
            {state.current < questions.length - 1 ? (
              <Action
                disabled={state.answers[state.current] === null}
                onClick={() => move(state.current + 1)}
              >
                {c.next} <Boxicon name="next" />
              </Action>
            ) : (
              <Action
                disabled={!result.complete}
                onClick={() =>
                  onChange(
                    { ...state, submitted: true, attempts: state.attempts + 1 },
                    result.passed,
                  )
                }
              >
                {c.check}
              </Action>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
