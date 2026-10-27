"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ru } from "@/content/ru";
import CircuitScene from "../circuit/CircuitScene";
import { useCircuitPhase } from "../circuit/CircuitDemo";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Badge, Button } from "../ui/primitives";
export default function Hero({ background }: { background: ReactNode }) {
  const phase = useCircuitPhase();
  const reduced = useReducedMotion();
  const scene = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = scene.current;
    const backdrop = element?.querySelector<HTMLElement>(".hero-background");
    if (!element || !backdrop) return;
    const observer = new IntersectionObserver(([entry]) => {
      backdrop.dataset.active = String(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      className="hero"
      ref={scene}
      onPointerMove={(e) => {
        if (
          reduced ||
          e.pointerType !== "mouse" ||
          !window.matchMedia(
            "(min-width: 769px) and (hover: hover) and (pointer: fine)",
          ).matches
        )
          return;
        const box = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--mouse-x",
          `${((e.clientX - box.left) / box.width - 0.5) * 28}px`,
        );
        e.currentTarget.style.setProperty(
          "--mouse-y",
          `${((e.clientY - box.top) / box.height - 0.5) * 20}px`,
        );
      }}
      onPointerLeave={() => {
        scene.current?.style.setProperty("--mouse-x", "0px");
        scene.current?.style.setProperty("--mouse-y", "0px");
      }}
    >
      {background}
      <div className="hero-content">
        <p className="hero-eyebrow">
          <span aria-hidden="true">✳</span>
          {ru.hero.eyebrow}
        </p>
        <h1>
          {ru.hero.title}
          <br />
          {ru.hero.question}
        </h1>
        <div className="hero-result">
          <strong>{ru.hero.zero}</strong>
          <span>{ru.hero.zeroLabel}</span>
        </div>
        <div className="segment-wrap">
          <div className="segment-bar" aria-hidden="true">
            {ru.hero.segments.map((s) => (
              <span key={s} />
            ))}
          </div>
          <div className="segment-labels">
            {ru.hero.segments.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
        <p className="hero-description">{ru.hero.description}</p>
        <div className="hero-buttons">
          <Button href="/app" size="lg">
            {ru.hero.primary}
            <span aria-hidden="true">↗</span>
          </Button>
          <Button href="#topics" size="lg" variant="secondary">
            {ru.hero.secondary}
            <span aria-hidden="true">↓</span>
          </Button>
        </div>
        <p className="hero-footnote">{ru.hero.footnote}</p>
        <p className="hero-notice">{ru.hero.notice}</p>
      </div>
      <div className="float-card float-left">
        <div className="lesson-card">
          <div className="mini-toolbar">
            <Badge>{ru.hero.lesson}</Badge>
            <span className="mini-dot" aria-hidden="true" />
          </div>
          <CircuitScene phase={phase} />
          <p className="lesson-task">{ru.hero.task}</p>
          <span className="demo-label">{ru.hero.demo}</span>
        </div>
      </div>
      <div className="float-card float-right">
        <div className="check-card" data-phase={phase}>
          <div className="mini-toolbar">
            <span className="check-symbol" aria-hidden="true">
              ⌁
            </span>
            <strong>{ru.hero.checkTitle}</strong>
            <span className="mini-live" aria-hidden="true" />
          </div>
          <div className="error-row">
            <span className={`code ${phase === "fixed" ? "code-ok" : ""}`}>
              {phase === "fixed" ? ru.hero.codes.ok : ru.hero.codes.error}
            </span>
            <span>{phase === "fixed" ? ru.hero.fixed : ru.hero.errors[0]}</span>
          </div>
          <div className="error-row">
            <span
              className={`code ${phase === "fixed" ? "code-ok" : "code-warn"}`}
            >
              {phase === "fixed" ? ru.hero.codes.ok : ru.hero.codes.warning}
            </span>
            <span>
              {phase === "fixed" ? ru.hero.resistorFixed : ru.hero.errors[1]}
            </span>
          </div>
          <div className="error-row">
            <span className="code code-ok">{ru.hero.codes.ok}</span>
            <span>{ru.hero.errors[2]}</span>
          </div>
          <p className="check-hint">{ru.hero.checkHint}</p>
          <span className="demo-label">{ru.hero.demo}</span>
        </div>
      </div>
    </section>
  );
}
