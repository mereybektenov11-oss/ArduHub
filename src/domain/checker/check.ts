import type { CheckError, ErrorCode, Netlist, PinRef } from "../types";
import { pinKey, wireConnected } from "./netlist";
import { errorCopy } from "./errors.ru";
// Wires are equipotential nodes; resistors/buttons are traversable components.
// LEDs remain directed boundaries. Geometry and component IDs never define correctness.
function path(
  net: Netlist,
  a: PinRef,
  b: PinRef,
  withoutResistors = false,
): string[] | null {
  const edges = net.links.map((w) => [pinKey(w.from), pinKey(w.to)]);
  for (const c of net.components)
    if (c.type === "button" || (c.type === "resistor" && !withoutResistors))
      edges.push([`${c.id}:1`, `${c.id}:2`]);
  const queue = [{ key: pinKey(a), parts: [a.componentId] }],
    seen = new Set([pinKey(a)]);
  for (const node of queue) {
    if (node.key === pinKey(b)) return node.parts;
    for (const [x, y] of edges) {
      const next = x === node.key ? y : y === node.key ? x : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push({ key: next, parts: [...node.parts, next.split(":")[0]] });
      }
    }
  }
  return null;
}
export function check(net: Netlist, reference: Netlist): CheckError[] {
  const result: CheckError[] = [];
  const add = (code: ErrorCode, ids: string[]) => {
    const [message, hint1, hint2, answer] = errorCopy[code];
    result.push({
      code,
      message,
      hint1,
      hint2,
      answer,
      componentIds: [...new Set(ids)],
      severity: code === "extra_component" ? "warning" : "error",
    });
  };
  const board = net.components.find((c) => c.type === "arduino");
  const refBoard = reference.components.find((c) => c.type === "arduino")!;
  const referenceSignal = reference.links
    .flatMap((w) => [w.from, w.to])
    .find((p) => p.componentId === refBoard.id && p.pin !== "GND")!.pin;
  const led =
    net.components.find(
      (c) =>
        c.type === "led" &&
        board &&
        path(
          net,
          { componentId: board.id, pin: referenceSignal },
          { componentId: c.id, pin: "A" },
        ),
    ) ?? net.components.find((c) => c.type === "led");
  if (!board || !led) {
    add(
      "open_circuit",
      net.components.map((c) => c.id),
    );
    return result;
  }
  const ground = { componentId: board.id, pin: "GND" },
    anode = { componentId: led.id, pin: "A" },
    cathode = { componentId: led.id, pin: "K" };
  const sources = board.pins.filter((p) => p !== "GND");
  for (const pin of sources)
    if (wireConnected(net, { componentId: board.id, pin }, ground))
      add("short_circuit", [board.id]);
  const source = sources.find(
    (pin) =>
      path(net, { componentId: board.id, pin }, anode) &&
      path(net, cathode, ground),
  );
  const reverse = sources.find(
    (pin) =>
      path(net, { componentId: board.id, pin }, cathode) &&
      path(net, anode, ground),
  );
  if (source) {
    const signal = { componentId: board.id, pin: source };
    if (source !== referenceSignal) add("wrong_pin", [board.id]);
    if (path(net, signal, anode, true) && path(net, cathode, ground, true))
      add("missing_resistor", [led.id]);
    const ids = [...path(net, signal, anode)!, ...path(net, cathode, ground)!];
    if (
      reference.components.some((c) => c.type === "button") &&
      !net.components.some((c) => c.type === "button" && ids.includes(c.id))
    )
      add("open_circuit", [board.id, led.id]);
  } else if (reverse)
    add(reverse === "5V" ? "power_ground_swap" : "led_reversed", [
      board.id,
      led.id,
    ]);
  else add("open_circuit", [board.id, led.id]);
  const expected = new Map<string, number>();
  for (const c of reference.components)
    expected.set(c.type, (expected.get(c.type) ?? 0) + 1);
  const extra: string[] = [];
  for (const c of net.components) {
    const count = expected.get(c.type) ?? 0;
    if (count > 0) expected.set(c.type, count - 1);
    else extra.push(c.id);
  }
  if (extra.length) add("extra_component", extra);
  return result;
}
