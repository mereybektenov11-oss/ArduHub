"use client";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { dailyState, missionsDone } from "@/domain/missions";
import { motionSoundRu as c } from "@/content/motion-sound.ru";
import { playSfx } from "@/lib/sfx";
import { RewardFly } from "./EventFeedback";
import AnimatedCount from "@/components/icons/AnimatedCount";
import Icon from "@/components/icons/Icon";
export default function Chest() {
  const { progress, claimMissions } = useProgress();
  const attempted = useRef("");
  const [open, setOpen] = useState(false);
  const day = dailyState(progress).day,
    eligible = missionsDone(progress) && !dailyState(progress).claimed;
  useEffect(() => {
    if (!eligible || attempted.current === day) return;
    attempted.current = day;
    void claimMissions().then((ok) => {
      if (ok) {
        setOpen(true);
        playSfx("spark_gain");
      }
    });
  }, [eligible, day, claimMissions]);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 1800);
    return () => clearTimeout(timer);
  }, [open]);
  if (!open) return null;
  return (
    <div className="g3-chest-toast" role="status">
      <div className="g3-chest is-open" data-chest="open">
        <svg width="80" height="70" viewBox="0 0 80 70" aria-hidden="true">
          <path
            d="M8 30h64v32H8Z"
            fill="var(--amber-500)"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M8 25 14 6h52l6 19Z"
            fill="var(--amber-500)"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M35 30v32m10-32v32"
            stroke="var(--forest-700)"
            strokeWidth="4"
          />
        </svg>
        <RewardFly />
        <RewardFly target="[data-reward-target=tokens]" />
      </div>
      <strong>{c.chest}</strong>
      <p>
        <Icon name="sparks" />+<AnimatedCount value={10} initialValue={0} />{" "}
        <Icon name="tokens" />+<AnimatedCount value={5} initialValue={0} />
      </p>
    </div>
  );
}
