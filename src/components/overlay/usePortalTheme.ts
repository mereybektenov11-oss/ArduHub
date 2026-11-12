"use client";
import { useEffect, type RefObject } from "react";

/** A body portal must retain the learner's inherited reading-scale setting. */
export function usePortalTheme(
  active: boolean,
  host: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const source = document.querySelector(".dash-shell");
    const target = host.current;
    if (!active || !source || !target) return;
    const sync = () => {
      const scale = getComputedStyle(source).getPropertyValue("--lesson-scale");
      if (scale) target.style.setProperty("--lesson-scale", scale);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(source, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [active, host]);
}
