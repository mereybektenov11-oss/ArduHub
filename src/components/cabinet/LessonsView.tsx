"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { lessons, topicNames } from "@/domain/seed";
import { computeCourseState } from "@/domain/progress/courseState";
import { useProgress } from "@/lib/useProgress";
import { lessonsCopy as c } from "@/content/cabinet.ru";
import { Card, Pill, Tabs } from "./ui";
import { learningRu } from "@arduhub/curriculum/learning.ru";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
export default function LessonsView() {
  const { progress: p, notify } = useProgress(),
    router = useRouter();
  const [filter, setFilter] = useState("all");
  const states = Object.fromEntries(
    computeCourseState(lessons, p).map((s) => [s.id, s.status]),
  );
  const visible = lessons.filter(
    (l) => filter === "all" || states[l.id] === filter,
  );
  return (
    <div className="cab-stack">
      <div>
        <p className="cab-eyebrow">{uiCopy.text031}</p>
        <h1>{c.title}</h1>
        <p className="cab-lead">{c.intro}</p>
      </div>
      <div className="cab-row">
        <Tabs
          label={c.filter}
          items={[
            { id: "all", title: c.all },
            { id: "current", title: c.current },
            { id: "done", title: c.done },
            { id: "locked", title: c.locked },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Pill>
          {visible.length} {c.count}
        </Pill>
      </div>
      <div className="cab-stack">
        {visible.map((l) => (
          <Card key={l.id} className={`cab-lesson-list-row ${states[l.id]}`}>
            <span className="cab-list-number">
              {String(lessons.indexOf(l) + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{l.title}</h2>
              {!learningLessons.find((lesson) => lesson.id === l.id)
                ?.available && <Pill>{learningRu.prepare}</Pill>}
              <p className="cab-small cab-muted">
                {topicNames[l.topic]} · {c.level} {l.levelId} · +{l.xp} XP
              </p>
            </div>
            <Pill>{c.status[states[l.id]]}</Pill>
            <button
              className="cab-btn cab-btn-secondary"
              onClick={() =>
                states[l.id] !== "locked"
                  ? router.push(`/app/lesson/${l.id}`)
                  : notify(c.lockedNote)
              }
              aria-label={`${c.open}: ${l.title}`}
            >
              {states[l.id] === "done" ? "↺" : "→"}
            </button>
          </Card>
        ))}
      </div>
      {!visible.length && <Card>{c.empty}</Card>}
    </div>
  );
}
