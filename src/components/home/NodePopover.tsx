"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { lessonFlowRu as c } from "@/content/ru";
import type { Lesson } from "@/domain/types";
import { motionTokens } from "@/lib/motion";
export default function NodePopover({
  lesson,
  index,
  status,
  anchor,
  onClose,
}: {
  lesson: Lesson;
  index: number;
  status: string;
  anchor: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    action = useRef<HTMLAnchorElement>(null);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const close = () => {
    setClosing(true);
    closeTimer.current = setTimeout(
      () => {
        onClose();
        anchor.current?.focus();
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : motionTokens.lessonFlow.exit * 1000,
    );
  };
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      (action.current ?? root.current?.querySelector("button"))?.focus(),
    );
    const close = () => {
      setClosing(true);
      closeTimer.current = setTimeout(
        () => {
          onClose();
          anchor.current?.focus();
        },
        matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : motionTokens.lessonFlow.exit * 1000,
      );
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const outside = (e: PointerEvent) => {
      if (
        !root.current?.contains(e.target as Node) &&
        !anchor.current?.contains(e.target as Node)
      )
        close();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(closeTimer.current);
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [anchor, onClose]);
  return (
    <div
      className={`flow-node-popover ${closing ? "is-closing" : ""}`}
      ref={root}
      role="dialog"
      aria-label={lesson.title}
    >
      <button
        className="flow-popover-close"
        aria-label={c.closeCard}
        onClick={close}
      >
        ×
      </button>
      <h3>{lesson.title}</h3>
      <p>
        {c.lesson} {index + 1} · +{lesson.xp} XP
      </p>
      {status === "locked" ? (
        <>
          <p>{c.lockedNote}</p>
          <button className="cab-btn" disabled>
            {c.locked}
          </button>
        </>
      ) : (
        <>
          {status === "done" && <p>{c.completed}</p>}
          <Link
            ref={action}
            className="cab-btn"
            aria-disabled={opening}
            prefetch={false}
            href={`/app/lesson/${lesson.id}`}
            onClick={(e) => {
              if (opening) {
                e.preventDefault();
                return;
              }
              setOpening(true);
            }}
          >
            {opening ? c.opening : status === "done" ? c.overview : c.continue}
          </Link>
        </>
      )}
    </div>
  );
}
