"use client";
import { useEffect, useRef, useState } from "react";
export function useSteps(count: number) {
  const [active, setActive] = useState(0);
  const sentinels = useRef<(HTMLDivElement | null)[]>([]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: 0 },
    );
    sentinels.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);
  function onKey(e: React.KeyboardEvent) {
    let next = active;
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      next = (active + 1) % count;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (active - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  }
  return { active, setActive, sentinels, buttons, onKey };
}
