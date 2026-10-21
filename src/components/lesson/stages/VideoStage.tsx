"use client";
import type { LearningLesson } from "@/domain/lessons/content";
import { lessonFlowRu as c } from "@/content/ru";
import { Stagger, StaggerItem } from "@/components/ui/Stagger";
import { motionTokens } from "@/lib/motion";
import VideoStep from "../VideoStep";
export default function VideoStage({
  lesson,
  completed,
  onUnlock,
  onContinue,
}: {
  lesson: LearningLesson;
  completed: boolean;
  onUnlock: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flow-video-stage">
      <h1>{lesson.title}</h1>
      <VideoStep
        lessonId={lesson.id}
        completed={completed}
        onUnlock={onUnlock}
        onDone={onContinue}
        nextLabel={lesson.quiz?.questions.length ? c.toTest : c.toPractice}
      />
      <section className="flow-theory l2-theory" aria-label={c.summary}>
        <h2>{c.summary}</h2>
        <Stagger interval={motionTokens.lessonFlow.stagger}>
          {lesson.theory.slice(0, 5).map((block, i) => (
            <StaggerItem key={block.title}>
              <section className="flow-note-block">
                <span className="flow-note-number" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </div>
              </section>
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </div>
  );
}
