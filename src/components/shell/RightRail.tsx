"use client";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { kidsHomeRu as k } from "@/content/kids-home.ru";
import { useProgress } from "@/lib/useProgress";
import { streakCalendar } from "@/domain/progress/streakCalendar";
import { Card } from "@/components/cabinet/ui";
import { dailyState } from "@/domain/missions";
import { useState, useEffect } from "react";
import Icon from "@/components/icons/Icon";
import { streakVisualState } from "@/lib/streakState";
export { StatBar } from "@/components/shell/StatBar";
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
                <Icon
                  name={i === 0 ? "book" : i === 1 ? "xp" : "target"}
                  state={value >= max ? "done" : "idle"}
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
          <Icon
            name="streak"
            state={streakVisualState(p, now)}
            value={p.streak.count}
          />{" "}
          {k.streak}
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
              <span>
                <Icon
                  name="streak"
                  state={day.frozen ? "frozen" : day.active ? "active" : "none"}
                />
                <small>{day.day}</small>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
}
