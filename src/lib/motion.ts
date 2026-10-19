import type { CSSProperties } from "react";

// Durations and delays are in seconds, distances in pixels.
export const motionTokens = {
  easeOut: [0.22, 1, 0.36, 1],
  easeInOut: [0.65, 0, 0.35, 1],
  duration: {
    reveal: 0.9,
    state: 0.5,
    hover: 0.35,
    micro: 0.225,
    button: 0.275,
    enter: 0.8,
    exit: 0.3,
    dialog: 0.4,
    stepExit: 0.35,
    stepColor: 0.45,
    counter: 1.6,
    hint: 0.6,
    faqClose: 0.4,
    text: 0.4,
    textDelay: 0.12,
    heart: 0.25,
    touch: 0.15,
    parallax: 0.6,
    led: 3,
    error: 4,
    islandDrift: 28,
  },
  stagger: 0.11,
  bankStagger: 0.07,
  hero: { drift: [28, 34, 41, 32, 48, 38], aura: [24, 29], pulse: [6, 8, 10] },
  reveal: { y: 28, blur: 6, threshold: 0.2 },
} as const;

export const motionCssVars = {
  ...Object.fromEntries(
    Object.entries(motionTokens.duration).map(([key, value]) => [
      `--motion-${key}`,
      `${value}s`,
    ]),
  ),
  "--motion-ease": `cubic-bezier(${motionTokens.easeOut.join(",")})`,
  "--motion-ease-in-out": `cubic-bezier(${motionTokens.easeInOut.join(",")})`,
} as CSSProperties;

export function revealStyle(delay = 0, y: number = motionTokens.reveal.y) {
  return {
    "--reveal-duration": `${motionTokens.duration.reveal}s`,
    "--reveal-delay": `${Math.max(0, delay)}s`,
    "--reveal-ease": `cubic-bezier(${motionTokens.easeOut.join(",")})`,
    "--reveal-y": `${y}px`,
    "--reveal-blur": `${motionTokens.reveal.blur}px`,
  } as CSSProperties;
}
