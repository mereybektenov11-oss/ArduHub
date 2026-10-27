import { check } from "@/domain/checker/check";
import { legacyNetlist } from "./migrate";
import { connections, shorted } from "./netlist";
import type { SceneDoc } from "./scene";
import { learningRu as c } from "@/content/learning.ru";
export function checkScene(
  scene: SceneDoc,
  reference: SceneDoc,
): { message: string; componentIds: string[] }[] {
  if (scene.components.filter((p) => p.type === "uno").length !== 1)
    return [{ message: c.checks.noUno, componentIds: [] }];
  const errors: { message: string; componentIds: string[] }[] = [];
  if (shorted(scene))
    errors.push({
      message: c.checks.short,
      componentIds: scene.components
        .filter((p) => p.type === "uno")
        .map((p) => p.id),
    });
  const ref = legacyNetlist(reference);
  ref.components = ref.components.filter((c) => c.type !== "button");
  ref.links = ref.links.filter(
    (w) =>
      ref.components.some((c) => c.id === w.from.componentId) &&
      ref.components.some((c) => c.id === w.to.componentId),
  );
  if (ref.components.some((p) => p.type === "led"))
    errors.push(
      ...check(legacyNetlist(scene), ref).filter((e) => e.severity === "error"),
    );
  const board = scene.components.find((c) => c.type === "uno")!;
  const linked = connections(scene, true);
  const mapping = new Map<string, string>();
  const used = new Set<string>();
  const referenceBoard = reference.components.find((p) => p.type === "uno")!;
  const referenceLinked = connections(reference, true);
  for (const expected of reference.components) {
    const endpoints = reference.wires.flatMap((wire) => [wire.from, wire.to]);
    const boardPins = [
      ...new Set(
        endpoints
          .filter((p) => p.componentId === referenceBoard.id)
          .map((p) => p.pin),
      ),
    ];
    const pins = [
      ...new Set(
        endpoints
          .filter((p) => p.componentId === expected.id)
          .map((p) => p.pin),
      ),
    ];
    const anchors = pins.flatMap((pin) =>
      boardPins
        .filter((boardPin) =>
          referenceLinked(
            { componentId: expected.id, pin },
            { componentId: referenceBoard.id, pin: boardPin },
          ),
        )
        .map((boardPin) => ({ pin, boardPin })),
    );
    const actual =
      scene.components.find(
        (p) =>
          !used.has(p.id) &&
          p.type === expected.type &&
          anchors.length > 0 &&
          anchors.every(({ pin, boardPin }) =>
            linked(
              { componentId: p.id, pin },
              { componentId: board.id, pin: boardPin },
            ),
          ),
      ) ??
      scene.components.find(
        (p) =>
          !used.has(p.id) && p.type === expected.type && p.id === expected.id,
      ) ??
      scene.components.find((p) => !used.has(p.id) && p.type === expected.type);
    if (actual) {
      mapping.set(expected.id, actual.id);
      used.add(actual.id);
    } else errors.push({ message: c.checks.wiring, componentIds: [] });
  }
  for (const wire of reference.wires) {
    if (
      [wire.from, wire.to].some(
        (pin) =>
          reference.components.find((p) => p.id === pin.componentId)?.type ===
          "button",
      )
    )
      continue;
    const from = mapping.get(wire.from.componentId),
      to = mapping.get(wire.to.componentId);
    if (
      from &&
      to &&
      !linked(
        { componentId: from, pin: wire.from.pin },
        { componentId: to, pin: wire.to.pin },
      )
    )
      errors.push({ message: c.checks.wiring, componentIds: [from, to] });
  }
  for (const part of reference.components.filter(
    (c) => c.type === "button" || c.type === "pot",
  )) {
    const actual = scene.components.find((c) => c.type === part.type);
    if (!actual) {
      errors.push({ message: c.checks.wiring, componentIds: [] });
      continue;
    }
    const pair = (pin: string, target: string) =>
      linked(
        { componentId: actual.id, pin },
        { componentId: board.id, pin: target },
      );
    const ok =
      part.type === "button"
        ? (pair("1.l", "2") && pair("2.l", "GND.2")) ||
          (pair("2.l", "2") && pair("1.l", "GND.2"))
        : pair("SIG", "A0") && pair("GND", "GND.2") && pair("VCC", "5V");
    if (!ok)
      errors.push({ message: c.checks.wiring, componentIds: [actual.id] });
  }
  return errors;
}
