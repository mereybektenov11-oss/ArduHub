"use client";
import { useEffect, useRef, useState } from "react";
import { motionTokens } from "@/lib/motion";
export default function AnimatedCount({
  value,
  initialValue,
}: {
  value: number;
  initialValue?: number;
}) {
  const previous = useRef(initialValue ?? value),
    [display, setDisplay] = useState(initialValue ?? value);
  useEffect(() => {
    const from = previous.current;
    const start = performance.now();
    let frame = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function tick(now: number) {
      const t = reduced
        ? 1
        : Math.min(1, (now - start) / (motionTokens.events.count * 1000));
      previous.current = Math.round(from + (value - from) * t);
      setDisplay(previous.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong>{display}</strong>;
}
