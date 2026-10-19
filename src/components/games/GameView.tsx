"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { useEffect, useState, useRef } from "react";
import PinDiagram from "@/components/cabinet/PinDiagram";
import { games } from "@/domain/seed";
import { useProgress } from "@/lib/useProgress";
import { recordActivity } from "@/domain/progress/streak";
import { xpLevel, syncLessonStates } from "@/domain/progress/xp";
import {
  gameCopy as c,
  blitzDeck,
  matchDeck,
  diagnosticDeck,
} from "@/content/cabinet.ru";
import { Action, Card, Pill, ProgressBar } from "@/components/cabinet/ui";
type Result = { score: number; errors: string[] };
export default function GameView({ id }: { id: string }) {
  const { update, notify } = useProgress();
  const game = games.find((g) => g.id === id);
  const [result, setResult] = useState<Result | null>(null),
    [run, setRun] = useState(0);
  const ended = useRef(false);
  if (!game) return <h1>{c.notFound}</h1>;
  function finish(r: Result) {
    if (ended.current) return;
    ended.current = true;
    setResult(r);
    const reward = r.score * 5;
    update((p) =>
      syncLessonStates({
        ...p,
        xp: p.xp + reward,
        sparks: p.sparks + reward,
        profile: {
          ...p.profile,
          level: Math.max(p.profile.level, xpLevel(p.xp + reward)),
        },
        gameRuns: p.gameRuns + 1,
        streak: reward ? recordActivity(p.streak) : p.streak,
        reviewQueue: [
          ...p.reviewQueue,
          ...r.errors.map((e) => ({
            termOrLessonId: "term-4",
            errorCode: e,
            addedAt: new Date().toISOString(),
          })),
        ],
      }),
    );
    notify(uiCopy.text061(c.result, reward, reward));
  }
  return (
    <div className="cab-stack cab-test">
      <Action secondary href="/app/practice">
        ← {c.practice}
      </Action>
      <p className="cab-eyebrow">{uiCopy.text062}</p>
      <h1>{game.title}</h1>
      {result ? (
        <Card className="cab-stack">
          <h2>{c.result}</h2>
          <div className="cab-row">
            <Pill>
              {result.score} {c.correct}
            </Pill>
            <Pill>+{result.score * 5} XP</Pill>
            <Pill>
              +{result.score * 5} {uiCopy.text063}
            </Pill>
          </div>
          <p>{result.errors.length ? c.review : c.perfect}</p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((e, i) => (
                <li key={i}>{c.errorLabels[e] ?? c.matchError}</li>
              ))}
            </ul>
          )}
          <Action
            onClick={() => {
              ended.current = false;
              setResult(null);
              setRun(run + 1);
            }}
          >
            {c.again}
          </Action>
          <Action secondary href="/app/glossary">
            {c.glossary}
          </Action>
        </Card>
      ) : game.kind === "match" ? (
        <MatchGame key={run} finish={finish} />
      ) : (
        <CircuitGame key={run} kind={game.kind} finish={finish} />
      )}
    </div>
  );
}
function CircuitGame({
  kind,
  finish,
}: {
  kind: "blitz" | "findbug";
  finish: (r: Result) => void;
}) {
  const [q, setQ] = useState(0),
    [lives, setLives] = useState(3),
    [score, setScore] = useState(0),
    [errors, setErrors] = useState<string[]>([]),
    [pin, setPin] = useState<string | null>(null),
    [time, setTime] = useState(60),
    [paused, setPaused] = useState(false),
    [note, setNote] = useState("");
  useEffect(() => {
    const visibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setTime((t) => {
        if (t <= 1) {
          clearInterval(timer);
          queueMicrotask(() => finish({ score, errors }));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, score, errors, finish]);
  const task = blitzDeck[q % blitzDeck.length];
  const find = diagnosticDeck[5 + (q % 3)];
  function answer(ok: boolean) {
    const nextErrors = ok
      ? errors
      : [...errors, kind === "blitz" ? "wrong_pin" : "led_reversed"];
    const nextScore = score + Number(ok),
      nextLives = lives - Number(!ok);
    setNote(ok ? c.right : c.wrong);
    setScore(nextScore);
    setErrors(nextErrors);
    setLives(nextLives);
    setPin(null);
    setQ(q + 1);
    if (nextLives === 0 || q === 5)
      finish({ score: nextScore, errors: nextErrors });
  }
  function choose(p: string) {
    if (!pin) {
      setPin(p);
      return;
    }
    answer([pin, p].sort().join("|") === task.pair.slice().sort().join("|"));
  }
  return (
    <Card className="cab-stack">
      <div className="cab-row">
        <Pill>
          {c.lives}: {"♥".repeat(lives)}
          {"♡".repeat(3 - lives)}
        </Pill>
        <Pill>
          {time} {c.seconds}
        </Pill>
        <Pill>{q + 1}/6</Pill>
      </div>
      <ProgressBar value={(time / 60) * 100} label={c.remaining} />
      <h2>{kind === "blitz" ? task.question : find.question}</h2>
      <p className="cab-muted cab-small">
        {kind === "blitz" ? c.twoPins : c.findHelp}
      </p>
      {kind === "findbug" ? (
        <PinDiagram
          options={find.options}
          kind={q % 3 === 1 ? "wrongpin" : q % 3 === 2 ? "sensor" : "led"}
          selected={null}
          onSelect={(i) => answer(i === find.correct)}
        />
      ) : (
        <div className="cab-game-circuit">
          <svg viewBox="0 0 500 210" aria-hidden="true">
            <rect
              x="20"
              y="20"
              width="130"
              height="140"
              rx="12"
              fill="var(--board)"
            />
            <text
              x="85"
              y="65"
              fill="var(--cream-50)"
              fontSize="14"
              textAnchor="middle"
            >
              ARDUINO
            </text>
            <path
              d="M150 100 H220 V70 H320 M150 145H400V100"
              stroke="var(--wire)"
              strokeWidth="5"
              fill="none"
            />
            <rect
              x="220"
              y="55"
              width="65"
              height="30"
              rx="8"
              fill="var(--amber-500)"
            />
            <path d="M340 50a22 22 0 0 1 44 0v40h-44z" fill="var(--success)" />
            <path
              d="M345 90v20m35-20v20"
              stroke="var(--metal)"
              strokeWidth="4"
            />
          </svg>
          <div className="cab-row">
            {(kind === "blitz"
              ? ["13", "5V", "GND", "A", "K", "R1"]
              : ["13", "A", "K", "GND"]
            ).map((p) => (
              <button
                key={p}
                className="cab-pin-choice"
                aria-label={p}
                aria-pressed={pin === p}
                onClick={() =>
                  kind === "blitz" ? choose(p) : answer(p === "K")
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      {paused && <p>{c.paused}</p>}
      <p role="status" className="cab-small">
        {note || c.begin}
      </p>
      <Action secondary onClick={() => finish({ score, errors })}>
        {c.finish}
      </Action>
    </Card>
  );
}
function MatchGame({ finish }: { finish: (r: Result) => void }) {
  const deck = matchDeck.flatMap((p, i) => [
    { id: `a${i}`, pair: i, text: p[0] },
    {
      id: `b${(i + 2) % 4}`,
      pair: (i + 2) % 4,
      text: matchDeck[(i + 2) % 4][1],
    },
  ]);
  const [selected, setSelected] = useState<string | null>(null),
    [matched, setMatched] = useState<number[]>([]),
    [errors, setErrors] = useState<string[]>([]),
    [note, setNote] = useState("");
  return (
    <Card className="cab-stack">
      <h2>{c.matchTask}</h2>
      <p className="cab-small cab-muted">{c.matchHelp}</p>
      <ProgressBar value={(matched.length / 4) * 100} label={c.matched} />
      <div className="cab-match-grid">
        {deck.map((card) => (
          <button
            key={card.id}
            aria-pressed={selected === card.id}
            disabled={matched.includes(card.pair)}
            onClick={() => {
              if (!selected) {
                setSelected(card.id);
                return;
              }
              if (selected === card.id) {
                setSelected(null);
                return;
              }
              const prev = deck.find((c) => c.id === selected)!;
              if (prev.pair === card.pair) {
                const next = [...matched, card.pair];
                setMatched(next);
                setNote(c.right);
                if (next.length === 4) finish({ score: 4, errors });
              } else {
                setErrors([...errors, "match"]);
                setNote(c.wrong);
              }
              setSelected(null);
            }}
          >
            {matched.includes(card.pair) ? "✓ " : ""}
            {card.text}
          </button>
        ))}
      </div>
      <p role="status">{note}</p>
      <Action
        secondary
        onClick={() => finish({ score: matched.length, errors })}
      >
        {c.finish}
      </Action>
    </Card>
  );
}
