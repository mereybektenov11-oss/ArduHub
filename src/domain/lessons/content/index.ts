import sketches from "@/content/sketches.json" with { type: "json" };
import { lessonV2Copy as copy } from "@/content/learning.ru";
import { makePart, emptyScene, type SceneDoc } from "@/domain/scene/scene";
import type { PartType } from "@/domain/parts/catalog";
import type { BehaviorCheck } from "@/domain/sim/checks";
import videoQueries from "../../../../content/lesson-video-queries.json" with { type: "json" };
import { courseCopy } from "@/content/course.ru";
import hardware from "@/content/hardware-examples.json" with { type: "json" };
import { hardwareScene } from "./hardware";
import { catalog } from "@/domain/parts/catalog";
import courseSketches from "@/content/course-sketches.json" with { type: "json" };
import { lessonQuizzes } from "@/content/lesson-quiz.ru";
import { lessonFlowFourthOptions } from "@/content/lesson-flow-options.ru";
import type { FlowQuestion } from "../flow";
export type LearningLesson = {
  quiz?: { passPercent: number; questions: FlowQuestion[] };
  id: string;
  title?: string;
  task?: string;
  available?: boolean;
  video: {
    url: string | null;
    durationSec: number;
    query: string;
    altQueries?: string[];
    pinnedVideoId?: string;
    minDurationSec?: number;
    maxDurationSec?: number;
  };
  theory: { title: string; text: string; partType: PartType }[];
  circuit: {
    allowedParts: PartType[];
    starterScene: SceneDoc;
    referenceScene: SceneDoc;
    hints: readonly string[];
  };
  code: {
    mode: "fill" | "fixbug" | "write";
    starter: string;
    solution: string;
    hints: readonly string[];
  };
  run: { checks: BehaviorCheck[]; durationMs: number; autoButton?: string };
};
export function exampleScene(kind = "blink"): SceneDoc {
  const s = emptyScene();
  s.components = [makePart("uno", "uno", 45, 130)];
  if (kind === "serial") return s;
  s.components.push(
    makePart("led", "led", 460, 110),
    makePart("resistor", "r", 350, 155),
  );
  const wire = (a: string, b: string, color = "#c58320") => {
    const parse = (v: string) => {
      const [componentId, pin] = v.split(":");
      return { componentId, pin };
    };
    s.wires.push({
      id: `w${s.wires.length}`,
      from: parse(a),
      to: parse(b),
      color,
      bends: [],
    });
  };
  if (kind === "buzzer") {
    s.components = [s.components[0], makePart("buzzer", "buzzer", 415, 140)];
    wire("uno:8", "buzzer:2");
    wire("buzzer:1", "uno:GND.2", "#284b39");
    return s;
  }
  wire(`uno:${kind === "pwm" ? "9" : "13"}`, "r:1");
  wire("r:2", "led:A");
  wire("led:C", "uno:GND.2", "#284b39");
  if (kind === "button") {
    s.components.push(makePart("button", "btn", 375, 260));
    wire("uno:2", "btn:1.l", "#287aab");
    wire("btn:2.l", "uno:GND.2", "#284b39");
  }
  if (kind === "pwm") {
    s.components.push(makePart("pot", "pot", 375, 265));
    wire("pot:SIG", "uno:A0", "#287aab");
    wire("pot:VCC", "uno:5V", "#b83f35");
    wire("pot:GND", "uno:GND.2", "#284b39");
  }
  return s;
}
export const legacyLearningLessons: LearningLesson[] = copy.map(
  (content, i) => {
    const ref = exampleScene(["blink", "button", "pwm"][i]);
    const solution = sketches[i].code;
    return {
      id: `lesson-${i + 1}`,
      video: {
        url: null,
        durationSec: 0,
        query:
          videoQueries[`lesson-${i + 1}` as keyof typeof videoQueries].query,
      },
      theory: content.theory.map(([title, text, partType]) => ({
        title,
        text,
        partType: partType as PartType,
      })),
      circuit: {
        allowedParts: [
          "uno",
          "led",
          "resistor",
          ...(i === 1 ? ["button" as const] : i === 2 ? ["pot" as const] : []),
        ],
        referenceScene: ref,
        starterScene: { ...ref, wires: [] },
        hints: content.hints,
      },
      code: {
        mode: i === 0 ? "fill" : i === 1 ? "fixbug" : "write",
        solution,
        starter:
          i === 0
            ? solution
                .replace("pinMode(13", "pinMode(___")
                .replace("13, HIGH", "13, ___")
                .replace("delay(1000)", "delay(___)")
            : i === 1
              ? solution.replace("== LOW", "== HIGH")
              : "void setup() {\n\n}\n\nvoid loop() {\n\n}\n",
        hints: content.codeHints,
      },
      run: {
        durationMs: 3200,
        checks:
          i === 0
            ? [{ kind: "pinBlinks", pin: 13, minToggles: 3, withinMs: 3200 }]
            : i === 1
              ? [
                  {
                    kind: "pinHighWhen",
                    pin: 13,
                    input: { part: "btn", state: "pressed" },
                    withinMs: 3200,
                  },
                ]
              : [
                  { kind: "pwmLevel", pin: 9, min: 120, max: 136 },
                  { kind: "serialContains", text: "128" },
                ],
        ...(i === 1 ? { autoButton: "btn" } : {}),
      },
    };
  },
);
const hardwareCode = (id: string) => hardware.find((s) => s.id === id)!.code;
export const courseCodes = [
  sketches[0].code,
  courseSketches[0].code,
  sketches[1].code,
  courseSketches[1].code,
  courseSketches[2].code,
  sketches[2].code,
  sketches[5].code,
  sketches[3].code,
  hardwareCode("segment"),
  hardwareCode("servo"),
  hardwareCode("ultrasonic"),
  hardwareCode("lcd"),
];
export const learningLessons: LearningLesson[] = courseCopy.map(
  (content, i) => {
    const mainPart: PartType = (
      [
        "led",
        "led",
        "button",
        "led",
        "led",
        "pot",
        "buzzer",
        "uno",
        "segment",
        "servo",
        "ultrasonic",
        "lcd",
      ] as const
    )[i];
    const scene =
      i >= 8
        ? hardwareScene(mainPart)
        : exampleScene(
            i === 2
              ? "button"
              : i === 5
                ? "pwm"
                : i === 6
                  ? "buzzer"
                  : i === 7
                    ? "serial"
                    : "blink",
          );
    if (i === 4) scene.wires[0].from.pin = "9";
    if (i === 3) {
      scene.components.push(
        makePart("led", "led2", 460, 300),
        makePart("resistor", "r2", 350, 330),
      );
      scene.wires.push(
        {
          id: "w3",
          from: { componentId: "uno", pin: "12" },
          to: { componentId: "r2", pin: "1" },
          color: "#c58320",
          bends: [],
        },
        {
          id: "w4",
          from: { componentId: "r2", pin: "2" },
          to: { componentId: "led2", pin: "A" },
          color: "#c58320",
          bends: [],
        },
        {
          id: "w5",
          from: { componentId: "led2", pin: "C" },
          to: { componentId: "uno", pin: "GND.2" },
          color: "#284b39",
          bends: [],
        },
      );
    }
    const checks: BehaviorCheck[][] = [
      legacyLearningLessons[0].run.checks,
      [{ kind: "pinBlinks", pin: 13, minToggles: 8, withinMs: 3200 }],
      legacyLearningLessons[1].run.checks,
      [
        { kind: "pinBlinks", pin: 13, minToggles: 2, withinMs: 3200 },
        { kind: "pinBlinks", pin: 12, minToggles: 2, withinMs: 3200 },
      ],
      [{ kind: "pwmLevel", pin: 9, min: 120, max: 136 }],
      legacyLearningLessons[2].run.checks,
      [{ kind: "pwmLevel", pin: 8, min: 110, max: 145 }],
      [{ kind: "serialContains", text: "ArduHub" }],
      [{ kind: "pwmLevel", pin: 2, min: 250, max: 255 }],
      [{ kind: "pulseWidth", pin: 9, min: 1450, max: 1500 }],
      [{ kind: "serialNumber", min: 5510, max: 6090 }],
      [{ kind: "displayContains", text: "Privet" }],
    ];
    const hints = [
      content.concepts[0].split("|")[1],
      content.concepts[1].split("|")[1],
      content.task,
    ];
    return {
      id: `lesson-${i + 1}`,
      title: content.title,
      quiz: {
        passPercent: 70,
        questions: (lessonQuizzes[`lesson-${i + 1}`] ?? []).map((q, j) => ({
          id: `q${j + 1}`,
          text: q.prompt,
          options: [
            ...q.options,
            lessonFlowFourthOptions[`lesson-${i + 1}`][j],
          ],
          correctIndex: q.correct,
          explanation: q.explanation,
        })),
      },
      task: content.task,
      available: scene.components.every((p) => catalog[p.type].simulated),
      video: {
        url: null,
        durationSec: 0,
        ...videoQueries[`lesson-${i + 1}` as keyof typeof videoQueries],
      },
      theory: content.concepts.map((concept, j) => {
        const [title, text] = concept.split("|");
        return {
          title,
          text,
          partType: j === 0 ? mainPart : j === 1 ? "uno" : "resistor",
        };
      }),
      circuit: {
        allowedParts: [...new Set(scene.components.map((p) => p.type))],
        starterScene: { ...scene, wires: [] },
        referenceScene: scene,
        hints:
          i === 0
            ? legacyLearningLessons[0].circuit.hints
            : i === 2
              ? legacyLearningLessons[1].circuit.hints
              : i === 5
                ? legacyLearningLessons[2].circuit.hints
                : hints,
      },
      code: {
        mode: i === 0 ? "fill" : i === 2 ? "fixbug" : "write",
        solution: courseCodes[i],
        starter:
          i === 0
            ? legacyLearningLessons[0].code.starter
            : i === 2
              ? legacyLearningLessons[1].code.starter
              : "void setup() {\n\n}\n\nvoid loop() {\n\n}\n",
        hints: [
          content.concepts[2].split("|")[1],
          content.task,
          courseCodes[i],
        ],
      },
      run: {
        checks: checks[i],
        durationMs: 3200,
        ...(i === 2 ? { autoButton: "btn" } : {}),
      },
    };
  },
);
