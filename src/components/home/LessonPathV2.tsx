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
import { kidsHomeRu as k } from "@/content/kids-home.ru";
import CabinetIcon from "@/components/icons/NavigationIcon";
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
          {status === "done" ? (
            "✓"
          ) : status === "locked" ? (
            <CabinetIcon name="lock" />
          ) : (
            index + 1
          )}
        </button>
      </div>
      <div className="dash-node-title">
        <strong>{lesson.title}</strong>
        <small>{status === "done" ? c.completed : `+${lesson.xp} XP`}</small>
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
  const currentIndex = states.findIndex((state) => state.status === "current");
  const currentChapter = Math.floor(
    (currentIndex < 0 ? lessons.length - 1 : currentIndex) / 6,
  );
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
      {c.chapterNames.map((name, chapter) => {
        const chapterLessons = lessons.slice(chapter * 6, chapter * 6 + 6);
        const done = chapterLessons.filter(
          (lesson) =>
            states.find((state) => state.id === lesson.id)?.status === "done",
        ).length;
        return (
          <details
            className="kids-path-chapter"
            key={name}
            open={chapter === currentChapter}
          >
            <summary>
              <span>
                {c.chapter} {chapter + 1} · {name}
              </span>
              <small>{k.chapterProgress(done, chapterLessons.length)}</small>
            </summary>
            <div className="kids-path-nodes">
              {chapterLessons.map((lesson, offset) => {
                const index = chapter * 6 + offset;
                return (
                  <Node
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    status={states[index].status}
                    recent={recent === lesson.id}
                  />
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
