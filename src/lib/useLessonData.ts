"use client";
import { useEffect, useState } from "react";
import type { LearningLesson } from "@arduhub/arduino-core/lessons/content";
import { motionTokens } from "./motion";
const requests = new Map<string, Promise<LearningLesson>>();
export function prefetchLesson(id: string): Promise<LearningLesson> {
  let request = requests.get(id);
  if (!request) {
    request = fetch(`/api/lessons/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(motionTokens.lessonFlow.timeout),
    }).then(async (response) => {
      if (!response.ok) throw Error("lesson_unavailable");
      return (await response.json()) as LearningLesson;
    });
    requests.set(id, request);
  }
  return request;
}
export function useLessonData(id: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    lesson?: LearningLesson;
    error?: boolean;
    loading: boolean;
  }>({ loading: true });
  useEffect(() => {
    let live = true;
    const started = performance.now();
    const initial = setTimeout(() => {
      if (live) setState({ loading: true });
    }, 0);
    let minimum: ReturnType<typeof setTimeout>;
    void prefetchLesson(id)
      .then((lesson) => {
        minimum = setTimeout(
          () => {
            if (live) setState({ lesson, loading: false });
          },
          Math.max(
            0,
            motionTokens.lessonFlow.minimum - (performance.now() - started),
          ),
        );
      })
      .catch(() => {
        minimum = setTimeout(
          () => {
            if (live) setState({ error: true, loading: false });
          },
          Math.max(
            0,
            motionTokens.lessonFlow.minimum - (performance.now() - started),
          ),
        );
      });
    return () => {
      live = false;
      clearTimeout(initial);
      clearTimeout(minimum);
    };
  }, [id, attempt]);
  return {
    ...state,
    retry: () => {
      requests.delete(id);
      setAttempt((n) => n + 1);
    },
  };
}
