import { cubicBezier } from "motion";
import { motionTokens } from "./motion";
let cancelActive: (() => void) | undefined;
const ease = cubicBezier(...motionTokens.easeInOut);
export function scrollToSection(element: HTMLElement) {
  cancelActive?.();
  const start = window.scrollY;
  const offset =
    parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
    0;
  const target = Math.max(
    0,
    Math.min(
      start + element.getBoundingClientRect().top - offset,
      document.documentElement.scrollHeight - innerHeight,
    ),
  );
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: target, behavior: "instant" });
    return;
  }
  let frame = 0;
  const started = performance.now();
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  const cancel = () => {
    cancelAnimationFrame(frame);
    events.forEach((event) => window.removeEventListener(event, cancel));
    cancelActive = undefined;
  };
  cancelActive = cancel;
  events.forEach((event) =>
    window.addEventListener(event, cancel, { passive: true, once: true }),
  );
  function tick(now: number) {
    const ratio = Math.min(
      (now - started) / (motionTokens.duration.enter * 1000),
      1,
    );
    window.scrollTo({
      top: start + (target - start) * ease(ratio),
      behavior: "instant",
    });
    if (ratio < 1) frame = requestAnimationFrame(tick);
    else cancel();
  }
  frame = requestAnimationFrame(tick);
}
export function cancelSectionScroll() {
  cancelActive?.();
}
