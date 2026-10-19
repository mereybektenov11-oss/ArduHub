"use client";
import { useState } from "react";
import { ru } from "@/content/ru";
import { SectionShell, SectionTitle } from "../ui/primitives";
import { Stagger, StaggerItem } from "../ui/Stagger";
export default function Modes() {
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [saved, setSaved] = useState([true, true, true]);
  return (
    <SectionShell id="modes" className="modes-section">
      <SectionTitle title={ru.section.modes} sub={ru.section.modesSub} />
      <Stagger className="modes-grid">
        <StaggerItem>
          <article className="mode">
            <div className="mode-preview collection-preview">
              <div className="mini-toolbar">
                <strong>{ru.ui.collection}</strong>
                <span aria-hidden="true">↗</span>
              </div>
              {ru.schemes.slice(0, 3).map((s, i) => (
                <div className="collection-row" key={s.id}>
                  <span className="collection-symbol" aria-hidden="true">
                    {["⌁", "⏚", "⌘"][i]}
                  </span>
                  <span>{s.title}</span>
                  <button
                    type="button"
                    aria-label={`${saved[i] ? ru.ui.saved : ru.ui.save}: ${s.title}`}
                    aria-pressed={saved[i]}
                    onClick={() =>
                      setSaved((prev) => prev.map((v, j) => (i === j ? !v : v)))
                    }
                  >
                    {saved[i] ? "▣" : "□"}
                  </button>
                </div>
              ))}
            </div>
            <h3>{ru.ui.collection}</h3>
            <p>{ru.ui.collectionText}</p>
          </article>
        </StaggerItem>
        <StaggerItem>
          <article className="mode">
            <div className="mode-preview blitz-preview">
              <div className="mini-toolbar">
                <span
                  className="lives"
                  role="img"
                  aria-label={`${ru.ui.lives}: ${lives}`}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={i >= lives ? "heart-lost" : ""}
                      aria-hidden="true"
                    >
                      ♥
                    </span>
                  ))}
                </span>
                <span className="streak">
                  {ru.ui.streak}:{" "}
                  <span className="streak-digit" key={streak}>
                    {streak}
                  </span>
                </span>
              </div>
              <strong className="blitz-question">
                {lives ? ru.ui.blitzQuestion : ru.ui.blitzOver}
              </strong>
              {lives > 0 && answer === null ? (
                <div className="blitz-answers">
                  {ru.ui.blitzAnswers.map((a, i) => (
                    <button
                      className="chip"
                      key={a}
                      type="button"
                      onClick={() => {
                        setAnswer(i);
                        if (i === 0) setStreak((s) => s + 1);
                        else {
                          setLives((l) => l - 1);
                          setStreak(0);
                        }
                      }}
                    >
                      {a}
                      <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="blitz-result" role="status">
                  <p>
                    {lives > 0
                      ? answer === 0
                        ? ru.ui.blitzWin
                        : ru.ui.blitzLose
                      : ru.ui.blitzOver}
                  </p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (lives === 0) {
                        setLives(3);
                        setStreak(0);
                      }
                      setAnswer(null);
                    }}
                  >
                    {lives ? ru.ui.next : ru.ui.replay}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
              <span className="mini-demo">{ru.hero.demo}</span>
            </div>
            <h3>{ru.ui.blitz}</h3>
            <p>{ru.ui.blitzText}</p>
          </article>
        </StaggerItem>
        <StaggerItem>
          <article className="mode">
            <div className="mode-preview rank-preview">
              <div className="mini-toolbar">
                <strong>{ru.ui.rank}</strong>
                <span className="badge">{ru.hero.demo}</span>
              </div>
              {ru.ui.rankNames.map((name, i) => (
                <div className={`rank-row rank-${i}`} key={name}>
                  <span className="rank-number">{i + 1}</span>
                  <span className="rank-avatar">{name.charAt(0)}</span>
                  <span>{name}</span>
                  <strong>{[840, 720, 680][i]}</strong>
                  <meter
                    className="rank-meter"
                    min={0}
                    max={1000}
                    value={[840, 720, 680][i]}
                    aria-label={`${name}: ${[840, 720, 680][i]} ${ru.ui.points}`}
                  />
                </div>
              ))}
            </div>
            <h3>{ru.ui.rank}</h3>
            <p>{ru.ui.rankText}</p>
          </article>
        </StaggerItem>
      </Stagger>
    </SectionShell>
  );
}
