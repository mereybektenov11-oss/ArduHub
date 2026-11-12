"use client";
import { useEffect, useState, type RefObject } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Animation is optional; scene content is always rendered, including SSR. */
export function useSceneActivity(ref: RefObject<HTMLElement | null>): boolean {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;
    let intersects = false;
    const update = () =>
      setActive(intersects && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [ref, reduced]);
  return !reduced && active;
}
