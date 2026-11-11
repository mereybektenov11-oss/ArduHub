"use client";
import { useRef } from "react";
import { lessonFlowRu as c } from "@/content/ru";
import {
  flowQuizResult,
  initialFlowQuiz,
  type FlowQuiz,
  type FlowQuestion,
} from "@/domain/lessons/flow";
import { Action } from "@/components/cabinet/ui";
import { openMentor } from "@/components/mentor/openMentor";
import { kidsMentorRu } from "@/content/kids-mentor.ru";
import { playSfx } from "@/lib/sfx";
import { CheckDraw } from "@/components/feedback/EventFeedback";
import Boxicon from "@/components/icons/Boxicon";
export default function QuizStage({
  lessonId,
  questions,
  passPercent = 70,
  value,
  onChange,
  onContinue,
}: {
  lessonId?: string;
  questions: readonly FlowQuestion[];
  passPercent?: number;
  value: FlowQuiz;
  onChange: (quiz: FlowQuiz, passed: boolean, newAward?: string) => void;
  onContinue: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null),
    questionHeading = useRef<HTMLHeadingElement>(null);
  const review = value.phase === "review",
    result = value.phase === "result" || value.phase === "reviewResult";
  const resultValue = flowQuizResult(questions, value, passPercent);
  const current = review
    ? questions.find((q) => q.id === value.retryQueue[value.retryCurrent])
    : questions[Math.min(value.current, questions.length - 1)];
  const answer = current
    ? review
      ? value.retryAnswers[current.id]
      : value.answers[current.id]
    : undefined;
  const focus = () =>
    requestAnimationFrame(() =>
      (questionHeading.current ?? heading.current)?.focus(),
    );
  function choose(index: number) {
    if (answer !== undefined || !current) return;
    const correct = index === current.correctIndex,
      newAward =
        correct && !value.awarded.includes(current.id) ? current.id : undefined;
    const next = {
      ...value,
      [review ? "retryAnswers" : "answers"]: {
        ...(review ? value.retryAnswers : value.answers),
        [current.id]: index,
      },
      awarded: newAward ? [...value.awarded, newAward] : value.awarded,
      awardedAnswers: newAward
        ? { ...value.awardedAnswers, [newAward]: index }
        : value.awardedAnswers,
    };
    onChange(next, false, newAward);
    playSfx(correct ? "correct" : "wrong");
  }
  function advance() {
    const last = review
      ? value.retryCurrent >= value.retryQueue.length - 1
      : value.current >= questions.length - 1;
    if (last) {
      onChange(
        {
          ...value,
          phase: review ? "reviewResult" : "result",
          lastScore: resultValue.score,
          retryQueue: review ? value.retryQueue : resultValue.wrong,
        },
        resultValue.passed,
      );
    } else
      onChange(
        {
          ...value,
          [review ? "retryCurrent" : "current"]:
            (review ? value.retryCurrent : value.current) + 1,
        },
        false,
      );
    focus();
  }
  return (
    <section className="flow-quiz l2-quiz">
      <header>
        <p className="cab-eyebrow">{review ? c.review : c.quiz}</p>
        <h1 ref={heading} tabIndex={-1}>
          {result
            ? `${c.result} ${resultValue.score} ${c.of} ${resultValue.total}`
            : c.quiz}
        </h1>
        <p>{c.quizThreshold}</p>
      </header>
      {result ? (
        <>
          <p className="flow-quiz-score" role="status">
            {resultValue.percent}% · {c.result} {resultValue.score} {c.of}{" "}
            {resultValue.total}
          </p>
          <p>{c.quizReviewNote}</p>
          <div className="cab-row">
            {resultValue.passed ? (
              <Action onClick={onContinue}>
                {c.toPractice} <Boxicon name="next" />
              </Action>
            ) : (
              <Action
                onClick={() => {
                  onChange(
                    {
                      ...initialFlowQuiz(),
                      attempts: value.attempts + 1,
                      awarded: value.awarded,
                      awardedAnswers: value.awardedAnswers,
                    },
                    false,
                  );
                  focus();
                }}
              >
                {c.again}
              </Action>
            )}
            {value.phase === "result" && value.retryQueue.length > 0 && (
              <Action
                secondary
                onClick={() => {
                  onChange(
                    { ...value, phase: "review", retryCurrent: 0 },
                    false,
                  );
                  focus();
                }}
              >
                {c.retryErrors}
              </Action>
            )}
          </div>
        </>
      ) : current ? (
        <>
          <div className="flow-question-progress">
            <span>
              {c.question} {(review ? value.retryCurrent : value.current) + 1}{" "}
              {c.of} {review ? value.retryQueue.length : questions.length}
            </span>
            <progress
              aria-label={c.quiz}
              value={(review ? value.retryCurrent : value.current) + 1}
              max={review ? value.retryQueue.length : questions.length}
            />
          </div>
          <h2 ref={questionHeading} tabIndex={-1}>
            {current.text}
          </h2>
          <div
            className="flow-quiz-options"
            role="group"
            aria-label={current.text}
          >
            {current.options.map((option, i) => (
              <button
                className={`flow-answer ${answer === i ? (i === current.correctIndex ? "is-correct" : "is-incorrect") : ""}`}
                key={option}
                disabled={answer !== undefined}
                onClick={() => choose(i)}
              >
                <span aria-hidden="true">
                  {answer === i && i === current.correctIndex ? (
                    <CheckDraw />
                  ) : (
                    i + 1
                  )}
                </span>
                {option}
              </button>
            ))}
          </div>
          {answer !== undefined && (
            <div
              className={`flow-feedback ${answer === current.correctIndex ? "is-correct" : "is-incorrect"}`}
              role="status"
            >
              <strong>
                {answer === current.correctIndex ? c.correct : c.incorrect}
              </strong>
              <p>{current.explanation}</p>
              {answer !== current.correctIndex && (
                <Action
                  secondary
                  onClick={() =>
                    openMentor({
                      lessonId,
                      prompt: kidsMentorRu.explainQuestion(
                        current.text,
                        current.options[answer],
                      ),
                    })
                  }
                >
                  {kidsMentorRu.explain}
                </Action>
              )}
              <Action onClick={advance}>
                {c.next} <Boxicon name="next" />
              </Action>
            </div>
          )}
        </>
      ) : (
        <Action onClick={onContinue}>
          {c.toPractice} <Boxicon name="next" />
        </Action>
      )}
    </section>
  );
}
