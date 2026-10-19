import type { SceneDoc, PinRef } from "./scene";
import { validPin } from "../parts/pins";
import { breadboardPins, breadboardGroup } from "../parts/breadboard";
export const pinKey = (p: PinRef) => `${p.componentId}:${p.pin}`;
export function connections(
  scene: SceneDoc,
  conductive = false,
  states: Record<string, number> = {},
) {
  const edges = scene.wires.map((w) => [pinKey(w.from), pinKey(w.to)]);
  const add = (id: string, a: string, b: string) =>
    edges.push([`${id}:${a}`, `${id}:${b}`]);
  for (const c of scene.components) {
    if (c.type === "breadboard") {
      const groups = new Map<string, string>();
      for (const pin of breadboardPins) {
        const group = breadboardGroup(pin.name),
          first = groups.get(group);
        if (first) add(c.id, first, pin.name);
        else groups.set(group, pin.name);
      }
    }
    if (c.type === "uno") {
      add(c.id, "GND.1", "GND.2");
      add(c.id, "GND.2", "GND.3");
      add(c.id, "A4", "A4.2");
      add(c.id, "A5", "A5.2");
    }
    if (c.type === "button" || c.type === "pushbutton-6mm") {
      add(c.id, "1.l", "1.r");
      add(c.id, "2.l", "2.r");
      if (states[c.id]) add(c.id, "1.l", "2.l");
    }
    if (c.type === "switch")
      add(c.id, "2", (states[c.id] ?? Number(c.attrs.value)) ? "3" : "1");
    if (c.type === "segment") add(c.id, "COM.1", "COM.2");
    if (c.type === "dip-switch-8")
      for (let n = 1; n <= 8; n++)
        if ((states[c.id] ?? 0) & (1 << (n - 1))) add(c.id, `${n}a`, `${n}b`);
    if (c.type === "membrane-keypad" && (states[c.id] ?? -1) >= 0) {
      const key = states[c.id];
      add(c.id, `R${Math.floor(key / 4) + 1}`, `C${(key % 4) + 1}`);
    }
    if (conductive && c.type === "resistor") add(c.id, "1", "2");
  }
  const adjacent = new Map<string, string[]>();
  for (const [a, b] of edges) {
    adjacent.set(a, [...(adjacent.get(a) ?? []), b]);
    adjacent.set(b, [...(adjacent.get(b) ?? []), a]);
  }
  return (a: PinRef, b: PinRef) => {
    const queue = [pinKey(a)],
      seen = new Set(queue);
    for (const key of queue) {
      if (key === pinKey(b)) return true;
      for (const next of adjacent.get(key) ?? [])
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
    }
    return false;
  };
}
export function canWire(s: SceneDoc, a: PinRef, b: PinRef) {
  return (
    validPin(s, a) &&
    validPin(s, b) &&
    pinKey(a) !== pinKey(b) &&
    !connections(s)(a, b) &&
    s.wires.length < 120
  );
}
export function shorted(s: SceneDoc) {
  const board = s.components.find((c) => c.type === "uno");
  return (
    !!board &&
    connections(s)(
      { componentId: board.id, pin: "5V" },
      { componentId: board.id, pin: "GND.2" },
    )
  );
}
export function findBoardPin(
  s: SceneDoc,
  p: PinRef,
  states: Record<string, number> = {},
) {
  const board = s.components.find((c) => c.type === "uno");
  if (!board) return null;
  const linked = connections(s, true, states);
  return (
    [
      "GND.2",
      "5V",
      ...Array.from({ length: 14 }, (_, i) => String(i)),
      ...Array.from({ length: 6 }, (_, i) => `A${i}`),
    ].find((pin) => linked(p, { componentId: board.id, pin })) ?? null
  );
}
