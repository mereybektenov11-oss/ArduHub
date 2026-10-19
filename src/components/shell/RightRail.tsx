"use client";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { useProgress } from "@/lib/useProgress";
import { activeStreak } from "@/domain/progress/streak";
import Link from "next/link";
import Leaderboard from "@/components/home/Leaderboard";
import { dailyFacts } from "@/content/dashboard.ru";
import { Card } from "@/components/cabinet/ui";
import { dailyState } from "@/domain/missions";
import { usePathname } from "next/navigation";
import Schedule from "@/components/cabinet/Schedule";
import { useState, useEffect } from "react";
export function StatBar() {
  const { progress: p } = useProgress();
  return (
    <div className="dash-statbar">
      {[
        [c.streak, activeStreak(p.streak), "↗"],
        [c.sparks, p.sparks, "◆"],
        [c.tokens, p.mentor.tokens, "ϟ"],
      ].map(([label, value, icon]) => (
        <div key={label}>
          <span aria-hidden="true">{icon}</span>
          <strong>{value}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
export default function RightRail() {
  const { progress: p } = useProgress();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const fact =
    dailyFacts[Math.floor(now.getTime() / 86400000) % dailyFacts.length];
  const daily = dailyState(p, now);
  return (
    <aside className="dash-rail">
      <StatBar />
      <Card tour="progress">
        <h2>
          {c.level} {p.profile.level + 1}
        </h2>
        <p>{p.xp} XP</p>
        <progress value={p.xp % 150} max={150} aria-label="XP" />
      </Card>
      <Card className="dash-fact">
        <div className="cab-row">
          <h2>{c.fact}</h2>
          <button
            className="cab-text-link"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {c.open}
          </button>
        </div>
        <p>{open ? fact : fact.split(" ").slice(0, 5).join(" ") + "…"}</p>
      </Card>
      <Card className="dash-pro">
        <h2>ArduHub Pro</h2>
        <p>{c.proNote}</p>
        <span className="cab-pill">{c.soon}</span>
      </Card>
      <Leaderboard compact />
      <Card tour="missions">
        <div className="cab-row">
          <h2>{c.missions}</h2>
          <Link href="/app/missions">↗</Link>
        </div>
        {c.missionTitles.map((title, i) => (
          <div key={title} className="dash-mission">
            <span>{title}</span>
            <progress
              aria-label={title}
              value={
                i === 0
                  ? daily.lessonIds.length
                  : i === 1
                    ? daily.xp
                    : daily.perfect
                      ? 1
                      : 0
              }
              max={i === 1 ? 50 : 1}
            />
          </div>
        ))}
      </Card>
      {path === "/app/lessons" && <Schedule />}
    </aside>
  );
}
