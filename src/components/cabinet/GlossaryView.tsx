"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useState, useEffect } from "react";
import { terms, topicNames } from "@/domain/seed";
import { topics } from "@/domain/types";
import { forgottenTerms } from "@/domain/review";
import { useProgress } from "@/lib/useProgress";
import { glossaryCopy as c } from "@/content/cabinet.ru";
import { Card, Action, Tabs, Pill } from "./ui";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
export default function GlossaryView() {
  const { progress: p, update } = useProgress();
  const [search, setSearch] = useState(""),
    [level, setLevel] = useState("all"),
    [topic, setTopic] = useState("all"),
    [tab, setTab] = useState("all");
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setSearch(new URLSearchParams(location.search).get("term") ?? ""),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  const forgotten = forgottenTerms(p);
  const visible = terms.filter(
    (t) =>
      (!search ||
        `${t.title} ${t.description}`
          .toLocaleLowerCase("ru")
          .includes(search.toLocaleLowerCase("ru"))) &&
      (level === "all" || t.level === +level) &&
      (topic === "all" || t.topic === topic) &&
      (tab === "all" || p.collection.includes(t.id)),
  );
  return (
    <div className="cab-stack">
      <div>
        <p className="cab-eyebrow">{uiCopy.text023}</p>
        <h1>{c.title}</h1>
        <p className="cab-lead">{c.intro}</p>
      </div>
      <Card>
        <div className="cab-row">
          <h2>{c.forgotten}</h2>
          <Pill>{c.fromMistakes}</Pill>
        </div>
        {!forgotten.length ? (
          <p className="cab-reading cab-muted">{c.noMistakes}</p>
        ) : (
          <div className="cab-grid-3">
            {forgotten.map(({ term, count }) => (
              <div key={term.id} className="cab-forgotten">
                <strong>{term.title}</strong>
                <p className="cab-small">{term.description}</p>
                <small>
                  {count} {c.repeatCount}
                </small>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="cab-glossary-filters">
        <label className="cab-search">
          <span>{c.search}</span>
          <input
            type="search"
            placeholder={c.placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Tabs
          label={c.level}
          items={[
            { id: "all", title: c.allLevels },
            ...[0, 1, 2, 3, 4].map((n) => ({
              id: String(n),
              title: `${c.level} ${n}`,
            })),
          ]}
          value={level}
          onChange={setLevel}
        />
        <Tabs
          label={c.topic}
          items={[
            { id: "all", title: c.allTopics },
            ...topics.map((t) => ({ id: t, title: topicNames[t] })),
          ]}
          value={topic}
          onChange={setTopic}
        />
      </div>
      <div className="cab-row">
        <Tabs
          label={c.collection}
          items={[
            { id: "all", title: c.allTerms },
            {
              id: "collection",
              title: `${c.collection} · ${p.collection.length}`,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <span className="cab-small cab-muted" role="status">
          {c.found}: {visible.length}
        </span>
      </div>
      <Stagger className="cab-term-grid">
        {visible.map((t) => (
          <StaggerItem key={t.id}>
            <Card className="cab-term">
              <div className="cab-row">
                <span className="cab-term-symbol" aria-hidden="true">
                  {t.symbolSvg}
                </span>
                <Pill>
                  {c.level} {t.level}
                </Pill>
              </div>
              <h2>{t.title}</h2>
              <p>{t.description}</p>
              <Action
                secondary
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    collection: prev.collection.includes(t.id)
                      ? prev.collection.filter((id) => id !== t.id)
                      : [...prev.collection, t.id],
                  }))
                }
              >
                {p.collection.includes(t.id) ? c.remove : c.save}
              </Action>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
      {!visible.length && (
        <Card>
          <h2>{c.empty}</h2>
          <p>{c.emptyNote}</p>
          <Action
            secondary
            onClick={() => {
              setSearch("");
              setLevel("all");
              setTopic("all");
              setTab("all");
            }}
          >
            {c.reset}
          </Action>
        </Card>
      )}
    </div>
  );
}
