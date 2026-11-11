"use client";
import { interfaceCopy as uiCopy } from "@/content/cabinet.ru";
import Link from "next/link";
import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import Reveal from "@/components/ui/Reveal";
import Overlay from "@/components/overlay/Overlay";

import Boxicon from "@/components/icons/Boxicon";
export function Card({
  children,
  className = "",
  tour,
}: {
  children: ReactNode;
  className?: string;
  tour?: string;
}) {
  return (
    <section className={`cab-card ${className}`} data-tour={tour}>
      {children}
    </section>
  );
}
export function Action({
  children,
  href,
  secondary = false,
  prefetch,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  secondary?: boolean;
  prefetch?: boolean;
}) {
  const className = `cab-btn ${secondary ? "cab-btn-secondary" : ""} ${props.className ?? ""}`;
  return href ? (
    <Link className={className} href={href} prefetch={prefetch}>
      {children}
    </Link>
  ) : (
    <button {...props} className={className}>
      {children}
    </button>
  );
}
export function Pill({ children }: { children: ReactNode }) {
  return <span className="cab-pill">{children}</span>;
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="cab-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function SkillBar({ title, value }: { title: string; value: number }) {
  return (
    <div className="cab-skill">
      <span>{title}</span>
      <ProgressBar value={value} label={title} />
      <strong>{value}%</strong>
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: string; title: string }[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div className="cab-tabs" role="group" aria-label={label}>
      {items.map((i) => (
        <button
          key={i.id}
          aria-pressed={value === i.id}
          onClick={() => onChange(i.id)}
        >
          {i.title}
        </button>
      ))}
    </div>
  );
}
export function Modal(
  props: import("@/components/overlay/Overlay").OverlayProps,
) {
  return <Overlay {...props} />;
}
export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <span className="cab-tooltip" tabIndex={0}>
      {children}
      <span role="tooltip">{text}</span>
    </span>
  );
}
export function Avatar({ children }: { children: ReactNode }) {
  return <span className="cab-avatar">{children}</span>;
}
export function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <Pill>
      {value} {label}
    </Pill>
  );
}
export function GradientCard({
  children,
  tone = "forest",
}: {
  children: ReactNode;
  tone?: "forest" | "amber" | "sea";
}) {
  return (
    <Reveal className={`cab-gradient cab-gradient-${tone}`}>{children}</Reveal>
  );
}
export function HorizontalShelf({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const wheel = (e: WheelEvent) => {
      const can =
        el.scrollWidth > el.clientWidth &&
        ((e.deltaY > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth) ||
          (e.deltaY < 0 && el.scrollLeft > 0));
      if (can && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const scroll = (left: number) =>
    ref.current?.scrollBy({
      left,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  return (
    <section className="cab-stack">
      <div className="cab-row">
        <h2>{title}</h2>
        <div className="cab-row">
          <button
            className="cab-icon-btn"
            aria-label={uiCopy.text043(title)}
            onClick={() => scroll(-280)}
          >
            <Boxicon name="back" />
          </button>
          <button
            className="cab-icon-btn"
            aria-label={uiCopy.text044(title)}
            onClick={() => scroll(280)}
          >
            <Boxicon name="next" />
          </button>
        </div>
      </div>
      <div className="cab-shelf" ref={ref} tabIndex={0} aria-label={title}>
        {children}
      </div>
    </section>
  );
}
