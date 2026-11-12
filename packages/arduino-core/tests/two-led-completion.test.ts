import { expect, test } from "vitest";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { checkScene } from "@arduhub/arduino-core/scene/check";
import { ArduinoInterpreter } from "@arduhub/arduino-core/sim/interpreter";
import { checkBehavior } from "@arduhub/arduino-core/sim/checks";
import type { Sample } from "@arduhub/arduino-core/sim/runner";

test.each([500, 1000, 1500])(
  "two LEDs accept alternating output with %i ms pauses",
  (pause) => {
    const lesson = learningLessons[3];
    const runner = new ArduinoInterpreter(
      lesson.code.solution.replaceAll("delay(500)", `delay(${pause})`),
    );
    const samples: Sample[] = [];
    while (runner.time < lesson.run.durationMs) {
      runner.advance(20);
      samples.push(runner.sample());
    }
    expect(
      checkBehavior(lesson.run.checks, {
        samples,
        serial: runner.serial,
      }).every((r) => r.pass),
    ).toBe(true);
  },
);

test("the learner's named-pin sketch with one-second delay passes", () => {
  const lesson = learningLessons[3];
  const runner = new ArduinoInterpreter(`const int ledPin1 = 13;
const int ledPin2 = 12;
const int delayTime = 1000;
void setup() { pinMode(ledPin1, OUTPUT); pinMode(ledPin2, OUTPUT); }
void loop() {
 digitalWrite(ledPin1, HIGH); digitalWrite(ledPin2, LOW); delay(delayTime);
 digitalWrite(ledPin1, LOW); digitalWrite(ledPin2, HIGH); delay(delayTime);
}`);
  const samples: Sample[] = [];
  while (runner.time < lesson.run.durationMs) {
    runner.advance(20);
    samples.push(runner.sample());
  }
  expect(
    checkBehavior(lesson.run.checks, { samples, serial: runner.serial }).every(
      (r) => r.pass,
    ),
  ).toBe(true);
});

test("permanently lit LEDs cannot complete the lesson", () => {
  const lesson = learningLessons[3];
  const runner = new ArduinoInterpreter(
    "void setup(){pinMode(13,OUTPUT);pinMode(12,OUTPUT);digitalWrite(13,HIGH);digitalWrite(12,LOW);} void loop(){}",
  );
  const samples: Sample[] = [];
  while (runner.time < lesson.run.durationMs) {
    runner.advance(20);
    samples.push(runner.sample());
  }
  expect(
    checkBehavior(lesson.run.checks, { samples, serial: runner.serial }).every(
      (r) => r.pass,
    ),
  ).toBe(false);
});

test("two LED lesson accepts correct wiring regardless of component order", () => {
  const reference = learningLessons[3].circuit.referenceScene;
  const scene = structuredClone(reference);
  scene.components.reverse();
  expect(checkScene(scene, reference)).toEqual([]);
});

test("two LED lesson accepts newly added component identities", () => {
  const reference = learningLessons[3].circuit.referenceScene;
  const scene = structuredClone(reference);
  scene.components.reverse();
  for (const part of scene.components) part.id = `new-${part.id}`;
  for (const wire of scene.wires)
    for (const pin of [wire.from, wire.to])
      pin.componentId = `new-${pin.componentId}`;
  expect(checkScene(scene, reference)).toEqual([]);
  scene.wires.pop();
  expect(checkScene(scene, reference).length).toBeGreaterThan(0);
});
