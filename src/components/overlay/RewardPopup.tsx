"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayQueue } from "./useOverlayQueue";
import { usePortalTheme } from "./usePortalTheme";
import "@/styles/h-overlay.css";
export default function RewardPopup({
  children,
  className = "",
  duration = 3000,
  onDone,
  queued = true,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  onDone?: () => void;
  queued?: boolean;
}) {
  const active = useOverlayQueue(queued);
  const host = useRef<HTMLDivElement>(null);
  usePortalTheme(active, host);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!active || !done.current) return;
    const timer = setTimeout(() => done.current?.(), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);
  if (!active || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={host}
      data-overlay-root
      className="cabinet h-reward-host"
      role="status"
    >
      <div className={`h-reward-popup ${className}`}>{children}</div>
    </div>,
    document.body,
  );
}
