"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { lessons } from "@/domain/seed";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { useProgress } from "@/lib/useProgress";
import { prefetchLesson } from "@/lib/useLessonData";
import type { Lesson } from "@/domain/types";
import NodePopover from "./NodePopover";
import CurrentNodeLabel from "./CurrentNodeLabel";
import { motionTokens } from "@/lib/motion";
import { computeCourseState } from "@/domain/progress/courseState";
function Node({
  lesson,
  index,
  status,
  recent,
}: {
  lesson: Lesson;
  index: number;
  status: string;
  recent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();
  const close = useCallback(() => setOpen(false), []);
  const cancel = () => clearTimeout(timer.current);
  const warm = () => {
    cancel();
    if (status !== "locked")
      timer.current = setTimeout(() => {
        void prefetchLesson(lesson.id).catch(() => {});
        router.prefetch(`/app/lesson/${lesson.id}`);
      }, motionTokens.lessonFlow.prefetch);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div
      className={`dash-node-row flow-node-row ${status} ${recent ? "flow-recent-completion" : ""}`}
    >
      <div className="flow-node-anchor">
        {status === "current" && <CurrentNodeLabel />}
        <button
          ref={anchor}
          className={`dash-node ${status}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`${lesson.title} · ${status === "locked" ? c.locked : status === "done" ? c.completed : c.continue}`}
          onMouseEnter={warm}
          onMouseLeave={cancel}
          onFocus={warm}
          onBlur={cancel}
          onClick={() => setOpen((v) => !v)}
        >
          {status === "done" ? "✓" : status === "locked" ? "⊟" : index + 1}
        </button>
      </div>
      <div className="dash-node-title">
        <strong>{lesson.title}</strong>
        <small>
          {status === "current"
            ? `${c.continue} →`
            : status === "done"
              ? c.completed
              : `+${lesson.xp} XP`}
        </small>
      </div>
      {open && (
        <NodePopover
          lesson={lesson}
          index={index}
          status={status}
          anchor={anchor}
          onClose={close}
        />
      )}
    </div>
  );
}
export default function LessonPathV2() {
  const { progress: p } = useProgress();
  const states = computeCourseState(lessons, p);
  const [recent, setRecent] = useState<string | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setRecent(sessionStorage.getItem("arduhub.lesson.completed"));
        sessionStorage.removeItem("arduhub.lesson.completed");
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="dash-path" data-tour="path">
      {lessons.map((l, i) => (
        <div key={l.id}>
          {i % 6 === 0 && (
            <h2>
              {c.chapter} {Math.floor(i / 6) + 1} ·{" "}
              {c.chapterNames[Math.floor(i / 6)]}
            </h2>
          )}
          <Node
            lesson={l}
            index={i}
            status={states[i].status}
            recent={recent === l.id}
          />
        </div>
      ))}
    </div>
  );
}
