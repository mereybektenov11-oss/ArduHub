"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { motionTokens } from "@/lib/motion";
export default function StageTransition({
  stage,
  children,
}: {
  stage: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [view, setView] = useState({ stage, children });
  if (view.stage === stage && view.children !== children)
    setView({ stage, children });
  useEffect(() => {
    if (view.stage === stage) return;
    const timer = setTimeout(
      () => setView({ stage, children }),
      reduce ? 0 : motionTokens.lessonFlow.stage * 500,
    );
    return () => clearTimeout(timer);
  }, [stage, children, view.stage, reduce]);
  return (
    <div
      key={view.stage}
      className={`flow-stage-animate ${view.stage !== stage ? "is-leaving" : ""}`}
    >
      {view.stage === stage ? children : view.children}
    </div>
  );
}
