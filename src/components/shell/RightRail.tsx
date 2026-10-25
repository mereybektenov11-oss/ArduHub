"use client";
import { levelFromXp, XP_THRESHOLDS } from "@/domain/progress/levels";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { polishRu } from "@/content/ru";
import { useProgress } from "@/lib/useProgress";
import { activeStreak } from "@/domain/progress/streak";
import Link from "next/link";
import { Card } from "@/components/cabinet/ui";
import { dailyState } from "@/domain/missions";
import { useState, useEffect } from "react";
import RewardIcon, { type RewardKind } from "@/components/icons/RewardIcon";
import AnimatedCount from "@/components/icons/AnimatedCount";
import LevelBadge from "@/components/icons/LevelBadge";
export function StatBar() {
  const { progress: p } = useProgress();
  return (
    <div className="dash-statbar">
      {[
        [c.streak, activeStreak(p.streak), "flame"],
        [c.sparks, p.sparks, "spark"],
        [c.tokens, p.mentor.tokens, "token"],
      ].map(([label, value, icon]) => (
        <div
          role="group"
          key={label}
          tabIndex={0}
          title={`${label}: ${value}`}
          aria-label={`${label}: ${value}`}
          aria-describedby={`stat-${icon}`}
        >
          <span
            className={`polish-stat-icon ${icon} ${!value ? "inactive" : ""}`}
          >
            <RewardIcon kind={icon as RewardKind} />
          </span>
          <AnimatedCount value={Number(value)} />
          <small>{label}</small>
          <span
            className="polish-stat-tooltip"
            role="tooltip"
            id={`stat-${icon}`}
          >
            {label}: {value}
          </span>
        </div>
      ))}
    </div>
  );
}
export default function RightRail() {
  const { progress: p } = useProgress();
  const level = levelFromXp(p.xp);
  const start = XP_THRESHOLDS[level - 1];
  const next = XP_THRESHOLDS[level];
  const levelProgress = next === undefined ? 1 : p.xp - start;
  const levelTarget = next === undefined ? 1 : next - start;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const daily = dailyState(p, now);
  return (
    <aside className="dash-rail">
      <StatBar />
      <Card tour="progress">
        <h2>
          <LevelBadge value={level} />
          {c.level} {level}
        </h2>
        <p>
          <RewardIcon kind="xp" /> {p.xp} XP
        </p>
        <progress
          value={levelProgress}
          max={levelTarget}
          aria-label={next === undefined ? c.maxLevel : c.nextLevel}
        />
        <small>
          {next === undefined
            ? c.maxLevel
            : `${c.nextLevel}: ${next - p.xp} XP`}
        </small>
      </Card>
      <Card tour="missions">
        <div className="cab-row">
          <h2>{c.missions}</h2>
          <Link href="/app/missions">{polishRu.allMissions}</Link>
        </div>
        {c.missionTitles.map((title, i) => (
          <div key={title} className="dash-mission">
            <span>
              <RewardIcon
                kind={
                  (
                    i === 0
                      ? daily.lessonIds.length >= 1
                      : i === 1
                        ? daily.xp >= 50
                        : daily.perfect
                  )
                    ? "check"
                    : "mission"
                }
                className="polish-mission-icon"
              />{" "}
              {title}
            </span>
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
    </aside>
  );
}
