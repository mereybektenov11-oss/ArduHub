"use client";
import { useProgress } from "@/lib/useProgress";
import { localDate } from "@/domain/progress/streak";
import { dashboardRu as c } from "@/content/dashboard.ru";
import RewardIcon from "./RewardIcon";
export default function StreakCalendar() {
  const { progress: p } = useProgress();
  const last = p.streak.lastActiveDate
    ? new Date(p.streak.lastActiveDate + "T12:00:00").getTime()
    : 0;
  return (
    <div className="polish-calendar" aria-label={c.streak}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - 6 + i);
        const distance = Math.round((last - date.getTime()) / 86400000);
        const active = distance >= 0 && distance < p.streak.count;
        return (
          <div
            key={i}
            className={active ? "active" : ""}
            title={`${localDate(date)} · ${active ? c.completed : c.next}`}
          >
            <RewardIcon kind="flame" />
            <small>{date.toLocaleDateString("ru", { weekday: "short" })}</small>
          </div>
        );
      })}
    </div>
  );
}
