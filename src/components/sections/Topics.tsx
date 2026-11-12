"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ru } from "@/content/ru";
import Link from "next/link";
import { SectionShell, SectionTitle } from "../ui/primitives";
import { Stagger, StaggerItem } from "../ui/Stagger";
function TopicSurface({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <article
      className={`topic topic-${index}`}
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          !window.matchMedia(
            "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
          ).matches
        )
          return;
        const node = event.currentTarget;
        const x = event.clientX,
          y = event.clientY;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const rect = node.getBoundingClientRect();
          node.style.setProperty("--mx", `${x - rect.left}px`);
          node.style.setProperty("--my", `${y - rect.top}px`);
        });
      }}
    >
      {children}
    </article>
  );
}
export default function Topics() {
  return (
    <SectionShell tone="dark" id="topics">
      <SectionTitle title={ru.section.topics} sub={ru.section.topicsSub} />
      <Stagger className="topics-grid">
        {ru.topics.map((t, i) => (
          <StaggerItem key={t.id}>
            <TopicSurface index={i}>
              <div className="topic-heading">
                <span className="topic-letter" aria-hidden="true">
                  {t.letter}
                </span>
                <span className="topic-index">0{i + 1}</span>
              </div>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
              <span className="topic-lessons">{ru.ui.lessonCount}</span>
              <div className="topic-actions">
                <Link href="/app/profile/desktop" className="text-button">
                  {ru.ui.openLessons}
                  <span aria-hidden="true">↗</span>
                </Link>
                <a
                  className="text-button"
                  href="#bank"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("arduhub:topic", {
                        detail: ["led", "button", "sensor", "motor"].includes(
                          t.id,
                        )
                          ? t.id
                          : "",
                      }),
                    )
                  }
                >
                  {ru.ui.schemeBank}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </TopicSurface>
          </StaggerItem>
        ))}
      </Stagger>
    </SectionShell>
  );
}
