"use client";
import type { ReactNode } from "react";
import { revealStyle, motionTokens } from "@/lib/motion";
import { useInViewOnce } from "@/lib/useInViewOnce";
export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = motionTokens.reveal.y,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  /** Delay in seconds. */
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const { ref } = useInViewOnce<HTMLDivElement>({ once });
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={revealStyle(delay, y)}
    >
      {children}
    </div>
  );
}
