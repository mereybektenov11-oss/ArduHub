"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { computeCourseState } from "@/domain/progress/courseState";
import LessonPathV2 from "@/components/home/LessonPathV2";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { kidsHomeRu as k } from "@/content/kids-home.ru";
import { StatBar } from "@/components/shell/RightRail";
import { lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";

export default function HomeView() {
  const { progress: p, ready } = useProgress();
  const course = computeCourseState(lessons, p);
  const nextIndex = course.findIndex((state) => state.status === "current");
  const next = lessons[nextIndex];
  const chapter = Math.floor(
    (nextIndex < 0 ? lessons.length - 1 : nextIndex) / 6,
  );
  const chapterLessons = lessons.slice(chapter * 6, chapter * 6 + 6);
  const done = chapterLessons.filter(
    (lesson) =>
      course.find((state) => state.id === lesson.id)?.status === "done",
  ).length;
  const [diagnostic, setDiagnostic] = useState(false);
  const diagnosticKey =
    "arduhub.diagnostic-invite." + (p.account?.userId ?? "local");
  useEffect(() => {
    if (!ready || p.diagnostic.status === "done") return;
    const frame = requestAnimationFrame(() => {
      try {
        setDiagnostic(localStorage.getItem(diagnosticKey) !== "dismissed");
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, p.diagnostic.status, diagnosticKey]);
  return (
    <Stagger eager className="cab-stack kids-home">
      <StaggerItem>
        <header className="kids-greeting" data-home-block="greeting">
          <h1>{k.greeting(p.profile.name)}</h1>
          <StatBar includeLevel />
        </header>
      </StaggerItem>
      <StaggerItem>
        <section
          className="dash-chapter kids-continue"
          data-home-block="continue"
          data-tour="chapter"
        >
          <p className="cab-eyebrow">
            {c.chapter} {chapter + 1} · {c.chapterNames[chapter]}
          </p>
          <h2>
            {next ? k.continueLesson(nextIndex + 1, next.title) : k.finished}
          </h2>
          <div className="cab-row">
            <span>{k.chapterProgress(done, chapterLessons.length)}</span>
            {next && (
              <Link className="cab-btn" href={"/app/lesson/" + next.id}>
                {c.continue}
              </Link>
            )}
          </div>
          <div
            className="dash-segments"
            role="progressbar"
            aria-label={c.completed}
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={chapterLessons.length}
          >
            {chapterLessons.map((lesson) => (
              <span
                className={
                  course.find((state) => state.id === lesson.id)?.status ===
                  "done"
                    ? "done"
                    : ""
                }
                key={lesson.id}
              />
            ))}
          </div>
        </section>
      </StaggerItem>
      <StaggerItem>
        <div data-home-block="path">
          <LessonPathV2 />
        </div>
      </StaggerItem>
      {diagnostic && p.diagnostic.status !== "done" && (
        <section className="cab-card kids-diagnostic">
          <button
            className="cab-icon-btn"
            aria-label={k.close}
            onClick={() => {
              setDiagnostic(false);
              try {
                localStorage.setItem(diagnosticKey, "dismissed");
              } catch {}
            }}
          >
            ×
          </button>
          <h2>{k.diagnosticTitle}</h2>
          <p>{k.diagnosticText}</p>
          <Link className="cab-btn secondary" href="/app/test">
            {k.diagnosticStart}
          </Link>
        </section>
      )}
    </Stagger>
  );
}
