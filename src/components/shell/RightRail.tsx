"use client";
import { levelFromXp, XP_THRESHOLDS } from "@/domain/progress/levels";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { kidsHomeRu as k } from "@/content/kids-home.ru";
import { useProgress } from "@/lib/useProgress";
import { activeStreak } from "@/domain/progress/streak";
import { streakCalendar } from "@/domain/progress/streakCalendar";
import { Card } from "@/components/cabinet/ui";
import { dailyState } from "@/domain/missions";
import { useState, useEffect } from "react";
import RewardIcon, { type RewardKind } from "@/components/icons/RewardIcon";
import AnimatedCount from "@/components/icons/AnimatedCount";

export function StatBar({ includeLevel = false }: { includeLevel?: boolean }) {
  const { progress: p } = useProgress();
  const level = levelFromXp(p.xp);
  const start = XP_THRESHOLDS[level - 1];
  const next = XP_THRESHOLDS[level];
  const fraction =
    next === undefined
      ? 1
      : Math.min(1, Math.max(0, (p.xp - start) / (next - start)));
  return (
    <div className={"dash-statbar " + (includeLevel ? "kids-stats" : "")}>
      {[
        [c.streak, activeStreak(p.streak), "flame"],
        [c.sparks, p.sparks, "spark"],
        [c.tokens, p.mentor.tokens, "token"],
      ].map(([label, value, icon]) => (
        <div
          role="group"
          key={label}
          title={label + ": " + value}
          aria-label={label + ": " + value}
        >
          <span
            className={"polish-stat-icon " + icon + (!value ? " inactive" : "")}
          >
            <RewardIcon kind={icon as RewardKind} />
          </span>
          <AnimatedCount value={Number(value)} />
          <small>{label}</small>
        </div>
      ))}
      {includeLevel && (
        <div
          className="kids-level-stat"
          role="group"
          aria-label={c.level + " " + level + ", " + k.xp(p.xp, next)}
        >
          <span className="kids-level-ring" title={k.xp(p.xp, next)}>
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle className="kids-ring-track" cx="22" cy="22" r="19" />
              <circle
                className="kids-ring-value"
                cx="22"
                cy="22"
                r="19"
                pathLength="100"
                strokeDasharray={fraction * 100 + " 100"}
              />
            </svg>
            <strong>{level}</strong>
          </span>
          <small>{c.level}</small>
        </div>
      )}
    </div>
  );
}
export default function RightRail() {
  const { progress: p } = useProgress();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const daily = dailyState(p, now);
  return (
    <aside className="dash-rail">
      <Card tour="missions">
        <h2>{k.missions}</h2>
        {c.missionTitles.map((title, i) => {
          const value =
            i === 0
              ? daily.lessonIds.length
              : i === 1
                ? daily.xp
                : daily.perfect
                  ? 1
                  : 0;
          const max = i === 1 ? 50 : 1;
          return (
            <div key={title} className="dash-mission">
              <span>
                <RewardIcon
                  kind={value >= max ? "check" : "mission"}
                  className="polish-mission-icon"
                />
                {title}
              </span>
              <progress
                aria-label={title}
                value={Math.min(value, max)}
                max={max}
              />
            </div>
          );
        })}
      </Card>
      <Card>
        <h2>
          <RewardIcon kind="flame" /> {k.streak}
        </h2>
        <div className="kids-streak-week">
          {streakCalendar(p.streak, now).map((day) => (
            <div
              key={day.date}
              className={
                "kids-streak-day" +
                (day.active ? " is-active" : "") +
                (day.today ? " is-today" : "")
              }
              aria-label={
                day.date + ": " + (day.active ? k.activeDay : k.emptyDay)
              }
            >
              <small>{k.weekdays[day.weekday]}</small>
              <span>{day.active ? <RewardIcon kind="check" /> : day.day}</span>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}
