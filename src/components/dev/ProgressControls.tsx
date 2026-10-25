"use client";
import { useState } from "react";
import Link from "next/link";
import { lessons } from "@/domain/seed";
import { learningLessons } from "@/domain/lessons/content";
import {
  computeCourseState,
  normalizeProgress,
} from "@/domain/progress/courseState";
import { initialFlowQuiz } from "@/domain/lessons/flow";
import { useProgress } from "@/lib/useProgress";
import { useLearningStore } from "@/lib/useLearningStore";
import { progressDevRu as c } from "@/content/progress.ru";
export default function ProgressControls() {
  const { progress, update, reset } = useProgress();
  const { mutate } = useLearningStore();
  const [through, setThrough] = useState(1);
  const account = Boolean(progress.account?.userId);
  function clearDrafts() {
    mutate((s) => {
      s.drafts = {};
      s.save();
    });
  }
  return (
    <div className="cab-stack">
      <h1>{c.title}</h1>
      {account && <p>{c.accountNote}</p>}
      <button
        className="cab-btn"
        disabled={account}
        onClick={() => {
          clearDrafts();
          reset();
        }}
      >
        {c.reset}
      </button>
      <label>
        {c.through}{" "}
        <input
          type="number"
          min={0}
          max={lessons.length}
          value={through}
          onChange={(e) =>
            setThrough(
              Math.max(0, Math.min(lessons.length, Number(e.target.value))),
            )
          }
        />
      </label>
      <button
        className="cab-btn"
        disabled={account}
        onClick={() => {
          clearDrafts();
          update((p) =>
            normalizeProgress({
              ...p,
              lessons: Object.fromEntries(
                lessons.map((l, i) => {
                  const done = i < through;
                  const quiz = initialFlowQuiz();
                  if (done) {
                    quiz.answers = Object.fromEntries(
                      learningLessons[i].quiz!.questions.map((q) => [
                        q.id,
                        q.correctIndex,
                      ]),
                    );
                    quiz.phase = "result";
                    quiz.lastScore = 100;
                  }
                  return [
                    l.id,
                    {
                      attempts: 0,
                      bestErrors: 99,
                      status: done ? "done" : "locked",
                      rewarded: done,
                      video: { confirmed: done },
                      stages: { video: done, test: done, practice: done },
                      practice: { circuit: done, code: done, run: done },
                      quiz,
                    },
                  ];
                }),
              ),
            }),
          );
        }}
      >
        {c.apply}
      </button>
      <Link className="cab-btn" href="/app">
        {c.home}
      </Link>
      <pre>
        {JSON.stringify(computeCourseState(lessons, progress), null, 2)}
      </pre>
    </div>
  );
}
