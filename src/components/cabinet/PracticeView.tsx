"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useState } from "react";
import { games, topicNames } from "@/domain/seed";
import { topics } from "@/domain/types";
import { useProgress } from "@/lib/useProgress";
import { errorCopy } from "@/domain/checker/errors.ru";
import type { ErrorCode } from "@/domain/types";
import { practiceCopy as c, materialDeck } from "@/content/cabinet.ru";
import {
  Action,
  Card,
  GradientCard,
  Tabs,
  HorizontalShelf,
  Modal,
  Pill,
} from "./ui";
export default function PracticeView({ review = false }: { review?: boolean }) {
  const [level, setLevel] = useState("all"),
    [topic, setTopic] = useState("all"),
    [material, setMaterial] = useState<number | null>(null);
  const { progress: p, update } = useProgress();
  const visible = games.filter(
    (g) =>
      (level === "all" ||
        (+level >= g.levelRange[0] && +level <= g.levelRange[1])) &&
      (topic === "all" || g.topic === topic),
  );
  return (
    <div className="cab-stack">
      <div className="cab-row">
        <div>
          <p className="cab-eyebrow">{uiCopy.text039}</p>
          <h1>{c.title}</h1>
          <p className="cab-lead">{c.intro}</p>
        </div>
        <Pill>
          {p.reviewQueue.length} {c.review}
        </Pill>
      </div>
      {review && (
        <Card>
          <h2>{c.reviewTitle}</h2>
          <p className="cab-reading cab-muted">
            {p.reviewQueue.length ? c.reviewNote : c.reviewEmpty}
          </p>
          <div className="cab-stack">
            {p.reviewQueue.slice(0, 6).map((e, i) => (
              <div className="cab-forgotten" key={`${e.addedAt}-${i}`}>
                <h3>
                  {Object.hasOwn(errorCopy, e.errorCode)
                    ? errorCopy[e.errorCode as ErrorCode][0]
                    : c.reviewTitle}
                </h3>
                <p className="cab-reading">
                  {Object.hasOwn(errorCopy, e.errorCode)
                    ? errorCopy[e.errorCode as ErrorCode][2]
                    : c.reviewMatch}
                </p>
                <Action
                  secondary
                  onClick={() =>
                    update((prev) => ({
                      ...prev,
                      reviewQueue: prev.reviewQueue.filter((_, n) => n !== i),
                    }))
                  }
                >
                  {c.reviewDone}
                </Action>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="cab-topic-picks" data-tour="topics">
        {topics.slice(0, 4).map((t, i) => (
          <button
            key={t}
            aria-pressed={topic === t}
            onClick={() => setTopic(topic === t ? "all" : t)}
          >
            <span aria-hidden="true">{["↯", "⊙", "⌁", "⚙"][i]}</span>
            <strong>{topicNames[t]}</strong>
            <small>{c.topicNote}</small>
          </button>
        ))}
      </div>
      <div className="cab-row">
        <h2>{c.games}</h2>
        <Tabs
          label={c.levelFilter}
          items={[
            { id: "all", title: uiCopy.text040 },
            ...[0, 1, 2, 3, 4].map((n) => ({
              id: String(n),
              title: String(n),
            })),
          ]}
          value={level}
          onChange={setLevel}
        />
      </div>
      <div className="cab-grid-3" data-tour="games">
        {visible.map((g, i) => (
          <GradientCard
            key={g.id}
            tone={(["forest", "amber", "sea"] as const)[i % 3]}
          >
            <span className="cab-small">{c.gameNotes[g.kind]}</span>
            <h2>{g.title}</h2>
            <p className="cab-small">{c.gameDescriptions[g.kind]}</p>
            <Action href={`/app/practice/${g.id}`}>{c.play} →</Action>
          </GradientCard>
        ))}
      </div>
      {!visible.length && (
        <Card>
          <p>{c.noGames}</p>
          <Action
            secondary
            onClick={() => {
              setTopic("all");
              setLevel("all");
            }}
          >
            {c.reset}
          </Action>
        </Card>
      )}
      {[0, 1].map((shelf) => (
        <HorizontalShelf
          key={shelf}
          title={shelf === 0 ? c.errors : c.projects}
        >
          {materialDeck
            .map((m, i) => ({ m, i }))
            .filter(
              ({ m }) =>
                m.shelf === shelf && (level === "all" || m.level <= +level),
            )
            .map(({ m, i }) => (
              <button
                className="cab-material"
                key={i}
                onClick={() => setMaterial(i)}
              >
                <div aria-hidden="true">{m.symbol}</div>
                <span className="cab-small cab-muted">
                  {c.material} · {c.level} {m.level}
                </span>
                <h3>{m.title}</h3>
                <span className="cab-text-link">{c.read} ↗</span>
              </button>
            ))}
        </HorizontalShelf>
      ))}
      {material !== null && (
        <Modal
          title={materialDeck[material].title}
          onClose={() => setMaterial(null)}
        >
          <p>{materialDeck[material].text}</p>
          <Action href="/app/lesson/lesson-1">{c.try}</Action>
        </Modal>
      )}
    </div>
  );
}
