export const topics = [
  "leds",
  "buttons",
  "sensors",
  "motors",
  "display",
  "projects",
] as const;
export type Topic = (typeof topics)[number];
export type ComponentType = "arduino" | "led" | "resistor" | "button";
export type PinRef = { componentId: string; pin: string };
export type CircuitComponent = {
  id: string;
  type: ComponentType;
  pins: string[];
  x: number;
  y: number;
};
export type Netlist = {
  components: CircuitComponent[];
  links: { id: string; from: PinRef; to: PinRef }[];
};
export type ErrorCode =
  | "missing_resistor"
  | "led_reversed"
  | "power_ground_swap"
  | "wrong_pin"
  | "open_circuit"
  | "short_circuit"
  | "extra_component";
export type CheckError = {
  code: ErrorCode;
  message: string;
  hint1: string;
  hint2: string;
  answer: string;
  componentIds: string[];
  severity: "error" | "warning";
};
export type Lesson = {
  id: string;
  unitId: string;
  levelId: number;
  title: string;
  topic: Topic;
  videoUrl: string | null;
  task: string;
  referenceNetlist: Netlist;
  hints: [string, string, string];
  xp: number;
};
export type Unit = {
  id: string;
  levelId: number;
  title: string;
  lessonIds: string[];
};
export type Level = {
  id: number;
  name: string;
  zoneName: string;
  topics: Topic[];
  units: Unit[];
};
export type Game = {
  id: string;
  title: string;
  topic: Topic;
  kind: "blitz" | "findbug" | "match";
  levelRange: [number, number];
};
export type Term = {
  id: string;
  title: string;
  topic: Topic;
  level: number;
  description: string;
  symbolSvg: string;
};
export type Homework = {
  id: string;
  title: string;
  dueDate: string;
  lessonIds: string[];
};
export type Mentor = {
  id: string;
  name: string;
  character: string;
  tone: string;
  unlockCost: number;
};
export type LessonProgress = {
  rewarded?: boolean;
  completionSource?: "lesson" | "lesson_fallback";
  video?: { confirmed?: boolean; watchedRatio?: number };
  flowUpdatedAt?: string;
  stages?: import("./lessons/flow").LessonFlowState["stages"];
  practice?: import("./lessons/flow").LessonFlowState["practice"];
  quiz?: import("./lessons/flow").FlowQuiz;
  status: "locked" | "current" | "done";
  attempts: number;
  bestErrors: number;
  steps?: {
    quiz?: boolean;
    video: boolean;
    theory: boolean;
    circuit: boolean;
    code: boolean;
    run: boolean;
  };
};
export type Progress = {
  progressEvidenceVersion?: 1;
  account?: {
    userId?: string;
    role: "student" | "teacher";
    timezone: string;
    avatarFrame?: string;
    hideFromLeaderboard?: boolean;
  };
  boosts?: { freeze: number; hints: number };
  inventory?: string[];
  achievements?: { unlocked: string[]; notified: string[]; claimed: string[] };
  achievementStats?: {
    projectIds?: string[];
    mentorQuestionIds?: string[];
    topics?: Topic[];
    blitzCurrent?: number;
    blitzBest?: number;
    bestWeeklyRank?: number;
  };
  daily?: {
    day: string;
    lessonIds: string[];
    xp: number;
    perfect: boolean;
    claimed: boolean;
    quiz: boolean;
  };
  version: 1;
  curriculumVersion?: 2;
  settings?: {
    textScale: 1 | 1.15 | 1.3;
    sounds?: boolean;
    soundVolume?: number;
    mentorHints?: boolean;
  };
  profile: { name: string; avatar: string; level: number };
  diagnostic: {
    status: "none" | "inprogress" | "done";
    answers: number[];
    skillScores: Record<Topic, number>;
  };
  lessons: Record<string, LessonProgress>;
  reviewQueue: { termOrLessonId: string; errorCode: string; addedAt: string }[];
  streak: {
    count: number;
    lastActiveDate: string | null;
    frozenDates?: string[];
    activityDates?: string[];
  };
  sparks: number;
  xp: number;
  mentor: { selectedId: string; unlockedIds: string[]; tokens: number };
  homework: Record<string, string>;
  tourSeen: Record<string, boolean>;
  collection: string[];
  circuits: Record<string, Netlist>;
  gameRuns: number;
};
