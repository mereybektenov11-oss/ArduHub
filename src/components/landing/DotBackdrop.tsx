"use client";

import { useRef, type CSSProperties } from "react";
import { useSceneActivity } from "./useSceneActivity";

export default function DotBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSceneActivity(ref);
  return (
    <div
      ref={ref}
      className="dot-backdrop"
      data-active={active}
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          className={`dot-cluster dot-cluster-${index}`}
          key={index}
          style={{ "--dot-phase": `${-index * 1.7}s` } as CSSProperties}
        >
          {Array.from({ length: 30 }, (_, dot) => (
            <i
              key={dot}
              className={(dot + index) % 7 === 0 ? "dot-empty" : undefined}
            />
          ))}
        </span>
      ))}
    </div>
  );
}
