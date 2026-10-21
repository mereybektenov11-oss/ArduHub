"use client";
import Link from "next/link";
import LessonPathV2 from "@/components/home/LessonPathV2";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
export default function HomeView() {
  const { progress: p } = useProgress();
  const next =
    lessons.find((l) => p.lessons[l.id]?.status === "current") ?? lessons[0];
  const chapter = Number(next.id.split("-")[1]) > 6 ? 1 : 0;
  const chapterLessons = lessons.slice(chapter * 6, chapter * 6 + 6);
  const done = chapterLessons.filter(
    (l) => p.lessons[l.id]?.status === "done",
  ).length;
  return (
    <Stagger className="cab-stack">
      <StaggerItem>
        <div>
          <p className="cab-eyebrow">ArduHub / {c.groups[0].items[0][0]}</p>
          <h1>{c.home}</h1>
          <p className="cab-muted">{c.intro}</p>
          <Link className="cab-text-link" href="/app/test">
            {c.diagnostic} ↗
          </Link>
          <Link className="cab-btn" href="/app/lessons">
            {c.allLessons}
          </Link>
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
            <Link className="cab-btn" href={`/app/lesson/${next.id}`}>
              {c.continue} →
            </Link>
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
                className={p.lessons[l.id]?.status === "done" ? "done" : ""}
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
