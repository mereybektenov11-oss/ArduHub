"use client";
import { useEffect, useRef, useState } from "react";
import {
  achievementDeck,
  achievementsRu as c,
} from "@/content/achievements.ru";
import { achievementState, type AchievementId } from "@/domain/achievements";
import { useProgress } from "@/lib/useProgress";
import Icon from "@/components/icons/Icon";
import { Card, Action } from "@/components/cabinet/ui";
import { RewardFly, LevelBurst } from "@/components/feedback/EventFeedback";
import "./stickers.css";
import Overlay from "@/components/overlay/Overlay";
export function StickerReward({ id }: { id: AchievementId }) {
  const { progress, collectSticker } = useProgress();
  const [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false),
    [collected, setCollected] = useState(false);
  const lock = useRef(false),
    claimed = achievementState(progress).claimed.includes(id);
  return (
    <div className="sticker-reward">
      <Action
        disabled={busy || claimed}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          const ok = await collectSticker(id);
          setFailed(!ok);
          if (ok) setCollected(true);
          setBusy(false);
          lock.current = false;
        }}
      >
        {claimed ? c.claimed : c.collect}
      </Action>
      {failed && !claimed && <p role="alert">{c.retry}</p>}
      {collected && <RewardFly />}
    </div>
  );
}
export default function Stickers() {
  const { progress } = useProgress();
  const state = achievementState(progress);
  return (
    <Card className="profile-stickers">
      <div className="cab-row">
        <h2>{c.title}</h2>
        <span>{c.count(state.unlocked.length)}</span>
      </div>
      <div className="sticker-grid">
        {achievementDeck.map((item) => {
          const unlocked = state.unlocked.includes(item.id);
          return (
            <article
              key={item.id}
              data-sticker={item.id}
              data-earned={unlocked}
              className={`sticker-cell ${unlocked ? "is-earned" : "is-locked"}`}
              title={item.condition}
            >
              <span className="sticker-art" aria-hidden="true">
                <Icon
                  name={item.icon}
                  size={48}
                  state={
                    unlocked
                      ? item.id === "seven-days"
                        ? "milestone"
                        : "done"
                      : "locked"
                  }
                  value={item.id === "seven-days" ? 7 : undefined}
                />
              </span>
              <h3>{item.title}</h3>
              <p>{item.condition}</p>
              <span className="sr-only">
                {unlocked ? c.obtained : c.locked}
              </span>
              {unlocked && <StickerReward id={item.id} />}
            </article>
          );
        })}
      </div>
    </Card>
  );
}
export function AchievementNotification() {
  const { progress, update, ready } = useProgress();
  const [shown, setShown] = useState<AchievementId | null>(null);
  const state = achievementState(progress);
  const next = state.unlocked.find((id) => !state.notified.includes(id)) as
    AchievementId | undefined;
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || shown || !next || pending.current === next) return;
    pending.current = next;
    const timer = setTimeout(() => {
      setShown(next);
    }, 100);
    return () => {
      clearTimeout(timer);
      pending.current = null;
    };
  }, [next, ready, shown, update]);
  const item = achievementDeck.find((item) => item.id === shown);
  if (!item) return null;
  return (
    <Overlay
      title={c.available}
      header={false}
      variant="celebration"
      panelClassName="h-overlay-sticker"
      onClose={() => setShown(null)}
      onOpen={() =>
        update((p) => ({
          ...p,
          achievements: {
            ...achievementState(p),
            notified: [...new Set([...achievementState(p).notified, item.id])],
          },
        }))
      }
    >
      <aside
        className="achievement-popup"
        role="region"
        aria-label={c.available}
      >
        <button
          className="cab-icon-btn"
          aria-label={c.close}
          onClick={() => setShown(null)}
        >
          ×
        </button>
        <p className="cab-eyebrow">{c.available}</p>
        <div className="sticker-art is-new">
          <Icon name={item.icon} size={96} state="gain" />
        </div>
        <h2>{item.title}</h2>
        <p>{item.condition}</p>
        <StickerReward key={item.id} id={item.id} />
        {state.claimed.includes(item.id) && (
          <div className="sticker-burst">
            <LevelBurst value={5} />
          </div>
        )}
      </aside>
    </Overlay>
  );
}
