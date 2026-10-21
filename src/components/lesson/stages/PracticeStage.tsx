"use client";
import { useEffect, useState, type ReactNode } from "react";
import { lessonFlowRu as c } from "@/content/ru";
import type { LearningLesson } from "@/domain/lessons/content";
import type { LessonFlowState } from "@/domain/lessons/flow";
import { Action, Card, Pill } from "@/components/cabinet/ui";
import RewardIcon from "@/components/icons/RewardIcon";
export default function PracticeStage({
  lesson,
  flow,
  expected,
  children,
  onExplain,
  onTheory,
  onHint,
  hint,
  notice,
  errors,
  report,
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
}) {
  const [showTask, setShowTask] = useState(false),
    [expectedOutput, setExpectedOutput] = useState(false);
  const errorKey = errors.map((e) => e.message).join("|");
  useEffect(() => {
    if (!errorKey) return;
    const frame = requestAnimationFrame(() => setShowTask(true));
    return () => cancelAnimationFrame(frame);
  }, [errorKey]);
  return (
    <div className="flow-practice">
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
          <Pill>{c.difficulty}</Pill>
          <h1>{lesson.title}</h1>
          <p>{lesson.task}</p>
          <div className="dash-guide-actions">
            <Action secondary onClick={onExplain}>
              {c.explain}
            </Action>
            <Action secondary onClick={onTheory}>
              {c.theory}
            </Action>
          </div>
          <section className="dash-expected">
            <h2>{c.expected}</h2>
            <p>{expected}</p>
          </section>
          <ol className="flow-checklist">
            {(["circuit", "code", "run"] as const).map((key, i) => (
              <li key={key} className={flow.practice[key] ? "is-done" : ""}>
                <RewardIcon kind={flow.practice[key] ? "check" : "mission"} />
                <span>{c.checklist[i]}</span>
                <span className="sr-only">
                  {flow.practice[key] ? c.correct : ""}
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <Action secondary onClick={onHint}>
            {c.hint}
          </Action>
          {hint}
        </Card>
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
          ) : report.length ? (
            report.map((r, i) => (
              <p key={i}>
                {r.pass ? "✓" : "↻"} {r.message}
              </p>
            ))
          ) : (
            <p className="cab-muted">{c.checklist[2]}</p>
          )}
        </section>
      </div>
    </div>
  );
}
