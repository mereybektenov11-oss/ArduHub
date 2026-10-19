"use client";
import { useEffect, useState } from "react";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { useProgress } from "@/lib/useProgress";
import {
  dailyState,
  millisecondsToReset,
  missionsDone,
  claimDaily,
} from "@/domain/missions";
import { Card, Action } from "@/components/cabinet/ui";
export default function MissionsPage() {
  const { progress: p, update, refreshAccount, notify } = useProgress();
  const [now, setNow] = useState(() => new Date()),
    [busy, setBusy] = useState(false),
    [answer, setAnswer] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const daily = dailyState(p, now);
  const seconds = Math.floor(
    millisecondsToReset(now, p.account?.timezone) / 1000,
  );
  const remaining = `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  async function award(source: string, refId: string, amount: number) {
    const response = await fetch("/api/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, refId, amount }),
    });
    if (!response.ok && response.status !== 409) throw Error();
    await refreshAccount();
  }
  async function claim() {
    if (busy || daily.claimed || !missionsDone(p, now)) return;
    setBusy(true);
    try {
      if (p.account?.userId) {
        await award("mission", daily.day, 5);
        update((x) => ({
          ...x,
          daily: { ...dailyState(x, now), claimed: true },
        }));
      } else update((x) => claimDaily(x, now));
    } catch {
      notify(c.offline);
    } finally {
      setBusy(false);
    }
  }
  async function quiz(i: number) {
    setAnswer(i);
    if (i !== 0 || daily.quiz || busy) return;
    setBusy(true);
    try {
      if (p.account?.userId) await award("game", "quiz:" + daily.day, 5);
      else update((x) => ({ ...x, xp: x.xp + 5 }));
      update((x) => ({ ...x, daily: { ...dailyState(x, now), quiz: true } }));
    } catch {
      notify(c.offline);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cab-stack">
      <div>
        <p className="cab-eyebrow">ArduHub / {c.groups[2].title}</p>
        <h1>{c.missions}</h1>
        <p className="cab-muted">
          {c.remaining}: <time>{remaining}</time>
        </p>
      </div>
      <Card>
        {c.missionTitles.map((title, i) => {
          const value =
            i === 0
              ? daily.lessonIds.length
              : i === 1
                ? daily.xp
                : daily.perfect
                  ? 1
                  : 0;
          const max = i === 1 ? 50 : 1;
          return (
            <div className="dash-mission" key={title}>
              <div className="cab-row">
                <strong>{title}</strong>
                <span>
                  {Math.min(value, max)} / {max}
                </span>
              </div>
              <progress aria-label={title} value={value} max={max} />
            </div>
          );
        })}
      </Card>
      <Card>
        <h2>{c.rewards}</h2>
        <p>
          ϟ +5 {c.tokenUnits} · ◆ +10 {c.sparkUnits}
        </p>
        <Action
          disabled={busy || daily.claimed || !missionsDone(p, now)}
          onClick={claim}
        >
          {daily.claimed ? c.claimed : c.claim}
        </Action>
      </Card>
      <Card>
        <h2>{c.quiz}</h2>
        <p>{c.quizQuestion}</p>
        {c.quizAnswers.map((a, i) => (
          <Action
            key={a}
            secondary
            disabled={daily.quiz || busy}
            onClick={() => quiz(i)}
          >
            {a}
          </Action>
        ))}
        {(answer !== null || daily.quiz) && (
          <p role="status">{daily.quiz ? c.quizRight : c.quizWrong}</p>
        )}
      </Card>
    </div>
  );
}
