"use client";
import { ru } from "@/content/ru";
import { useSteps } from "@/lib/useSteps";
import { SectionShell, SectionTitle } from "../ui/primitives";
import MiniInterface from "../ui/MiniInterface";
import { AnimatePresence } from "motion/react";
import { div as MotionDiv } from "motion/react-m";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { motionTokens } from "@/lib/motion";
export default function HowItWorks() {
  const { active, setActive, sentinels, buttons, onKey } = useSteps(5);
  const reduced = useReducedMotion();
  return (
    <SectionShell tone="dark" id="how-it-works" className="how-section">
      <SectionTitle title={ru.section.how} sub={ru.section.howSub} />
      <div className="how-layout">
        <div className="step-navigation">
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={ru.section.how}
            onKeyDown={onKey}
          >
            {ru.steps.map((s, i) => (
              <button
                type="button"
                role="tab"
                id={`step-tab-${i}`}
                key={s.id}
                aria-selected={active === i}
                aria-controls="step-panel"
                tabIndex={active === i ? 0 : -1}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                onClick={() => setActive(i)}
                className={`step-button ${active === i ? "active" : ""}`}
              >
                <span className="step-number">0{i + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  <span className="step-description">
                    <span>{s.description}</span>
                  </span>
                </span>
                <span className="step-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="step-scroll">
          <div
            className="step-stage"
            id="step-panel"
            role="tabpanel"
            aria-labelledby={`step-tab-${active}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <MotionDiv
                key={active}
                className="step-transition"
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduced
                    ? { opacity: 1 }
                    : {
                        opacity: 0,
                        y: -12,
                        transition: {
                          duration: motionTokens.duration.stepExit,
                          ease: motionTokens.easeInOut,
                        },
                      }
                }
                transition={{
                  duration: reduced ? 0 : motionTokens.duration.state,
                  ease: motionTokens.easeOut,
                }}
              >
                <MiniInterface kind={active} />
              </MotionDiv>
            </AnimatePresence>
            <p className="step-caption">{ru.steps[active].description}</p>
          </div>
          {ru.steps.map((s, i) => (
            <div
              aria-hidden="true"
              data-step={i}
              className="step-sentinel"
              key={s.id}
              ref={(el) => {
                sentinels.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>
      <div className="mobile-steps">
        {ru.steps.map((s, i) => (
          <div className="mobile-step" key={s.id}>
            <h3>
              <span>0{i + 1}</span>
              {s.title}
            </h3>
            <p>{s.description}</p>
            <MiniInterface kind={i} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
