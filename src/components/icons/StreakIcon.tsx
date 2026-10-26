"use client";
import { useEffect, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import { streakVisualState } from "@/lib/streakState";
import Icon from "./Icon";
export default function StreakIcon() {
  const { progress } = useProgress();
  const [event, setEvent] = useState<string | null>(null);
  useEffect(() => {
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem("arduhub.streak.event");
      sessionStorage.removeItem("arduhub.streak.event");
    } catch {}
    if (!pending) return;
    const frame = requestAnimationFrame(() => setEvent(pending));
    const timer = setTimeout(() => setEvent(null), 700);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  return (
    <Icon
      name="streak"
      state={
        event === "frozen"
          ? "frozen"
          : event === "lost"
            ? "extinguish"
            : streakVisualState(progress, new Date())
      }
      value={progress.streak.count}
    />
  );
}
