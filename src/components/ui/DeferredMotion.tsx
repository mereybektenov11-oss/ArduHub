"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { AnimatePresence, LazyMotion } from "motion/react";
type Features = (typeof import("@/lib/motionFeatures"))["default"];
const FeaturesReady = createContext(false);
export function useMotionFeaturesReady() {
  return useContext(FeaturesReady);
}
// Filtering must also work before the optional animation chunk has arrived.
export function DeferredPresence({ children }: { children: ReactNode }) {
  const ready = useMotionFeaturesReady();
  return ready ? (
    <AnimatePresence initial={false} mode="popLayout">
      {children}
    </AnimatePresence>
  ) : (
    <>{children}</>
  );
}

// CSS reveals work immediately. Load layout/exit machinery only near its users.
export default function DeferredMotion({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const stop = useRef<() => void>(() => {});
  const load = useCallback(
    () =>
      new Promise<Features>((resolve) => {
        let started = false;
        function activate() {
          if (started) return;
          started = true;
          void import("@/lib/motionFeatures")
            .then((module) => {
              resolve(module.default);
              queueMicrotask(() => setReady(true));
            })
            .catch(() => {});
        }
        const targets = document.querySelectorAll(
          ".how-section, .bank-section",
        );
        if (!window.IntersectionObserver || !targets.length) {
          activate();
          return;
        }
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              observer.disconnect();
              activate();
            }
          },
          { rootMargin: "400px" },
        );
        targets.forEach((target) => observer.observe(target));
        stop.current = () => observer.disconnect();
      }),
    [],
  );
  useEffect(() => () => stop.current(), []);
  return (
    <LazyMotion features={load} strict>
      <FeaturesReady.Provider value={ready}>{children}</FeaturesReady.Provider>
    </LazyMotion>
  );
}
