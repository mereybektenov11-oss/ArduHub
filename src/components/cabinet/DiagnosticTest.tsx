"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { answerDiagnostic } from "@/domain/diagnostic";
import { diagnosticDeck, diagnosticCopy as c } from "@/content/cabinet.ru";
import { topicNames } from "@/domain/seed";
import { topics } from "@/domain/types";
import { Card, Action, Pill, ProgressBar, SkillBar } from "./ui";
import PinDiagram from "./PinDiagram";
import Reveal from "../ui/Reveal";
export default function DiagnosticTest() {
  const { progress: p, update, ready } = useProgress();
  const [selected, setSelected] = useState<number | null>(null);
  if (!ready) return <p>{uiCopy.text017}</p>;
  if (p.diagnostic.status === "done")
    return (
      <Reveal className="cab-stack">
        <Pill>{uiCopy.text018}</Pill>
        <h1>{c.result}</h1>
        <Card>
          <h2>
            {uiCopy.text019} {p.profile.level}
            {p.profile.level}
          </h2>
          <p className="cab-lead">{c.resultNote}</p>
          {topics.map((t) => (
            <SkillBar
              key={t}
              title={topicNames[t]}
              value={p.diagnostic.skillScores[t]}
            />
          ))}
          <Action href="/app/map">{c.map} →</Action>
        </Card>
      </Reveal>
    );
  const i = p.diagnostic.answers.length,
    q = diagnosticDeck[i];
  return (
    <div className="cab-stack cab-test">
      <div>
        <p className="cab-eyebrow">{uiCopy.text020}</p>
        <h1>{c.title}</h1>
        <p className="cab-lead">{c.intro}</p>
      </div>
      <div className="cab-row">
        <Pill>
          {c.question} {i + 1} {uiCopy.text021}
        </Pill>
        <Action secondary href="/app">
          {c.leave}
        </Action>
      </div>
      <ProgressBar label={uiCopy.text022} value={(i / 8) * 100} />
      {i > 0 && <p className="cab-muted cab-small">{c.resume}</p>}
      <Card>
        <div className="cab-stack">
          <h2>{q.question}</h2>
          {"diagram" in q && (
            <div className="cab-diagnostic-diagram" aria-label={c.diagram}>
              <PinDiagram
                kind={i === 6 ? "wrongpin" : i === 7 ? "sensor" : "led"}
                options={q.options}
                selected={selected}
                onSelect={setSelected}
              />
            </div>
          )}
          {!("diagram" in q) && (
            <div className="cab-answer-list">
              {q.options.map((v, n) => (
                <button
                  key={v}
                  aria-pressed={selected === n}
                  onClick={() => setSelected(n)}
                >
                  <span>{String.fromCharCode(65 + n)}</span>
                  {v}
                </button>
              ))}
            </div>
          )}
          <Action
            disabled={selected === null}
            onClick={() => {
              if (selected !== null) {
                update((prev) => answerDiagnostic(prev, selected));
                setSelected(null);
              }
            }}
          >
            {c.answer} →
          </Action>
        </div>
      </Card>
    </div>
  );
}
