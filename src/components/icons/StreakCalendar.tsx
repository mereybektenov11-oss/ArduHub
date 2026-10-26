"use client";
import { useProgress } from "@/lib/useProgress";
import { localDate } from "@/domain/progress/streak";
import { dashboardRu as c } from "@/content/dashboard.ru";
import Icon from "./Icon";
import { buildStreakCalendar } from "@/domain/progress/streakCalendar";
export default function StreakCalendar() {
  const { progress: p } = useProgress();
  return (
    <div className="polish-calendar" aria-label={c.streak}>
      {buildStreakCalendar(p.streak).map((day, i) => {
        const date = new Date(day.date + "T12:00:00");
        const active = day.active;
        return (
          <div
            key={i}
            className={active ? "active" : ""}
            title={`${localDate(date)} · ${active ? c.completed : c.next}`}
          >
            <Icon
              name="streak"
              state={day.frozen ? "frozen" : active ? "active" : "none"}
            />
            <small>{date.toLocaleDateString("ru", { weekday: "short" })}</small>
          </div>
        );
      })}
    </div>
  );
}
