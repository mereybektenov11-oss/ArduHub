"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
export default function HomeView() {
  const { progress: p, notify } = useProgress();
  const router = useRouter();
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
        <div className="dash-path" data-tour="path">
          {lessons.map((l, i) => {
            const status = p.lessons[l.id]?.status ?? "locked";
            return (
              <div key={l.id}>
                {i % 6 === 0 && (
                  <h2>
                    {c.chapter} {Math.floor(i / 6) + 1} ·{" "}
                    {c.chapterNames[Math.floor(i / 6)]}
                  </h2>
                )}
                <div className="dash-node-row">
                  <button
                    className={`dash-node ${status}`}
                    aria-label={`${l.title} · ${status === "locked" ? c.locked : status === "done" ? c.completed : c.continue}`}
                    onClick={() => {
                      if (status === "locked") notify(c.locked);
                      else router.push(`/app/lesson/${l.id}`);
                    }}
                  >
                    {status === "done"
                      ? "✓"
                      : status === "locked"
                        ? "⊟"
                        : i + 1}
                  </button>
                  <div className="dash-node-title">
                    <strong>{l.title}</strong>
                    <small>
                      {status === "current"
                        ? `${c.continue} →`
                        : status === "done"
                          ? c.completed
                          : `+${l.xp} XP`}
                    </small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StaggerItem>
    </Stagger>
  );
}
