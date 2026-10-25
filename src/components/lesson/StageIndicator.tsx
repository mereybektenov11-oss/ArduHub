import { lessonFlowRu as c } from "@/content/ru";
import {
  canOpenStage,
  lessonStages,
  type LessonFlowState,
  type LessonStage,
} from "@/domain/lessons/flow";
import { computeStageState } from "@/domain/progress/courseState";
export default function StageIndicator({
  flow,
  active,
  onStage,
  lesson,
}: {
  flow: LessonFlowState;
  active: LessonStage;
  onStage: (stage: LessonStage) => void;
  lesson: { id: string };
}) {
  const stages = computeStageState(lesson, flow);
  const verified = { ...flow, stages };
  return (
    <nav className="flow-stage-indicator" aria-label={c.lessonProgress}>
      {lessonStages.map((stage, i) => (
        <button
          key={stage}
          className={
            stages[stage] ? "is-done" : active === stage ? "is-current" : ""
          }
          aria-current={active === stage ? "step" : undefined}
          disabled={!canOpenStage(verified, stage)}
          onClick={() => onStage(stage)}
        >
          <span aria-hidden="true">{stages[stage] ? "✓" : i + 1}</span>
          {c.stages[i]}
        </button>
      ))}
    </nav>
  );
}
