"use client";
import { useEffect, useRef } from "react";
import { cubicBezier } from "motion";
import { motionTokens } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useReducedMotion";

const ease = cubicBezier(...motionTokens.easeOut);
export default function AnimatedNumber({
  value,
  active = true,
  from,
  duration = motionTokens.duration.state,
}: {
  value: number;
  active?: boolean;
  from?: number;
  duration?: number;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(from ?? value);
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    if (reduced) {
      node.textContent = String(value);
      return;
    }
    if (!active) {
      previous.current = from ?? value;
      node.textContent = String(previous.current);
      return;
    }
    const startValue = previous.current;
    if (startValue === value) {
      node.textContent = String(value);
      node.dataset.counting = "false";
      return;
    }
    const start = performance.now();
    let frame = 0;
    node.dataset.counting = "true";
    function tick(now: number) {
      const ratio = Math.min((now - start) / (duration * 1000), 1);
      previous.current = startValue + (value - startValue) * ease(ratio);
      // Keep the final integer for the final frame, even with a fast ease-out.
      const displayed =
        ratio === 1
          ? value
          : value > startValue
            ? Math.min(value - 1, Math.floor(previous.current))
            : Math.max(value + 1, Math.ceil(previous.current));
      node!.textContent = String(displayed);
      if (ratio < 1) frame = requestAnimationFrame(tick);
      else node!.dataset.counting = "false";
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      node.dataset.counting = "false";
    };
  }, [active, value, from, duration, reduced]);
  return (
    <span className="animated-number">
      <span className="sr-only">{value}</span>
      <span ref={element} aria-hidden="true">
        {value}
      </span>
    </span>
  );
}
