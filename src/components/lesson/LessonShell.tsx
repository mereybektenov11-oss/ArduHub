"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useProgress } from "@/lib/useProgress";
import { activeStreak } from "@/domain/progress/streak";
import CabinetArt, { type ArtName } from "@/components/cabinet/CabinetArt";
import CabinetIcon from "@/components/icons/NavigationIcon";
import RewardIcon from "@/components/icons/RewardIcon";
import { openMentor } from "@/components/mentor/openMentor";
import { lessonFlowRu as c, learningRu } from "@/content/ru";
import TopProgressLine from "./TopProgressLine";
import SettingsIcon from "@/components/icons/SettingsIcon";
import { kidsWorkspaceRu as k } from "@/content/kids-workspace.ru";
export default function LessonShell({
  children,
  title = c.course,
  loading = false,
  progress = 0,
  indicator,
  onVideo,
  onReference,
  nudge,
}: {
  children: ReactNode;
  title?: string;
  loading?: boolean;
  progress?: number;
  indicator?: ReactNode;
  onVideo?: () => void;
  onReference?: () => void;
  nudge?: ReactNode;
}) {
  const { progress: p, update } = useProgress();
  return (
    <div className="flow-shell">
      <header className="flow-header" data-tour="lesson-header">
        <Link className="cab-icon-btn" href="/app" aria-label={c.back}>
          ×
        </Link>
        <span className="flow-course-title">{title}</span>
        <div className="flow-header-stage" data-tour="lesson-steps">
          {indicator ?? <span>{c.stages.join(" · ")}</span>}
        </div>
        <div className="flow-counters">
          <span title={c.course}>
            <RewardIcon kind="flame" />
            {activeStreak(p.streak)}
          </span>
          <span>
            <RewardIcon kind="spark" />
            {p.sparks}
          </span>
          <span>
            <RewardIcon kind="token" />
            {p.mentor.tokens}
          </span>
        </div>
      </header>
      <TopProgressLine loading={loading} value={progress} />
      <nav className="flow-side-tools" aria-label={c.reference}>
        <button
          title={c.videoAndNotes}
          aria-label={c.videoAndNotes}
          onClick={onVideo}
          disabled={!onVideo}
        >
          <CabinetIcon name="book" />
        </button>
        {onReference ? (
          <button
            title={c.reference}
            aria-label={c.reference}
            onClick={onReference}
          >
            <CabinetIcon name="map" />
          </button>
        ) : (
          <Link
            title={c.reference}
            aria-label={c.reference}
            href="/app/practice?tab=glossary"
          >
            <CabinetIcon name="map" />
          </Link>
        )}
        <button
          title={c.mentor}
          aria-label={c.mentor}
          data-tour="mentor"
          onClick={() => openMentor()}
        >
          <CabinetArt name={p.mentor.selectedId as ArtName} alt="" size={28} />
        </button>
        {nudge}
      </nav>
      <div className="flow-stage-content" aria-busy={loading}>
        <details className="kids-lesson-settings">
          <summary className="cab-icon-btn" aria-label={k.settings}>
            <SettingsIcon />
          </summary>
          <label className="l2-text-size flow-text-size kids-options-panel">
            {learningRu.textSize}
            <select
              aria-label={learningRu.textSize}
              value={p.settings?.textScale ?? 1}
              onChange={(e) =>
                update((x) => ({
                  ...x,
                  settings: {
                    ...x.settings,
                    textScale: Number(e.target.value) as 1 | 1.15 | 1.3,
                  },
                }))
              }
            >
              {learningRu.textSizes.map((name, i) => (
                <option key={name} value={[1, 1.15, 1.3][i]}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </details>
        {children}
      </div>
    </div>
  );
}
