"use client";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { dashboardRu as c } from "@/content/dashboard.ru";
import RewardPopup from "@/components/overlay/RewardPopup";
import RewardIcon from "./RewardIcon";
import { RewardFly } from "@/components/feedback/EventFeedback";
export default function RewardToast() {
  const { progress: p, ready } = useProgress();
  const previous = useRef<{ value: number; account?: string } | null>(null),
    [reward, setReward] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const old = previous.current;
    previous.current = { value: p.sparks, account: p.account?.userId };
    if (!old || old.account !== p.account?.userId || p.sparks <= old.value)
      return;
    const start = setTimeout(() => setReward(p.sparks - old.value), 0);
    return () => {
      clearTimeout(start);
    };
  }, [p.sparks, p.account?.userId, ready]);
  return reward > 0 ? (
    <RewardPopup className="polish-reward" onDone={() => setReward(0)}>
      <RewardIcon kind="spark" />+{reward} {c.sparks.toLowerCase()}
      <RewardFly key={p.sparks} />
    </RewardPopup>
  ) : null;
}
