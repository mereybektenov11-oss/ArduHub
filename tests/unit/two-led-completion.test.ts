import { expect, test } from "vitest";
import { learningLessons } from "../../src/domain/lessons/content";
import { checkScene } from "../../src/domain/scene/check";

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
