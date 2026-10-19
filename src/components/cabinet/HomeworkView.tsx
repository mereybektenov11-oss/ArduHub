"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useState } from "react";
import { homework, lessons } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { homeworkStatus } from "@/domain/homework";
import { homeworkCopy as c } from "@/content/cabinet.ru";
import { Action, Card, Pill, ProgressBar, Modal } from "./ui";
import Schedule from "./Schedule";
export default function HomeworkView() {
  const { progress: p } = useProgress();
  const [opened, setOpened] = useState<string | null>(null);
  const selected = homework.find((h) => h.id === opened);
  return (
    <div className="cab-stack">
      <div>
        <p className="cab-eyebrow">{uiCopy.text030}</p>
        <h1>{c.title}</h1>
        <p className="cab-lead">{c.demoNote}</p>
      </div>
      <div className="cab-home-grid">
        <div className="cab-stack">
          {homework.map((hw) => {
            const status = homeworkStatus(hw, p),
              done = hw.lessonIds.filter(
                (id) => p.lessons[id].status === "done",
              ).length;
            return (
              <Card key={hw.id}>
                <div className="cab-row">
                  <Pill>{c.teacher}</Pill>
                  <Pill>{c.status[status]}</Pill>
                </div>
                <h2 className="cab-reading">{hw.title}</h2>
                <div className="cab-row cab-reading">
                  <span className="cab-small cab-muted">
                    {c.due}{" "}
                    {new Date(`${hw.dueDate}T12:00:00`).toLocaleDateString(
                      "ru-RU",
                    )}
                  </span>
                  <span className="cab-small">
                    {done} / {hw.lessonIds.length}
                  </span>
                </div>
                <ProgressBar
                  value={(done / hw.lessonIds.length) * 100}
                  label={hw.title}
                />
                <div className="cab-reading">
                  <Action secondary onClick={() => setOpened(hw.id)}>
                    {c.open} ↗
                  </Action>
                </div>
              </Card>
            );
          })}
        </div>
        <Schedule />
      </div>
      {selected && (
        <Modal title={selected.title} onClose={() => setOpened(null)}>
          <p>{c.assignment}</p>
          {selected.lessonIds.map((id) => (
            <Action key={id} href={`/app/lesson/${id}`}>
              {lessons.find((l) => l.id === id)!.title} →
            </Action>
          ))}
        </Modal>
      )}
    </div>
  );
}
