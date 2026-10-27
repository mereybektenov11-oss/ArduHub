"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cabinetRu as c } from "@/content/cabinet.ru";
import { useOverlayQueue } from "./useOverlayQueue";
import { usePortalTheme } from "./usePortalTheme";
import "@/styles/h-overlay.css";

export type OverlayProps = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  variant?: "default" | "celebration" | "mentor";
  dismissible?: boolean;
  header?: boolean;
  panelClassName?: string;
  onOpen?: () => void;
};
export default function Overlay({
  title,
  children,
  onClose,
  variant = "default",
  dismissible = true,
  header = true,
  panelClassName = "",
  onOpen,
}: OverlayProps) {
  const active = useOverlayQueue();
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  usePortalTheme(active, host);
  const close = useRef(onClose);
  const opened = useRef(onOpen);
  const [viewport, setViewport] = useState<CSSProperties>({});
  useEffect(() => {
    close.current = onClose;
    opened.current = onOpen;
  });
  useLayoutEffect(() => {
    if (!active) return;
    const before = document.activeElement as HTMLElement | null;
    // Progress updates can replace the trigger while the dialog is open.
    const identity = before?.id
      ? `#${CSS.escape(before.id)}`
      : before?.hasAttribute("data-tour")
        ? `[data-tour="${CSS.escape(before.getAttribute("data-tour")!)}"]`
        : before?.hasAttribute("aria-label")
          ? `${before.tagName.toLowerCase()}[aria-label="${CSS.escape(before.getAttribute("aria-label")!)}"]`
          : null;
    const el = dialog.current!;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    const gutter = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = "stable";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    el.showModal();
    opened.current?.();
    return () => {
      el.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.documentElement.style.scrollbarGutter = gutter;
      const target = before?.isConnected
        ? before
        : identity
          ? document.querySelector<HTMLElement>(identity)
          : null;
      target?.focus({ preventScroll: true });
    };
  }, [active]);
  useEffect(() => {
    if (!active || variant !== "mentor") return;
    const visual = window.visualViewport;
    const update = () =>
      setViewport({
        "--overlay-viewport-height": `${visual?.height ?? innerHeight}px`,
        "--overlay-viewport-top": `${visual?.offsetTop ?? 0}px`,
      } as CSSProperties);
    const frame = requestAnimationFrame(update);
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
    };
  }, [active, variant]);
  if (!active) return null;
  return createPortal(
    <div
      ref={host}
      data-overlay-root
      data-overlay={title}
      data-overlay-keyboard={
        variant === "mentor" &&
        parseFloat(
          String(viewport["--overlay-viewport-height" as keyof CSSProperties]),
        ) <
          innerHeight * 0.75
          ? "true"
          : undefined
      }
      className="cabinet h-overlay-host"
      style={viewport}
    >
      <dialog
        ref={dialog}
        className={`cab-modal h-overlay-panel h-overlay-${variant} ${panelClassName}`}
        aria-label={title}
        aria-modal="true"
        onCancel={(e) => {
          e.preventDefault();
          if (dismissible) close.current?.();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && dismissible) close.current?.();
        }}
      >
        <div className="cab-modal-content">
          {header && (
            <div className="cab-row h-overlay-header">
              <h2>{title}</h2>
              {onClose && dismissible && (
                <button
                  className="cab-icon-btn"
                  aria-label={c.close}
                  onClick={onClose}
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className="h-overlay-body">{children}</div>
        </div>
      </dialog>
    </div>,
    document.body,
  );
}
