"use client";
import "@/styles/h-stats.css";
import { levelFromXp, XP_THRESHOLDS } from "@/domain/progress/levels";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { kidsHomeRu as k } from "@/content/kids-home.ru";
import { useProgress } from "@/lib/useProgress";
import { activeStreak } from "@/domain/progress/streak";
import AnimatedCount from "@/components/icons/AnimatedCount";
import ValueIcon from "@/components/icons/ValueIcon";
import StreakIcon from "@/components/icons/StreakIcon";

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
          data-reward-target={
            icon === "spark" ? "sparks" : icon === "token" ? "tokens" : "streak"
          }
        >
          <span
            className={"polish-stat-icon " + icon + (!value ? " inactive" : "")}
          >
            {icon === "flame" ? (
              <StreakIcon />
            ) : (
              <ValueIcon
                name={icon === "spark" ? "sparks" : "tokens"}
                value={Number(value)}
              />
            )}
          </span>
          {includeLevel ? (
            <div className="kids-stat-copy">
              <AnimatedCount value={Number(value)} />
              <small>{label}</small>
            </div>
          ) : (
            <>
              <AnimatedCount value={Number(value)} />
              <small>{label}</small>
            </>
          )}
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

export default StatBar;
