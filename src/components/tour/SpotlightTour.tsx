"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/useProgress";
import {
  lessonFocusTour,
  tourDeck,
  cabinetRu as c,
} from "@/content/cabinet.ru";
import { Action } from "@/components/cabinet/ui";
type Step = { target: string; title: string; text: string };
export default function SpotlightTour() {
  const path = usePathname();
  const { progress: p, ready, update } = useProgress();
  const [steps, setSteps] = useState<Step[]>([]),
    [index, setIndex] = useState(0),
    [rect, setRect] = useState<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    card = useRef<HTMLDivElement>(null);
  const configured = path.startsWith("/app/lesson/")
    ? lessonFocusTour
    : tourDeck[path as keyof typeof tourDeck];
  const source = configured ?? tourDeck["/app"];
  const finishRef = useRef<() => void>(() => {});
  function finish() {
    setSteps([]);
    setRect(null);
    update((prev) => ({
      ...prev,
      tourSeen: { ...prev.tourSeen, [path]: true },
    }));
  }
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (!source) return;
    function start() {
      const visible = source.filter((s) => {
        const el = document.querySelector<HTMLElement>(
          `[data-tour="${s.target}"]`,
        );
        return (
          el &&
          el.getBoundingClientRect().width > 0 &&
          el.getBoundingClientRect().height > 0
        );
      });
      if (visible.length) {
        setIndex(0);
        setSteps([...visible]);
      }
    }
    const timer =
      ready && configured && !p.tourSeen[path] ? setTimeout(start, 650) : null;
    window.addEventListener("cabinet:tour", start);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("cabinet:tour", start);
    };
  }, [path, ready, p.tourSeen, source, configured]);
  useEffect(() => {
    if (!steps.length) return;
    const target = document.querySelector<HTMLElement>(
      `[data-tour="${steps[index].target}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: "instant", block: "center" });
    const before = document.activeElement as HTMLElement;
    const activeDialog = dialog.current;
    activeDialog?.showModal();
    function measure() {
      const r = target!.getBoundingClientRect();
      setRect({
        left: Math.max(6, r.left - 6),
        top: Math.max(6, r.top - 6),
        width: Math.min(innerWidth - 12, r.width + 12),
        height: Math.min(innerHeight - 12, r.height + 12),
      });
    }
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      activeDialog?.close();
      before?.focus();
    };
  }, [steps, index]);
  if (!steps.length) return null;
  const top = rect
    ? Math.max(
        12,
        Math.min(window.innerHeight - 255, rect.top + rect.height + 16),
      )
    : 12;
  return (
    <dialog
      ref={dialog}
      className="cab-tour"
      aria-label={uiCopy.text092}
      onCancel={(e) => {
        e.preventDefault();
        finishRef.current();
      }}
    >
      {rect && <div className="cab-tour-hole" style={rect} />}
      <div
        className="cab-tour-card"
        ref={card}
        style={{
          top,
          left: rect
            ? Math.max(12, Math.min(window.innerWidth - 332, rect.left))
            : 12,
        }}
      >
        <span className="cab-eyebrow">
          {index + 1} {uiCopy.text085}
          {steps.length}
        </span>
        <h2>{steps[index].title}</h2>
        <p>{steps[index].text}</p>
        <div className="cab-row">
          <Action secondary onClick={finish}>
            {c.skip}
          </Action>
          <Action
            onClick={() =>
              index === steps.length - 1 ? finish() : setIndex(index + 1)
            }
          >
            {index === steps.length - 1 ? uiCopy.text093 : c.next} →
          </Action>
        </div>
      </div>
    </dialog>
  );
}
