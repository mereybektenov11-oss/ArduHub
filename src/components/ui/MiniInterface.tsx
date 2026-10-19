"use client";
import { ru } from "@/content/ru";
import { useInViewOnce } from "@/lib/useInViewOnce";
import AnimatedNumber from "./AnimatedNumber";
import CircuitScene from "../circuit/CircuitScene";
import StaticCircuit from "../circuit/StaticCircuit";
export default function MiniInterface({
  kind,
  animated = false,
}: {
  kind: number;
  animated?: boolean;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  return (
    <div
      ref={animated ? ref : undefined}
      className={`mini-interface mini-kind-${kind} ${animated ? "mini-animated" : ""}`}
    >
      <div className="mini-interface-bar">
        <span className="mini-brand">{ru.brand}</span>
        <span className="mini-window-dots" aria-hidden="true">
          •••
        </span>
      </div>
      {kind === 0 ? (
        <div className="lesson-preview">
          <span className="lesson-number" aria-hidden="true">
            04
          </span>
          <span className="mini-muted">{ru.ui.progress}</span>
          <h3>{ru.ui.lesson}</h3>
          <div className="progress-track">
            <span />
          </div>
          <span className="mini-action">
            {ru.ui.continue}
            <span aria-hidden="true">↗</span>
          </span>
        </div>
      ) : kind === 1 ? (
        <div className="video-preview">
          <div className="video-screen">
            <span className="play-circle" aria-hidden="true">
              ▶
            </span>
            <StaticCircuit decorative />
            <span className="video-duration">{ru.ui.duration}</span>
          </div>
          <strong>{ru.ui.video}</strong>
          {animated && (
            <div className="video-progress" aria-hidden="true">
              <span />
            </div>
          )}
          <p className="mini-muted">{ru.ui.videoNotice}</p>
          <span className="mini-action">
            {ru.ui.assignment}
            <span aria-hidden="true">↗</span>
          </span>
        </div>
      ) : kind === 2 ? (
        <div className="editor-preview">
          <div className="editor-tools" aria-hidden="true">
            <span>＋</span>
            <span>⌁</span>
            <span>↶</span>
          </div>
          {animated ? <CircuitScene /> : <StaticCircuit />}
          <div className="editor-status">
            <span className="mini-live" aria-hidden="true" />
            {ru.hero.ready}
          </div>
        </div>
      ) : kind === 3 ? (
        <div className="mentor-preview">
          <span className="error-banner">
            <span aria-hidden="true">!</span>
            {ru.hero.errors[0]}
          </span>
          <div className="mentor-bubble">
            <div className="mentor-avatar" aria-hidden="true">
              ✳
            </div>
            <strong>{ru.ui.hint}</strong>
            <p>{ru.ui.hintText}</p>
          </div>
        </div>
      ) : (
        <div className="repeat-preview">
          <strong>
            {animated ? (
              <>
                {ru.ui.repeatLabel}:{" "}
                <AnimatedNumber value={3} from={0} active={inView} />
              </>
            ) : (
              ru.ui.repeat
            )}
          </strong>
          {[ru.schemes[0], ru.schemes[3], ru.schemes[6]].map((s, i) => (
            <div className="repeat-row" key={s.id}>
              <span className="repeat-index">0{i + 1}</span>
              <span>{s.title}</span>
              <span aria-hidden="true">↗</span>
            </div>
          ))}
          <span className="mini-action">
            {ru.ui.startRepeat}
            <span aria-hidden="true">→</span>
          </span>
        </div>
      )}
      <span className="mini-demo">{ru.hero.demo}</span>
    </div>
  );
}
