// 2D learning inside the app (D2). The lesson itself is the site's tested
// LearningLesson component, run through the next/* shims; the lesson map is
// the app's own screen in the «Ночная лаборатория» style.
import type { CSSProperties, ReactNode } from "react";
import { ProgressProvider, useProgress } from "@/lib/useProgress";
import LearningLesson from "@/components/lesson/LearningLesson";
import { lessons } from "@/domain/seed";
import { computeCourseState } from "@/domain/progress/courseState";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { navigate } from "../router";
import { learningT as t } from "./content";
import { learningCss } from "./site-styles";

export default function LearningArea(props: { lessonId?: string }) {
  return (
    <ProgressProvider>
      <style data-learning-styles>{learningCss}</style>
      <div className="learning-area">
        {props.lessonId ? (
          <LessonFrame>
            <LearningLesson key={props.lessonId} id={props.lessonId} />
          </LessonFrame>
        ) : (
          <LessonMap />
        )}
      </div>
    </ProgressProvider>
  );
}

// Same wrappers the site's DashboardShell puts around a lesson in focus mode;
// the lesson layout CSS is written against them.
function LessonFrame({ children }: { children: ReactNode }) {
  const { progress } = useProgress();
  return (
    <div
      className="cabinet dash-shell dash-focus"
      style={
        { "--lesson-scale": progress.settings?.textScale ?? 1 } as CSSProperties
      }
    >
      <div className="dash-page">
        <div className="dash-columns">
          <main className="cab-main" id="cab-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function LessonMap() {
  const { progress } = useProgress();
  const states = Object.fromEntries(
    computeCourseState(lessons, progress).map((s) => [s.id, s.status]),
  );
  const done = lessons.filter((l) => states[l.id] === "done").length;

  return (
    <div className="app lesson-map">
      <header className="top">
        <button
          type="button"
          className="chip"
          onClick={() => navigate("/menu")}
        >
          {t.back}
        </button>
        <div className="spacer" />
        <span className="chip">{t.progress(done, lessons.length)}</span>
      </header>
      <div>
        <span className="tag">{t.eyebrow}</span>
        <h1 className="map-title">{t.title}</h1>
      </div>
      <ol className="map-grid">
        {lessons.map((l, i) => {
          const state = states[l.id] ?? "locked";
          const ready =
            learningLessons.find((x) => x.id === l.id)?.available !== false;
          const open = state !== "locked" && ready;
          return (
            <li key={l.id}>
              <button
                type="button"
                className={`card map-card ${state}`}
                disabled={!open}
                aria-label={`${t.lesson} ${i + 1}: ${l.title}. ${t.status[state as keyof typeof t.status] ?? ""}`}
                onClick={() => navigate(`/app/lesson/${l.id}`)}
              >
                <span
                  className={`node ${state === "done" ? "done" : state === "current" ? "current" : ""}`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className="tile-body">
                  <strong className="map-name">{l.title}</strong>
                  <span className="muted small">
                    {t.lesson} {i + 1} ·{" "}
                    {ready
                      ? t.status[state as keyof typeof t.status]
                      : t.preparing}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="card map-premium">
        <span className="node">🔒</span>
        <div className="tile-body">
          <strong className="map-name">{t.premium}</strong>
          <span className="muted small">{t.premiumHint}</span>
        </div>
      </div>
    </div>
  );
}
