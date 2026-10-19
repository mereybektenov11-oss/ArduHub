import type { Progress, Topic } from "./types";
import { topics } from "./types";
import { diagnosticDeck } from "@/content/cabinet.ru";
import { lessons } from "./seed";
import { lessonOpen } from "./progress/xp";
export function diagnosticResult(answers: number[]) {
  const scores = Object.fromEntries(
    topics.map((topic) => {
      const questions = diagnosticDeck
        .map((q, i) => ({ q, i }))
        .filter((x) => x.q.topic === topic);
      return [
        topic,
        Math.round(
          (questions.filter((x) => answers[x.i] === x.q.correct).length /
            questions.length) *
            100,
        ),
      ];
    }),
  ) as Record<Topic, number>;
  return {
    scores,
    level: Math.min(
      4,
      Math.floor(
        diagnosticDeck.filter((q, i) => answers[i] === q.correct).length / 2,
      ),
    ),
  };
}
export function answerDiagnostic(p: Progress, answer: number): Progress {
  if (p.diagnostic.status === "done" || p.diagnostic.answers.length >= 8)
    return p;
  const answers = [...p.diagnostic.answers, answer],
    done = answers.length === 8;
  const result = diagnosticResult(answers);
  const next: Progress = {
    ...p,
    profile: {
      ...p.profile,
      level: done ? Math.max(p.profile.level, result.level) : p.profile.level,
    },
    diagnostic: {
      status: done ? "done" : "inprogress",
      answers,
      skillScores: done ? result.scores : p.diagnostic.skillScores,
    },
    lessons: { ...p.lessons },
  };
  if (done)
    for (const l of lessons)
      if (next.lessons[l.id].status !== "done")
        next.lessons[l.id] = {
          ...next.lessons[l.id],
          status: lessonOpen(next, l.id) ? "current" : "locked",
        };
  return next;
}
