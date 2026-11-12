import { isScene, type SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { isQuizProgress, type QuizProgress } from "../lessons/quiz";
import { isLessonFlow, type LessonFlowState } from "../lessons/flow";
export type StepState = {
  video: boolean;
  theory: boolean;
  quiz?: boolean;
  circuit: boolean;
  code: boolean;
  run: boolean;
};
export type Draft = {
  flow?: LessonFlowState;
  updatedAt?: string;
  scene: SceneDoc;
  code: string;
  step: number;
  steps: StepState;
  quiz?: QuizProgress;
};
export type Project = {
  id: string;
  title: string;
  idea: string;
  createdAt: string;
  updatedAt: string;
  scene: SceneDoc;
  code: string;
  thumbnailSvg: string;
};
export const DRAFTS_KEY = "arduhub.drafts.v1",
  PROJECTS_KEY = "arduhub.projects.v1";
export const initialSteps = (): StepState => ({
  video: false,
  theory: false,
  quiz: false,
  circuit: false,
  code: false,
  run: false,
});
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const codeValid = (v: unknown): v is string =>
  typeof v === "string" && new TextEncoder().encode(v).length <= 16384;
const dateValid = (v: unknown) =>
  typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v));
export function isDraft(v: unknown): v is Draft {
  return (
    record(v) &&
    (v.flow === undefined || isLessonFlow(v.flow)) &&
    isScene(v.scene) &&
    codeValid(v.code) &&
    Number.isInteger(v.step) &&
    Number(v.step) >= 0 &&
    Number(v.step) <= 5 &&
    (v.quiz === undefined || isQuizProgress(v.quiz)) &&
    record(v.steps) &&
    ((v.steps as Record<string, unknown>).quiz === undefined ||
      typeof (v.steps as Record<string, unknown>).quiz === "boolean") &&
    ["video", "theory", "circuit", "code", "run"].every(
      (k) => typeof (v.steps as Record<string, unknown>)[k] === "boolean",
    )
  );
}
export function isProject(v: unknown): v is Project {
  return (
    record(v) &&
    typeof v.id === "string" &&
    /^[\w-]{1,80}$/.test(v.id) &&
    typeof v.title === "string" &&
    v.title.length > 0 &&
    v.title.length <= 100 &&
    typeof v.idea === "string" &&
    v.idea.length <= 1000 &&
    dateValid(v.createdAt) &&
    dateValid(v.updatedAt) &&
    isScene(v.scene) &&
    codeValid(v.code) &&
    typeof v.thumbnailSvg === "string" &&
    v.thumbnailSvg.length <= 20000 &&
    new TextEncoder().encode(JSON.stringify(v)).length <= 200 * 1024
  );
}
export function importProject(raw: string): Project | null {
  if (new TextEncoder().encode(raw).length > 200 * 1024) return null;
  try {
    const v = JSON.parse(raw);
    if (!record(v) || v.version !== 1 || !isProject(v.project)) return null;
    return {
      ...v.project,
      id: crypto.randomUUID(),
      thumbnailSvg: thumbnail(v.project.scene),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
export function thumbnail(s: SceneDoc) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#efebdd"/>${s.components.map((c) => `<circle cx="${Math.min(560, Math.max(20, c.x))}" cy="${Math.min(360, Math.max(20, c.y))}" r="${c.type === "uno" ? 44 : 15}" fill="${c.type === "uno" ? "#256c64" : "#d4912a"}"/>`).join("")}</svg>`;
}
const memory = {
  drafts: {} as Record<string, Draft>,
  projects: [] as Project[],
};
export class LearningStore {
  drafts: Record<string, Draft> = {};
  projects: Project[] = [];
  unavailable = false;
  corrupt = false;
  constructor(
    private storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null,
  ) {}
  load() {
    let d: string | null, p: string | null;
    try {
      if (!this.storage) throw Error();
      d = this.storage.getItem(DRAFTS_KEY);
      p = this.storage.getItem(PROJECTS_KEY);
    } catch {
      this.unavailable = true;
      this.drafts = memory.drafts;
      this.projects = memory.projects;
      return;
    }
    try {
      const drafts = d ? JSON.parse(d) : { version: 1, drafts: {} };
      const projects = p ? JSON.parse(p) : { version: 1, projects: [] };
      if (
        !record(drafts) ||
        ![1, 2].includes(Number(drafts.version)) ||
        !record(drafts.drafts) ||
        Object.keys(drafts.drafts).length > 30 ||
        !Object.entries(drafts.drafts).every(
          ([id, v]) => /^lesson-\d+$/.test(id) && isDraft(v),
        ) ||
        !record(projects) ||
        projects.version !== 1 ||
        !Array.isArray(projects.projects) ||
        projects.projects.length > 20 ||
        !projects.projects.every(isProject) ||
        new Set(projects.projects.map((p) => p.id)).size !==
          projects.projects.length
      ) {
        this.corrupt = true;
        return;
      }
      this.drafts = drafts.drafts as Record<string, Draft>;
      if (drafts.curriculumVersion !== 2)
        this.drafts = Object.fromEntries(
          Object.entries(this.drafts).map(([id, draft]) => [
            id === "lesson-2"
              ? "lesson-3"
              : id === "lesson-3"
                ? "lesson-6"
                : id,
            draft,
          ]),
        );
      this.projects = projects.projects;
    } catch {
      this.corrupt = true;
    }
  }
  save() {
    memory.drafts = this.drafts;
    memory.projects = this.projects;
    if (this.corrupt) return;
    try {
      if (!this.storage) throw Error();
      this.storage.setItem(
        DRAFTS_KEY,
        JSON.stringify({
          version: 2,
          curriculumVersion: 2,
          drafts: this.drafts,
        }),
      );
      this.storage.setItem(
        PROJECTS_KEY,
        JSON.stringify({ version: 1, projects: this.projects }),
      );
    } catch {
      this.unavailable = true;
    }
  }
  reset() {
    try {
      this.storage?.removeItem(DRAFTS_KEY);
      this.storage?.removeItem(PROJECTS_KEY);
    } catch {
      this.unavailable = true;
    }
    this.corrupt = false;
    this.drafts = {};
    this.projects = [];
    this.save();
  }
  add(p: Project) {
    if (
      this.projects.length >= 20 ||
      !isProject(p) ||
      this.projects.some((v) => v.id === p.id)
    )
      return false;
    this.projects = [p, ...this.projects];
    this.save();
    return true;
  }
  replace(p: Project) {
    if (!isProject(p)) return false;
    this.projects = this.projects.map((v) => (v.id === p.id ? p : v));
    this.save();
    return true;
  }
  remove(id: string) {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.save();
  }
}
