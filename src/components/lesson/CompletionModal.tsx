"use client";
import { useEffect, useState } from "react";
import { Action, Modal } from "@/components/cabinet/ui";
import { lessonFlowRu as c } from "@/content/ru";
import { motionTokens } from "@/lib/motion";
import RewardIcon from "@/components/icons/RewardIcon";
export default function CompletionModal({
  rewarded,
  nextId,
  onClose,
}: {
  rewarded: boolean;
  nextId?: string;
  onClose: () => void;
}) {
  const [fraction, setFraction] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function tick(now: number) {
      const value = reduced
        ? 1
        : Math.min(1, (now - start) / (motionTokens.lessonFlow.reward * 1000));
      setFraction(value);
      if (value < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Modal title={c.success} onClose={onClose}>
      <div className="flow-completion">
        <div className="flow-stars" role="img" aria-label={c.stars}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{
                animationDelay: `${i * motionTokens.lessonFlow.stagger}s`,
              }}
            >
              ★
            </span>
          ))}
        </div>
        <p>{c.successNote}</p>
        {rewarded ? (
          <div className="flow-rewards" aria-label={c.rewardLabel}>
            <strong aria-label="30 XP">
              <RewardIcon kind="xp" />+{Math.round(30 * fraction)} {c.rewardXp}
            </strong>
            <strong aria-label="10 искр">
              <RewardIcon kind="spark" />+{Math.round(10 * fraction)}{" "}
              {c.rewardSparks}
            </strong>
          </div>
        ) : (
          <p>{c.reviewReward}</p>
        )}
        <div className="cab-row">
          {nextId && (
            <Action href={`/app/lesson/${nextId}`}>{c.nextLesson} →</Action>
          )}
          <Action secondary href="/app">
            {c.back}
          </Action>
        </div>
      </div>
    </Modal>
  );
}
