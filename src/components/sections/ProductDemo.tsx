"use client";

import { useState } from "react";
import { ru } from "@/content/ru";
import CircuitScene, { type Phase } from "../circuit/CircuitScene";
import Reveal from "../ui/Reveal";

const exampleCode = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`;

export default function ProductDemo() {
  const [phase, setPhase] = useState<Phase>("drawing");
  const index = phase === "drawing" ? 0 : phase === "error" ? 1 : 2;
  return (
    <section id="product-demo" className="product-demo-section section">
      <div className="shell">
        <Reveal className="product-demo-intro">
          <p className="landing-kicker">{ru.landing.productLabel}</p>
          <h2>{ru.landing.demoTitle}</h2>
          <p>{ru.landing.demoDescription}</p>
        </Reveal>
        <Reveal>
          <div className="product-window">
            <div className="product-titlebar">
              <span className="product-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>{ru.landing.demoBoard}</span>
              <span className="product-example-label">
                {ru.landing.demoLabel}
              </span>
            </div>
            <div className="product-workspace">
              <aside className="product-sidebar">
                <span className="product-lesson-index" aria-hidden="true">
                  01
                </span>
                <h3>{ru.landing.demoLesson}</h3>
                <p>{ru.landing.demoTask}</p>
                <ol>
                  {ru.landing.demoSteps.map((step, i) => (
                    <li className={i === index ? "is-current" : ""} key={step}>
                      <span>0{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </aside>
              <div className="product-canvas">
                <div className="product-canvas-label">
                  <span>{ru.landing.canvasLabel}</span>
                  <span aria-hidden="true">＋ − ⤢</span>
                </div>
                <CircuitScene phase={phase} />
                <div
                  className={`product-feedback product-feedback-${phase}`}
                  role="status"
                  aria-live="polite"
                >
                  <span className="product-feedback-symbol" aria-hidden="true">
                    {phase === "fixed" ? "✓" : phase === "error" ? "!" : "⌁"}
                  </span>
                  <div>
                    <strong>{ru.landing.demoStatus[index]}</strong>
                    <p>
                      {phase === "error"
                        ? ru.landing.demoHint
                        : phase === "fixed"
                          ? ru.landing.demoSuccess
                          : ru.landing.demoInitial}
                    </p>
                  </div>
                </div>
              </div>
              <div className="product-code">
                <span>
                  {ru.landing.demoCode}
                  <span aria-hidden="true">C++</span>
                </span>
                <pre>
                  <code>{exampleCode}</code>
                </pre>
                <div className="product-code-note">
                  {ru.landing.exampleNote}
                </div>
              </div>
            </div>
            <div className="product-controls">
              <span className="product-controls-note">
                {ru.landing.demoLabel}
              </span>
              <div>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setPhase("drawing")}
                >
                  {ru.landing.demoReset}
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() =>
                    setPhase(phase === "error" ? "fixed" : "error")
                  }
                >
                  {phase === "error"
                    ? ru.landing.demoFix
                    : ru.landing.demoError}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
