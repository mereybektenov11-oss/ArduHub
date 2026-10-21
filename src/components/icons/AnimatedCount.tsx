"use client";
import { useEffect, useRef, useState } from "react";
export default function AnimatedCount({ value }: { value: number }) {
  const previous = useRef(value),
    [display, setDisplay] = useState(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const start = performance.now();
    let frame = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function tick(now: number) {
      const t = reduced ? 1 : Math.min(1, (now - start) / 350);
      setDisplay(Math.round(from + (value - from) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong>{display}</strong>;
}
