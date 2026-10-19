import type { Progress } from "../types";
import { createProgress, lessons, mentors } from "../seed";
import { topics } from "../types";
import { isNetlist } from "../checker/netlist";
export const STORAGE_KEY = "arduhub.progress.v1";
export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
  reset(): Progress;
}
export function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const p = value as Progress;
  return (
    p.version === 1 &&
    typeof p.xp === "number" &&
    Number.isFinite(p.xp) &&
    p.xp >= 0 &&
    typeof p.sparks === "number" &&
    p.sparks >= 0 &&
    !!p.profile &&
    Number.isInteger(p.profile.level) &&
    p.profile.level >= 0 &&
    p.profile.level <= 4 &&
    !!p.diagnostic &&
    ["none", "inprogress", "done"].includes(p.diagnostic.status) &&
    Array.isArray(p.diagnostic.answers) &&
    p.diagnostic.answers.length <= 8 &&
    (p.diagnostic.status === "done"
      ? p.diagnostic.answers.length === 8
      : p.diagnostic.answers.length < 8) &&
    p.diagnostic.answers.every(
      (x) => Number.isInteger(x) && x >= 0 && x <= 3,
    ) &&
    !!p.diagnostic.skillScores &&
    Object.values(p.diagnostic.skillScores).every(
      (x) => typeof x === "number" && x >= 0 && x <= 100,
    ) &&
    !!p.lessons &&
    lessons.every((l) => !!p.lessons[l.id]) &&
    Object.values(p.lessons).every(
      (x) =>
        !!x &&
        ["current", "locked", "done"].includes(x.status) &&
        typeof x.attempts === "number",
    ) &&
    Array.isArray(p.reviewQueue) &&
    p.reviewQueue.every(
      (x) =>
        !!x &&
        typeof x.termOrLessonId === "string" &&
        typeof x.errorCode === "string",
    ) &&
    !!p.streak &&
    typeof p.streak.count === "number" &&
    (p.streak.lastActiveDate === null ||
      /^\d{4}-\d{2}-\d{2}$/.test(p.streak.lastActiveDate)) &&
    !!p.mentor &&
    typeof p.mentor.tokens === "number" &&
    p.mentor.tokens >= 0 &&
    Array.isArray(p.mentor.unlockedIds) &&
    typeof p.mentor.selectedId === "string" &&
    mentors.some((m) => m.id === p.mentor.selectedId) &&
    p.mentor.unlockedIds.includes(p.mentor.selectedId) &&
    topics.every((t) => typeof p.diagnostic.skillScores[t] === "number") &&
    (p.circuits === undefined ||
      (!!p.circuits &&
        typeof p.circuits === "object" &&
        Object.values(p.circuits).every(isNetlist))) &&
    !!p.tourSeen &&
    !!p.homework
  );
}
export class BrowserProgressStore implements ProgressStore {
  memory = createProgress();
  unavailable = false;
  corrupt = false;
  constructor(
    private storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
  ) {}
  load(): Progress {
    try {
      if (!this.storage) throw Error();
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return this.memory;
      const data = JSON.parse(raw);
      if (!isProgress(data)) {
        this.corrupt = true;
        return this.memory;
      }
      this.memory = {
        ...createProgress(),
        ...data,
        settings: {
          textScale: [1, 1.15, 1.3].includes(data.settings?.textScale ?? 0)
            ? data.settings!.textScale
            : 1,
        },
        collection: Array.isArray(data.collection) ? data.collection : [],
        circuits:
          data.circuits && typeof data.circuits === "object"
            ? data.circuits
            : {},
        gameRuns: typeof data.gameRuns === "number" ? data.gameRuns : 0,
      };
      if (data.curriculumVersion !== 2) {
        const fresh = createProgress();
        this.memory.lessons = {
          ...fresh.lessons,
          "lesson-1": data.lessons["lesson-1"],
          "lesson-3": data.lessons["lesson-2"],
          "lesson-6": data.lessons["lesson-3"],
        };
        this.memory.circuits = Object.fromEntries(
          Object.entries(this.memory.circuits).map(([id, scene]) => [
            id === "lesson-2"
              ? "lesson-3"
              : id === "lesson-3"
                ? "lesson-6"
                : id,
            scene,
          ]),
        );
        this.memory.curriculumVersion = 2;
      }
      return this.memory;
    } catch {
      if (this.storage) {
        try {
          const raw = this.storage.getItem(STORAGE_KEY);
          this.corrupt = Boolean(raw);
        } catch {
          this.unavailable = true;
        }
      } else this.unavailable = true;
      return this.memory;
    }
  }
  save(p: Progress) {
    this.memory = p;
    if (this.corrupt) return;
    try {
      if (!this.storage) throw Error();
      this.storage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      this.unavailable = true;
    }
  }
  reset() {
    this.corrupt = false;
    this.memory = createProgress();
    this.save(this.memory);
    return this.memory;
  }
}
