"use client";
import Link from "next/link";
import { TextureButton } from "@/components/ui/texture-button";
import { profileRu as c } from "@/content/ru";
import { useProgress } from "@/lib/useProgress";
import { activeStreak } from "@/domain/progress/streak";
export default function Page() {
  const { progress: p } = useProgress();
  const completed = Object.values(p.lessons).filter(
    (lesson) => lesson.status === "done",
  ).length;
  return (
    <section className="profile-content">
      <div className="profile-account">
        <p className="profile-eyebrow">{c.workspace}</p>
        <h1>{c.progress}</h1>
        <p className="profile-subtitle">{c.progressHint}</p>
      </div>
      <dl className="profile-metrics">
        {[
          [c.completed, completed],
          [c.xp, p.xp],
          [c.streak, activeStreak(p.streak)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {!completed && <p className="profile-subtitle">{c.progressEmpty}</p>}
      <div>
        <TextureButton asChild variant="secondary">
          <Link href="/app/lessons">
            {c.continue}
            <span aria-hidden="true">↗</span>
          </Link>
        </TextureButton>
      </div>
    </section>
  );
}
