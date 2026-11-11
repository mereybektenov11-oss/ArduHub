"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { playSfx } from "@/lib/sfx";
import { CheckDraw } from "@/components/feedback/EventFeedback";
import { lessonFlowRu as c } from "@/content/ru";
import type { LearningLesson } from "@arduhub/arduino-core/lessons/content";
import type { LessonFlowState } from "@/domain/lessons/flow";
import { Action, Card } from "@/components/cabinet/ui";
import RewardIcon from "@/components/icons/RewardIcon";
import { kidsWorkspaceRu as k } from "@/content/kids-workspace.ru";
import Boxicon from "@/components/icons/Boxicon";
export default function PracticeStage({
  lesson,
  flow,
  expected,
  children,
  onExplain,
  onTheory,
  hint,
  notice,
  errors,
  report,
  onActivity,
}: {
  lesson: LearningLesson;
  flow: LessonFlowState;
  expected: string;
  children: ReactNode;
  onExplain: () => void;
  onTheory: () => void;
  onHint: () => void;
  hint?: ReactNode;
  notice?: string;
  errors: readonly { message: string }[];
  report: readonly { pass: boolean; message: string }[];
  onActivity?: () => void;
}) {
  const [showTask, setShowTask] = useState(false),
    [expectedOutput, setExpectedOutput] = useState(false);
  const errorKey = errors.map((e) => e.message).join("|");
  const previous = useRef(flow.practice);
  useEffect(() => {
    if (
      (["circuit", "code", "run"] as const).some(
        (key) => flow.practice[key] && !previous.current[key],
      )
    )
      playSfx("check_done");
    previous.current = flow.practice;
  }, [flow.practice]);
  useEffect(() => {
    if (!errorKey) return;
    const frame = requestAnimationFrame(() => setShowTask(true));
    return () => cancelAnimationFrame(frame);
  }, [errorKey]);
  return (
    <div
      className="flow-practice"
      onPointerDown={onActivity}
      onPointerMove={onActivity}
      onKeyDown={onActivity}
    >
      <button
        className="cab-btn cab-btn-secondary flow-task-toggle"
        aria-expanded={showTask}
        aria-controls="lesson-task"
        onClick={() => setShowTask((v) => !v)}
      >
        {showTask ? c.hideTask : c.showTask}
      </button>
      <aside
        id="lesson-task"
        className={`flow-task l2-lesson-guide ${showTask ? "is-open" : ""}`}
      >
        <Card>
          <h1>{lesson.title}</h1>
          <p className="kids-task-summary">{lesson.task}</p>
          <details className="kids-full-task">
            <summary>{k.fullTask}</summary>
            <p>{lesson.task}</p>
            <div className="dash-guide-actions">
              <Action secondary onClick={onExplain}>
                {c.explain}
              </Action>
              <Action secondary onClick={onTheory}>
                {c.theory}
              </Action>
            </div>
          </details>
          <section className="dash-expected">
            <h2>{c.expected}</h2>
            {lesson.run.checks.some((check) => check.kind === "pinBlinks") && (
              <span
                className="kids-expected-led"
                role="img"
                aria-label={k.exampleAnimation}
              >
                <span />
              </span>
            )}
            <p>{expected}</p>
          </section>
          <ol className="flow-checklist">
            {(["circuit", "code", "run"] as const).map((key, i) => (
              <li key={key} className={flow.practice[key] ? "is-done" : ""}>
                {flow.practice[key] ? (
                  <CheckDraw />
                ) : (
                  <RewardIcon kind="mission" />
                )}
                <span>{c.checklist[i]}</span>
                <span className="sr-only">
                  {flow.practice[key] ? c.correct : ""}
                </span>
              </li>
            ))}
          </ol>
        </Card>
        {hint && <Card>{hint}</Card>}
        {notice && (
          <p role="status" className="cab-card">
            {notice}
          </p>
        )}
        {errors.map((e, i) => (
          <p key={i} className="l2-error" role="alert">
            {e.message}
          </p>
        ))}
      </aside>
      <div className="flow-practice-workspace">
        {children}
        <section className="flow-output">
          <div className="cab-row">
            <h2>{c.output}</h2>
            <label>
              <input
                type="checkbox"
                checked={expectedOutput}
                onChange={(e) => setExpectedOutput(e.target.checked)}
              />
              {c.expected}
            </label>
          </div>
          {expectedOutput ? (
            <p>{expected}</p>
          ) : report.length &&
            report.every((r) => r.pass) &&
            flow.practice.circuit ? (
            <p className="kids-run-success" role="status">
              {lesson.run.checks.some((check) => check.kind === "pinBlinks")
                ? k.success
                : k.successOther}
            </p>
          ) : report.length ? (
            <>
              <p>{k.retry}</p>
              {report.map((r, i) => (
                <p key={i}>
                  <Boxicon name={r.pass ? "check" : "retry"} /> {r.message}
                </p>
              ))}
            </>
          ) : (
            <p className="cab-muted">{k.beforeRun}</p>
          )}
        </section>
      </div>
    </div>
  );
}
