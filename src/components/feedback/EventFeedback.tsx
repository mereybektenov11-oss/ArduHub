"use client";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { motionTokens } from "@/lib/motion";
import Boxicon from "@/components/icons/Boxicon";
export function CheckDraw() {
  return (
    <svg
      className="g3-check"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m6 12 4 4 8-8" pathLength="1" />
    </svg>
  );
}
export function ShakeOnWrong({
  wrong,
  children,
}: {
  wrong: boolean;
  children: ReactNode;
}) {
  return <span className={wrong ? "g3-shake" : undefined}>{children}</span>;
}
export function Confetti() {
  const reduced = useReducedMotion(),
    [alive, setAlive] = useState(true);
  useEffect(() => {
    const timer = setTimeout(
      () => setAlive(false),
      motionTokens.events.confetti * 1000,
    );
    return () => clearTimeout(timer);
  }, []);
  if (reduced || !alive) return null;
  return (
    <div className="g3-confetti" aria-hidden="true">
      {Array.from({ length: 48 }, (_, i) => (
        <i
          data-confetti
          key={i}
          style={
            {
              "--x": `${(i * 37) % 100}%`,
              "--drift": `${((i * 73) % 300) - 150}px`,
              "--spin": `${i % 2 ? 300 : -270}deg`,
              "--delay": `${(i % 6) * 30}ms`,
              "--hue": i % 3,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
/** A bounded particle burst, measured from the reward source to a real counter. */
export function RewardFly({
  target = "[data-reward-target=sparks]",
  direction = "gain",
}: {
  target?: string;
  direction?: "gain" | "spend";
}) {
  const origin = useRef<HTMLSpanElement>(null),
    reduced = useReducedMotion();
  const [flight, setFlight] = useState<{ x: number; y: number } | null>(null),
    [alive, setAlive] = useState(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const start = origin.current?.getBoundingClientRect(),
        end = Array.from(document.querySelectorAll(target))
          .find((el) => el.getClientRects().length > 0)
          ?.getBoundingClientRect();
      if (start && end)
        setFlight({
          x: end.x + end.width / 2 - start.x,
          y: end.y + end.height / 2 - start.y,
        });
    });
    const timer = setTimeout(
      () => setAlive(false),
      motionTokens.events.flight * 1000 + 180,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [target]);
  return (
    <span
      ref={origin}
      className={`g3-reward-origin is-${direction}`}
      aria-hidden="true"
    >
      {!reduced &&
        alive &&
        flight &&
        Array.from({ length: 5 }, (_, i) => (
          <i
            key={i}
            data-reward-particle
            style={
              {
                "--fly-x": `${direction === "spend" ? (i - 2) * 18 : flight.x}px`,
                "--fly-y": `${direction === "spend" ? 90 : flight.y}px`,
                "--arc": `${-45 - i * 9}px`,
                "--delay": `${i * 25}ms`,
              } as CSSProperties
            }
          >
            <Boxicon name="star" size="0.9em" />
          </i>
        ))}
    </span>
  );
}
export function LevelBurst({ value }: { value: number }) {
  return (
    <div className="g3-level-burst" data-level-burst={value} aria-hidden="true">
      <span>{value}</span>
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ "--angle": `${i * 45}deg` } as CSSProperties} />
      ))}
    </div>
  );
}
export function NodeLightUp({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span className={active ? "g3-node-light-up" : undefined}>{children}</span>
  );
}
