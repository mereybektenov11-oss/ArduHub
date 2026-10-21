import type { Draft } from "@/domain/projects/storage";
export const lessonStages = ["video", "test", "practice"] as const;
export type LessonStage = (typeof lessonStages)[number];
export type FlowQuestion = {
  id: string;
  text: string;
  options: readonly string[];
  correctIndex: number;
  explanation: string;
};
export type FlowQuiz = {
  answers: Record<string, number>;
  current: number;
  phase: "questions" | "result" | "review" | "reviewResult";
  lastScore: number;
  retryQueue: string[];
  retryAnswers: Record<string, number>;
  retryCurrent: number;
  attempts: number;
  awarded: string[];
  awardedAnswers?: Record<string, number>;
};
export type LessonFlowState = {
  tab?: "circuit" | "code" | "serial";
  version: 2;
  stage: LessonStage;
  stages: Record<LessonStage, boolean>;
  practice: { circuit: boolean; code: boolean; run: boolean };
  quiz: FlowQuiz;
};
export function initialFlowQuiz(): FlowQuiz {
  return {
    answers: {},
    current: 0,
    phase: "questions",
    lastScore: 0,
    retryQueue: [],
    retryAnswers: {},
    retryCurrent: 0,
    attempts: 1,
    awarded: [],
    awardedAnswers: {},
  };
}
export function firstUnfinished(flow: LessonFlowState): LessonStage {
  return lessonStages.find((s) => !flow.stages[s]) ?? "practice";
}
export function canOpenStage(flow: LessonFlowState, stage: LessonStage) {
  return (
    stage === "video" ||
    (flow.stages.video && (stage === "test" || flow.stages.test))
  );
}
export function resolveStage(
  flow: LessonFlowState,
  requested: string | null | undefined,
): LessonStage {
  return lessonStages.includes(requested as LessonStage) &&
    canOpenStage(flow, requested as LessonStage)
    ? (requested as LessonStage)
    : firstUnfinished(flow);
}
export function flowPercent(flow: LessonFlowState) {
  return Math.round(
    ([
      flow.stages.video,
      flow.stages.test,
      flow.practice.circuit,
      flow.practice.code,
      flow.practice.run,
    ].filter(Boolean).length /
      5) *
      100,
  );
}
export function migrateLessonFlow(draft: Draft): LessonFlowState {
  if (isLessonFlow(draft.flow)) return structuredClone(draft.flow);
  const s = draft.steps;
  const test = Boolean(s.quiz ?? (s.circuit || s.code || s.run));
  const video = Boolean(
    (s.video && s.theory) || test || s.circuit || s.code || s.run,
  );
  const quiz = initialFlowQuiz();
  if (draft.quiz) {
    draft.quiz.answers.forEach((a, i) => {
      if (a !== null) quiz.answers[`q${i + 1}`] = a;
    });
    quiz.current = draft.quiz.current;
    quiz.attempts = Math.max(1, draft.quiz.attempts);
    quiz.phase = draft.quiz.submitted ? "result" : "questions";
  }
  const flow: LessonFlowState = {
    tab: draft.step === 3 ? "code" : "circuit",
    version: 2,
    stage: "video",
    stages: { video, test, practice: !!s.run },
    practice: { circuit: s.circuit, code: s.code, run: s.run },
    quiz,
  };
  flow.stage = firstUnfinished(flow);
  return flow;
}
export function isLessonFlow(v: unknown): v is LessonFlowState {
  if (!v || typeof v !== "object") return false;
  const f = v as LessonFlowState,
    q = f.quiz;
  const answers = (a: unknown) =>
    !!a &&
    typeof a === "object" &&
    !Array.isArray(a) &&
    Object.keys(a).length <= 100 &&
    Object.entries(a).every(
      ([k, n]) =>
        /^q\d{1,3}$/.test(k) && Number.isInteger(n) && n >= 0 && n < 4,
    );
  return (
    f.version === 2 &&
    (f.tab === undefined || ["circuit", "code", "serial"].includes(f.tab)) &&
    lessonStages.includes(f.stage) &&
    !!f.stages &&
    lessonStages.every((s) => typeof f.stages[s] === "boolean") &&
    !!f.practice &&
    [f.practice.circuit, f.practice.code, f.practice.run].every(
      (n) => typeof n === "boolean",
    ) &&
    !!q &&
    answers(q.answers) &&
    answers(q.retryAnswers) &&
    (q.awardedAnswers === undefined || answers(q.awardedAnswers)) &&
    Number.isInteger(q.current) &&
    q.current >= 0 &&
    q.current < 100 &&
    ["questions", "result", "review", "reviewResult"].includes(q.phase) &&
    Number.isInteger(q.lastScore) &&
    q.lastScore >= 0 &&
    q.lastScore <= 100 &&
    Number.isInteger(q.retryCurrent) &&
    q.retryCurrent >= 0 &&
    q.retryCurrent < 100 &&
    Number.isInteger(q.attempts) &&
    q.attempts >= 1 &&
    Array.isArray(q.retryQueue) &&
    q.retryQueue.length <= 100 &&
    q.retryQueue.every((k) => /^q\d{1,3}$/.test(k)) &&
    Array.isArray(q.awarded) &&
    q.awarded.length <= 100 &&
    q.awarded.every((k) => /^q\d{1,3}$/.test(k))
  );
}
export function flowQuizResult(
  questions: readonly FlowQuestion[],
  state: FlowQuiz,
  passPercent = 70,
) {
  const answers = { ...state.answers, ...state.retryAnswers };
  const score = questions.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;
  const complete = questions.every(
    (q) =>
      Number.isInteger(answers[q.id]) &&
      answers[q.id] >= 0 &&
      answers[q.id] < q.options.length,
  );
  return {
    score,
    total: questions.length,
    percent: questions.length
      ? Math.round((score / questions.length) * 100)
      : 100,
    passed:
      questions.length === 0 ||
      (complete && score * 100 >= questions.length * passPercent),
    wrong: questions
      .filter((q) => answers[q.id] !== q.correctIndex)
      .map((q) => q.id),
  };
}
