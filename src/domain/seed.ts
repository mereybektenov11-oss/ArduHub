import type {
  Game,
  Homework,
  Level,
  Lesson,
  Mentor,
  Progress,
  Term,
  Topic,
} from "./types";
import { topics } from "./types";
import { referenceCircuit } from "./checker/netlist";
import {
  cabinetRu,
  unitTitles,
  curriculum,
  termDeck,
  mentorDeck,
  levelDeck,
  gameDeck,
} from "@/content/cabinet.ru";
import { courseCopy } from "@/content/course.ru";
export { topicNames } from "@/content/cabinet.ru";
const courseLevels = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8],
  [9, 10],
  [11, 12],
];
const coursePosition = (index: number) => {
  const level = courseLevels.findIndex((ids) => ids.includes(index + 1));
  const slot = courseLevels[level].indexOf(index + 1);
  return {
    level,
    unit: slot >= Math.ceil(courseLevels[level].length / 2) ? 1 : 0,
  };
};
export const levels: Level[] = levelDeck.map((l, i) => ({
  id: i,
  name: l[0],
  zoneName: l[1],
  topics: [topics[Math.min(i, 5)]],
  units: [0, 1].map((u) => ({
    id: `u${i}-${u}`,
    levelId: i,
    title: unitTitles[u],
    lessonIds: courseLevels[i]
      .filter((id) => coursePosition(id - 1).unit === u)
      .map((id) => `lesson-${id}`),
  })),
}));
export const lessons: Lesson[] = curriculum.slice(0, 12).map((l, i) => ({
  id: `lesson-${i + 1}`,
  unitId: `u${coursePosition(i).level}-${coursePosition(i).unit}`,
  levelId: coursePosition(i).level,
  title: courseCopy[i]?.title ?? l[0],
  topic:
    (
      [
        "leds",
        "leds",
        "buttons",
        "leds",
        "leds",
        "sensors",
        "leds",
        "projects",
        "display",
        "motors",
        "sensors",
        "display",
      ] as Topic[]
    )[i] ?? (l[1] as Topic),
  videoUrl: null,
  task: courseCopy[i]?.task ?? l[2],
  referenceNetlist: referenceCircuit(i === 1 || i === 4),
  hints: [
    "Проследи путь тока от пина до земли.",
    "Для светодиода нужна последовательная цепь с резистором.",
    "Пин 13 → резистор → анод A, катод K → GND.",
  ],
  xp: 30,
}));
export const mentors: Mentor[] = mentorDeck.map(
  ([id, name, character, tone, cost]) => ({
    id,
    name,
    character,
    tone,
    unlockCost: Number(cost),
  }),
);
export const games: Game[] = gameDeck.map((g, i) => ({
  id: g[0],
  title: g[1],
  topic: topics[i],
  kind: g[0] as Game["kind"],
  levelRange: i === 2 ? [1, 4] : [0, 4],
}));
export const terms: Term[] = termDeck.map((t, i) => ({
  id: `term-${i + 1}`,
  title: t[0],
  description: t[1],
  topic: topics[Math.floor(i / 7) % 6],
  level: Math.min(4, Math.floor(i / 8)),
  symbolSvg: ["◉", "⌁", "⊥", "∿", "▣", "◇"][Math.floor(i / 7) % 6],
}));
export const homework: Homework[] = Array.from({ length: 6 }, (_, i) => ({
  id: `hw-${i + 1}`,
  title: lessons[i * 2].title,
  dueDate: `2026-10-${String(i === 0 ? 15 : 16 + i * 2).padStart(2, "0")}`,
  lessonIds: lessons.slice(i * 2, i * 2 + 2).map((l) => l.id),
}));
export function createProgress(): Progress {
  return {
    version: 1,
    curriculumVersion: 2,
    settings: { textScale: 1, sounds: true, mentorHints: true },
    profile: { name: cabinetRu.profile, avatar: "Ю", level: 1 },
    diagnostic: {
      status: "none",
      answers: [],
      skillScores: Object.fromEntries(topics.map((t) => [t, 0])) as Record<
        Topic,
        number
      >,
    },
    lessons: Object.fromEntries(
      lessons.map((l, i) => [
        l.id,
        { status: i === 0 ? "current" : "locked", attempts: 0, bestErrors: 99 },
      ]),
    ),
    reviewQueue: [],
    streak: { count: 0, lastActiveDate: null },
    sparks: 0,
    xp: 0,
    mentor: { selectedId: "volt", unlockedIds: ["volt"], tokens: 50 },
    homework: {},
    tourSeen: {},
    collection: [],
    circuits: {},
    gameRuns: 0,
  };
}
