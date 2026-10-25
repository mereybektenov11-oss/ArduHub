"use client";
import Link from "next/link";
import { onboardingRu } from "@/content/ru";
import { computeCourseState } from "@/domain/progress/courseState";
import LessonPathV2 from "@/components/home/LessonPathV2";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
export default function HomeView() {
  const { progress: p } = useProgress();
  const course = computeCourseState(lessons, p);
  const next = lessons.find(
    (lesson) =>
      course.find((state) => state.id === lesson.id)?.status === "current",
  );
  const chapter = next && Number(next.id.split("-")[1]) > 6 ? 1 : 0;
  const chapterLessons = lessons.slice(chapter * 6, chapter * 6 + 6);
  const done = chapterLessons.filter(
    (lesson) =>
      course.find((state) => state.id === lesson.id)?.status === "done",
  ).length;
  return (
    <Stagger className="cab-stack">
      <StaggerItem>
        <div>
          <h1>
            {onboardingRu.greeting}, {p.profile.name}!
          </h1>
        </div>
      </StaggerItem>
      <StaggerItem>
        <section className="dash-chapter" data-tour="chapter">
          <p className="cab-eyebrow">
            {c.chapter} {chapter + 1}
          </p>
          <h2>{c.chapterNames[chapter]}</h2>
          <div className="cab-row">
            <span>
              {done} / {chapterLessons.length}
            </span>
            {next && (
              <Link className="cab-btn" href={`/app/lesson/${next.id}`}>
                {c.continue} →
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
            {chapterLessons.map((l) => (
              <span
                className={
                  course.find((state) => state.id === l.id)?.status === "done"
                    ? "done"
                    : ""
                }
                key={l.id}
              />
            ))}
          </div>
        </section>
      </StaggerItem>
      <StaggerItem>
        <LessonPathV2 />
      </StaggerItem>
    </Stagger>
  );
}
