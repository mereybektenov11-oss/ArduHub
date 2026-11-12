import type { Progress } from "@/domain/types";
import { lessons } from "@/domain/seed";
import { lessonQuizzes } from "@arduhub/curriculum/lesson-quiz.ru";
import { computeCourseState } from "./courseState";

export type AwardEvent = {
  source: "lesson" | "lesson_fallback" | "lesson_quiz" | "game";
  refId: string;
  amount: number;
};
// The database owns balances: transfer verifiable receipts, never guest XP totals.
export function importAwardEvents(progress: Progress): AwardEvent[] {
  return computeCourseState(lessons, progress).flatMap((state) => {
    if (state.status === "locked") return [];
    const stored = progress.lessons[state.id];
    const quiz = lessonQuizzes[state.id] ?? [];
    const events: AwardEvent[] = [];
    if (state.stages.video) {
      for (const question of new Set(stored.quiz?.awarded ?? [])) {
        const index = /^q[1-6]$/.test(question)
          ? Number(question.slice(1)) - 1
          : -1;
        const answer =
          stored.quiz?.awardedAnswers?.[question] ??
          stored.quiz?.retryAnswers?.[question] ??
          stored.quiz?.answers?.[question];
        if (quiz[index] && answer === quiz[index].correct)
          events.push({
            source: "lesson_quiz",
            refId: `${state.id}:${question}`,
            amount: 1,
          });
      }
    }
    if (state.status === "done") {
      const source = stored.completionSource ?? "lesson";
      events.push({
        source,
        refId: state.id,
        amount: source === "lesson_fallback" ? 15 : 30,
      });
    }
    return events;
  });
}
type Store = Pick<Storage, "getItem" | "setItem">;
const key = (id: string) => "arduhub.pending-awards:" + id;
const read = (storage: Store, id: string): AwardEvent[] => {
  try {
    return JSON.parse(storage.getItem(key(id)) || "[]");
  } catch {
    return [];
  }
};
export function queueAwards(storage: Store, id: string, events: AwardEvent[]) {
  const pending = read(storage, id);
  for (const event of events)
    if (
      !pending.some((e) => e.source === event.source && e.refId === event.refId)
    )
      pending.push(event);
  storage.setItem(key(id), JSON.stringify(pending));
}
export async function flushAwards(
  storage: Store,
  id: string,
  currentUser: () => string | undefined,
  flushProgress: () => Promise<void>,
  fetcher: typeof fetch = fetch,
) {
  if (currentUser() !== id) return;
  await flushProgress();
  for (const event of read(storage, id)) {
    if (currentUser() !== id) return;
    const response = await fetcher("/api/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok && response.status !== 409)
      throw Error(response.status === 429 ? "daily_cap" : "offline");
    storage.setItem(
      key(id),
      JSON.stringify(
        read(storage, id).filter(
          (e) => e.source !== event.source || e.refId !== event.refId,
        ),
      ),
    );
  }
}
