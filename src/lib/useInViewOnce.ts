"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motionTokens } from "./motion";

export function useInViewOnce<T extends HTMLElement>({
  once = true,
  enabled = true,
} = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || !window.IntersectionObserver) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Server HTML remains visible without JavaScript. Arm before first paint.
    element.dataset.motionReady = "true";
    let seen = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible =
          entry.isIntersecting &&
          entry.intersectionRatio >= motionTokens.reveal.threshold;
        if (once && seen) return;
        element.dataset.inView = String(visible);
        setInView(visible);
        if (visible && once) {
          seen = true;
          observer.disconnect();
        }
      },
      { threshold: motionTokens.reveal.threshold },
    );
    observer.observe(element);

    // Promote only while a transition is actually running, including children.
    const running = new Map<HTMLElement, Set<string>>();
    function transition(event: TransitionEvent) {
      if (!(event.target instanceof HTMLElement)) return;
      if (!["transform", "opacity", "filter"].includes(event.propertyName))
        return;
      const target = event.target;
      const properties = running.get(target) ?? new Set<string>();
      if (event.type === "transitionstart" && !media.matches)
        properties.add(event.propertyName);
      else properties.delete(event.propertyName);
      if (properties.size) {
        running.set(target, properties);
        target.style.willChange = "transform, opacity, filter";
      } else {
        running.delete(target);
        target.style.removeProperty("will-change");
      }
    }
    const events = [
      "transitionstart",
      "transitionend",
      "transitioncancel",
    ] as const;
    events.forEach((event) => element.addEventListener(event, transition));
    return () => {
      observer.disconnect();
      events.forEach((event) => element.removeEventListener(event, transition));
      running.forEach((_, target) =>
        target.style.removeProperty("will-change"),
      );
      delete element.dataset.motionReady;
      delete element.dataset.inView;
    };
  }, [once, enabled]);

  // Reduced motion is handled by CSS and the numeric animation itself, so an
  // off-screen observer doesn't trigger an extra hydration render per card.
  return { ref, inView };
}
