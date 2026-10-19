"use client";
import { useEffect, useState } from "react";
import CircuitScene, { type Phase } from "./CircuitScene";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { ru } from "@/content/ru";
export function useCircuitPhase() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("drawing");
  useEffect(() => {
    if (reduced) return;
    const error = setTimeout(() => setPhase("error"), 1300);
    const fixed = setTimeout(() => setPhase("fixed"), 2900);
    return () => {
      clearTimeout(error);
      clearTimeout(fixed);
    };
  }, [reduced]);
  return reduced ? "fixed" : phase;
}
export default function CircuitDemo() {
  const [phase, setPhase] = useState<Phase>("drawing");
  const reduced = useReducedMotion();
  return (
    <div>
      <div className="filter-options">
        {(["drawing", "error", "fixed"] as Phase[]).map((p, i) => (
          <button
            className="chip"
            aria-pressed={phase === p}
            onClick={() => setPhase(p)}
            key={p}
          >
            {[ru.ui.drawing, ru.ui.errorPhase, ru.ui.fixedPhase][i]}
          </button>
        ))}
      </div>
      <CircuitScene phase={reduced ? "fixed" : phase} />
    </div>
  );
}
