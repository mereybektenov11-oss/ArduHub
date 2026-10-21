import { lessonFlowRu as c } from "@/content/ru";
import {
  canOpenStage,
  lessonStages,
  type LessonFlowState,
  type LessonStage,
} from "@/domain/lessons/flow";
export default function StageIndicator({
  flow,
  active,
  onStage,
}: {
  flow: LessonFlowState;
  active: LessonStage;
  onStage: (stage: LessonStage) => void;
}) {
  return (
    <nav className="flow-stage-indicator" aria-label={c.lessonProgress}>
      {lessonStages.map((stage, i) => (
        <button
          key={stage}
          className={
            flow.stages[stage]
              ? "is-done"
              : active === stage
                ? "is-current"
                : ""
          }
          aria-current={active === stage ? "step" : undefined}
          disabled={!canOpenStage(flow, stage)}
          onClick={() => onStage(stage)}
        >
          <span aria-hidden="true">{flow.stages[stage] ? "✓" : i + 1}</span>
          {c.stages[i]}
        </button>
      ))}
    </nav>
  );
}
