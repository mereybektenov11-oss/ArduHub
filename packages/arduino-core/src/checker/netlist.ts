import type {
  ComponentType,
  CircuitComponent,
  Netlist,
  PinRef,
} from "@arduhub/arduino-core/types";
export const pinKey = (p: PinRef) => `${p.componentId}:${p.pin}`;
export const componentPins: Record<ComponentType, string[]> = {
  arduino: ["13", "12", "5V", "GND"],
  led: ["A", "K"],
  resistor: ["1", "2"],
  button: ["1", "2"],
};
export function isNetlist(value: unknown): value is Netlist {
  if (!value || typeof value !== "object") return false;
  const n = value as Netlist;
  if (
    !Array.isArray(n.components) ||
    !Array.isArray(n.links) ||
    n.components.length > 60 ||
    n.links.length > 120
  )
    return false;
  if (
    !n.components.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        Object.hasOwn(componentPins, c.type) &&
        Number.isFinite(c.x) &&
        Number.isFinite(c.y) &&
        Array.isArray(c.pins) &&
        componentPins[c.type].every((p) => c.pins.includes(p)),
    )
  )
    return false;
  const ids = new Set(n.components.map((c) => c.id));
  if (ids.size !== n.components.length) return false;
  const pinValid = (p: PinRef) =>
    p &&
    n.components.some((c) => c.id === p.componentId && c.pins.includes(p.pin));
  return n.links.every(
    (w) => w && typeof w.id === "string" && pinValid(w.from) && pinValid(w.to),
  );
}
export function component(
  type: ComponentType,
  id: string,
  x: number,
  y: number,
): CircuitComponent {
  return { id, type, x, y, pins: [...componentPins[type]] };
}
export function referenceCircuit(withButton = false, after = false): Netlist {
  const components = [
    component("arduino", "uno", 70, 160),
    component("led", "led", 450, 120),
    component("resistor", "r", 300, 210),
    ...(withButton ? [component("button", "btn", 300, 80)] : []),
  ];
  const sequence = withButton
    ? ["uno:13", "btn:1", "btn:2", "r:1", "r:2", "led:A", "led:K", "uno:GND"]
    : after
      ? ["uno:13", "led:A", "led:K", "r:1", "r:2", "uno:GND"]
      : ["uno:13", "r:1", "r:2", "led:A", "led:K", "uno:GND"];
  const links: Netlist["links"] = [];
  for (let i = 0; i < sequence.length - 1; i += 2) {
    const parse = (s: string): PinRef => {
      const [componentId, pin] = s.split(":");
      return { componentId, pin };
    };
    links.push({
      id: `w${i}`,
      from: parse(sequence[i]),
      to: parse(sequence[i + 1]),
    });
  }
  return { components, links };
}
export function wireConnected(net: Netlist, a: PinRef, b: PinRef): boolean {
  const queue = [pinKey(a)],
    seen = new Set(queue);
  for (const key of queue) {
    if (key === pinKey(b)) return true;
    for (const link of net.links) {
      const x = pinKey(link.from),
        y = pinKey(link.to);
      const next = x === key ? y : y === key ? x : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}
export function validLink(net: Netlist, a: PinRef, b: PinRef): boolean {
  return !wireConnected(net, a, b);
}
