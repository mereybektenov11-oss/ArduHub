"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { Card, Pill } from "./ui";
import { scheduleCopy as c } from "@/content/cabinet.ru";
export default function Schedule() {
  return (
    <Card tour="schedule">
      <div className="cab-row">
        <h2>{c.title}</h2>
        <Pill>{c.demo}</Pill>
      </div>
      <p className="cab-small cab-muted">{c.week}</p>
      <div className="cab-schedule-week">
        {c.days.map((d, i) => (
          <span key={d} className={i === 4 ? "is-today" : ""}>
            {d}
            <b>{12 + i}</b>
          </span>
        ))}
      </div>
      <div className="cab-schedule-item">
        <span>
          16
          <br />
          <small>{uiCopy.text041}</small>
        </span>
        <div>
          <strong>{c.lesson}</strong>
          <small>16:00 — 16:45 · {c.club}</small>
        </div>
      </div>
      <div className="cab-schedule-item">
        <span>
          19
          <br />
          <small>{uiCopy.text042}</small>
        </span>
        <div>
          <strong>{c.nextLesson}</strong>
          <small>16:00 — 16:45 · {c.club}</small>
        </div>
      </div>
      <p className="cab-small cab-muted">{c.note}</p>
    </Card>
  );
}
