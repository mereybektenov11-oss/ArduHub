import type { LessonProgress, Progress } from "@/domain/types";
import type { FlowQuestion, LessonFlowState } from "@/domain/lessons/flow";
import { lessonQuizzes } from "@/content/lesson-quiz.ru";
import { lessons } from "@/domain/seed";
import { levelFromXp } from "./levels";

type CourseLesson = {
  id: string;
  quiz?: { passPercent: number; questions: readonly FlowQuestion[] };
};
type Evidence = LessonProgress | LessonFlowState;
export function computeStageState(
  lesson: CourseLesson,
  progress: Pick<Progress, "lessons"> | Evidence,
): LessonFlowState["stages"] {
  const p: Evidence | undefined =
    "lessons" in progress ? progress.lessons[lesson.id] : progress;
  const video = Boolean(
    p?.stages?.video === true &&
    (p.video?.confirmed === true ||
      (Number.isFinite(p.video?.watchedRatio) &&
        p.video!.watchedRatio! >= 0.8)),
  );
  const questions =
    lesson.quiz?.questions ??
    (lessonQuizzes[lesson.id] ?? []).map((q, i) => ({
      id: `q${i + 1}`,
      correctIndex: q.correct,
      options: [...q.options, ""],
    }));
  const answers = { ...p?.quiz?.answers, ...p?.quiz?.retryAnswers };
  const answered =
    questions.length > 0 &&
    questions.every(
      (q) =>
        Number.isInteger(answers[q.id]) &&
        answers[q.id] >= 0 &&
        answers[q.id] < q.options.length,
    );
  const score = questions.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;
  const test =
    video &&
    Boolean(
      p?.stages?.test === true &&
      p.quiz &&
      ["result", "review", "reviewResult"].includes(p.quiz.phase) &&
      answered &&
      score * 100 >= questions.length * (lesson.quiz?.passPercent ?? 70),
    );
  const practice =
    test &&
    Boolean(
      p?.stages?.practice === true &&
      p.practice?.circuit === true &&
      p.practice.code === true &&
      p.practice.run === true,
    );
  return { video, test, practice };
}

export function computeCourseState(
  course: readonly CourseLesson[],
  progress: Pick<Progress, "lessons">,
) {
  let current = false;
  return course.map((lesson) => {
    const stages = computeStageState(lesson, progress);
    const done =
      !current &&
      progress.lessons[lesson.id]?.status === "done" &&
      stages.practice;
    const status: LessonProgress["status"] = done
      ? "done"
      : current
        ? "locked"
        : "current";
    if (!done) current = true;
    return { id: lesson.id, status, stages };
  });
}

export function normalizeProgress(progress: Progress): Progress {
  const states = computeCourseState(lessons, progress);
  return {
    ...progress,
    progressEvidenceVersion: 1,
    profile: { ...progress.profile, level: levelFromXp(progress.xp) },
    lessons: Object.fromEntries(
      states.map(({ id, status, stages }) => [
        id,
        {
          ...progress.lessons[id],
          // Preserve the receipt even if legacy completion had no stage evidence.
          rewarded:
            progress.lessons[id]?.rewarded ??
            progress.lessons[id]?.status === "done",
          completionSource:
            status === "done"
              ? (progress.lessons[id]?.completionSource ?? "lesson")
              : progress.lessons[id]?.completionSource,
          status,
          stages,
        },
      ]),
    ),
  };
}
