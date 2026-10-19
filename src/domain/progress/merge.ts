import type { Progress } from "@/domain/types";
import { syncLessonStates } from "./xp";
export function mergeProgress(guest: Progress, account: Progress): Progress {
  const merged = structuredClone(account);
  for (const [id, value] of Object.entries(guest.lessons)) {
    const own = merged.lessons[id];
    if (!own) continue;
    merged.lessons[id] = {
      ...own,
      status:
        own.status === "done" || value.status === "done" ? "done" : own.status,
      attempts: Math.max(own.attempts, value.attempts),
      bestErrors: Math.min(own.bestErrors, value.bestErrors),
      steps:
        own.steps && value.steps
          ? {
              video: own.steps.video || value.steps.video,
              theory: own.steps.theory || value.steps.theory,
              quiz: own.steps.quiz || value.steps.quiz,
              circuit: own.steps.circuit || value.steps.circuit,
              code: own.steps.code || value.steps.code,
              run: own.steps.run || value.steps.run,
            }
          : (own.steps ?? value.steps),
    };
  }
  merged.xp = Math.max(account.xp, guest.xp);
  merged.profile.level = Math.max(account.profile.level, guest.profile.level);
  merged.collection = [
    ...new Set([...account.collection, ...guest.collection]),
  ];
  merged.circuits = { ...guest.circuits, ...account.circuits };
  merged.sparks = account.sparks;
  merged.mentor = account.mentor;
  return syncLessonStates(merged);
}
