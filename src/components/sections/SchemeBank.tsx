"use client";
import { useEffect, useRef, useState } from "react";
import { ru, type SchemeItem } from "@/content/ru";
import { emptyFilters, filterSchemes, type Filters } from "@/lib/filterSchemes";
import { Chip, SectionShell } from "../ui/primitives";
import CircuitScene from "../circuit/CircuitScene";
import { LayoutGroup } from "motion/react";
import { DeferredPresence, useMotionFeaturesReady } from "../ui/DeferredMotion";
import { div as MotionDiv, span as MotionSpan } from "motion/react-m";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { motionTokens } from "@/lib/motion";
import { useInViewOnce } from "@/lib/useInViewOnce";
import { Stagger, StaggerItem } from "../ui/Stagger";
import Reveal from "../ui/Reveal";
import AnimatedSectionTitle from "../ui/AnimatedSectionTitle";
import AnimatedNumber from "../ui/AnimatedNumber";

function SchemeThumbnail({ scheme }: { scheme: SchemeItem }) {
  const { ref } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`scheme-thumbnail animated-scheme thumbnail-${scheme.topic}`}
      data-status={scheme.status}
    >
      <CircuitScene
        phase={scheme.status === "error" ? "error" : "fixed"}
        decorative
        compact
      />
      <span className={`scheme-status status-${scheme.status}`}>
        {ru.ui.statuses[scheme.status]}
      </span>
    </div>
  );
}
export default function SchemeBank() {
  const featuresReady = useMotionFeaturesReady();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<SchemeItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const triggerId = useRef<string | null>(null);
  const pendingFocus = useRef(false);
  const browserPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (featuresReady && pendingFocus.current) {
      pendingFocus.current = false;
      if (document.activeElement === document.body)
        browserPanel.current
          ?.querySelector<HTMLButtonElement>(
            `[data-scheme-id="${triggerId.current}"]`,
          )
          ?.focus();
    }
  }, [featuresReady]);
  const reduced = useReducedMotion();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastFilter, setLastFilter] = useState<Record<string, string>>({});
  function requestClose() {
    if (closeTimer.current) return;
    if (reduced) {
      dialog.current?.close();
      return;
    }
    if (dialog.current) dialog.current.dataset.closing = "true";
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      dialog.current?.close();
    }, motionTokens.duration.exit * 1000);
  }
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  useEffect(() => {
    const panel = browserPanel.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => {
      panel.dataset.active = String(entry.isIntersecting);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function update(event: Event) {
      const topic = (event as CustomEvent<string>).detail;
      setFilters({ ...emptyFilters, topic: topic ? [topic] : [] });
    }
    window.addEventListener("arduhub:topic", update);
    return () => window.removeEventListener("arduhub:topic", update);
  }, []);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  function toggle(group: keyof Filters, value: string) {
    setLastFilter((previous) => ({ ...previous, [group]: value }));
    setFilters((prev) => ({
      ...prev,
      [group]: prev[group].includes(value)
        ? prev[group].filter((v) => v !== value)
        : [...prev[group], value],
    }));
  }
  const visible = filterSchemes(ru.schemes, filters);
  const groups = [
    { key: "topic", label: ru.ui.theme, values: ru.ui.themes },
    { key: "level", label: ru.ui.level, values: ru.ui.levels },
    { key: "status", label: ru.ui.status, values: ru.ui.statuses },
  ] as const;
  return (
    <SectionShell id="bank" className="bank-section">
      <AnimatedSectionTitle title={ru.section.bank} sub={ru.section.bankSub} />
      <div className="scheme-browser" ref={browserPanel}>
        <div className="browser-bar">
          <span className="browser-brand">
            <span aria-hidden="true">⌘</span>
            {ru.ui.schemeBank}
          </span>
          <span className="demo-label">{ru.hero.demo}</span>
        </div>
        <Reveal>
          <div className="filter-panel">
            {groups.map((group) => (
              <fieldset className="filter-group" key={group.key}>
                <legend>{group.label}</legend>
                <div className="filter-options">
                  <LayoutGroup id={`bank-filter-${group.key}`}>
                    {Object.entries(group.values).map(([value, label]) => (
                      <Chip
                        key={value}
                        aria-pressed={filters[group.key].includes(value)}
                        onClick={() => toggle(group.key, value)}
                      >
                        {filters[group.key].includes(value) &&
                          ((filters[group.key].includes(lastFilter[group.key])
                            ? lastFilter[group.key]
                            : filters[group.key].at(-1)) === value ? (
                            <MotionSpan
                              className="filter-pill"
                              layoutId={`active-${group.key}`}
                              transition={{
                                duration: reduced
                                  ? 0
                                  : motionTokens.duration.dialog,
                                ease: motionTokens.easeOut,
                              }}
                            />
                          ) : (
                            <span className="filter-pill" />
                          ))}
                        <span className="filter-label">{label}</span>
                      </Chip>
                    ))}
                  </LayoutGroup>
                </div>
              </fieldset>
            ))}
          </div>
        </Reveal>
        <div className="results-bar">
          <p role="status" aria-live="polite">
            {ru.ui.found}:{" "}
            <strong>
              <AnimatedNumber value={visible.length} />
            </strong>
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => setFilters(emptyFilters)}
          >
            {ru.ui.reset}
            <span aria-hidden="true">↻</span>
          </button>
        </div>
        <Stagger className="scheme-grid" interval={motionTokens.bankStagger}>
          <DeferredPresence>
            {visible.map((s, index) => (
              <MotionDiv
                key={s.id}
                // Register layout measurement on the first mount; reduced motion
                // uses zero duration instead of disabling registration.
                layout="position"
                className="scheme-layout"
                initial={
                  reduced || !featuresReady
                    ? false
                    : { opacity: 0, scale: 0.96 }
                }
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: reduced ? 1 : 0.96,
                  transition: {
                    duration: reduced ? 0 : motionTokens.duration.exit,
                  },
                }}
                transition={{
                  duration: reduced ? 0 : motionTokens.duration.state,
                  ease: motionTokens.easeOut,
                }}
              >
                <StaggerItem
                  className="scheme-stagger-item"
                  delay={Math.min(index, 11) * motionTokens.bankStagger}
                >
                  <button
                    type="button"
                    className="scheme-item"
                    data-scheme-id={s.id}
                    onClick={(e) => {
                      trigger.current = e.currentTarget;
                      triggerId.current = s.id;
                      setSelected(s);
                    }}
                  >
                    <SchemeThumbnail scheme={s} />
                    <div className="scheme-description">
                      <span className="scheme-meta">
                        {ru.ui.levels[s.level]}
                        <span aria-hidden="true">·</span>
                        {ru.ui.themes[s.topic as keyof typeof ru.ui.themes]}
                      </span>
                      <h3>{s.title}</h3>
                      <span className="scheme-open" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                  </button>
                </StaggerItem>
              </MotionDiv>
            ))}
          </DeferredPresence>
        </Stagger>
        {!visible.length && <p className="empty-state">{ru.ui.empty}</p>}
      </div>
      <dialog
        className="scheme-dialog"
        ref={dialog}
        onClose={() => {
          if (dialog.current) delete dialog.current.dataset.closing;
          setSelected(null);
          pendingFocus.current = !featuresReady;
          const restore = trigger.current?.isConnected
            ? trigger.current
            : browserPanel.current?.querySelector<HTMLButtonElement>(
                `[data-scheme-id="${triggerId.current}"]`,
              );
          restore?.focus();
        }}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        aria-labelledby="scheme-dialog-title"
      >
        <button
          type="button"
          className="dialog-close"
          aria-label={ru.ui.close}
          onClick={requestClose}
        >
          ×
        </button>
        <p className="demo-label">{ru.hero.demo}</p>
        <h3 id="scheme-dialog-title">{selected?.title}</h3>
        <CircuitScene
          phase={selected?.status === "error" ? "error" : "fixed"}
        />
        <p>{ru.ui.demoNote}</p>
      </dialog>
    </SectionShell>
  );
}
