import type { Netlist } from "@arduhub/arduino-core/types";
import { connections } from "@arduhub/arduino-core/scene/netlist";
import { isNetlist } from "@arduhub/arduino-core/checker/netlist";
import {
  emptyScene,
  isScene,
  makePart,
  type SceneDoc,
  type PinRef,
} from "@arduhub/arduino-core/scene/scene";
export function migrateScene(value: unknown): SceneDoc | null {
  if (isScene(value)) return structuredClone(value);
  if (!isNetlist(value)) return null;
  const types = {
    arduino: "uno",
    led: "led",
    resistor: "resistor",
    button: "button",
  } as const;
  const convert = (p: PinRef): PinRef => {
    const type = value.components.find((c) => c.id === p.componentId)!.type;
    const pin =
      type === "arduino" && p.pin === "GND"
        ? "GND.2"
        : type === "led" && p.pin === "K"
          ? "C"
          : type === "button"
            ? p.pin === "1"
              ? "1.l"
              : "2.l"
            : p.pin;
    return { ...p, pin };
  };
  const scene: SceneDoc = {
    ...emptyScene(),
    components: value.components.map((c) =>
      makePart(types[c.type], c.id, Math.min(470, c.x), Math.min(240, c.y)),
    ),
    wires: value.links.map((w) => ({
      ...w,
      from: convert(w.from),
      to: convert(w.to),
      color: "#c58320",
      bends: [],
    })),
  };
  return isScene(scene) ? scene : null;
}
export function legacyNetlist(s: SceneDoc): Netlist {
  const types = {
    uno: "arduino",
    led: "led",
    resistor: "resistor",
    button: "button",
  } as const;
  const components = s.components
    .filter((c) => c.type in types)
    .map((c) => ({
      id: c.id,
      type: types[c.type as keyof typeof types],
      x: c.x,
      y: c.y,
      pins:
        c.type === "uno"
          ? [
              "13",
              "12",
              "11",
              "10",
              "9",
              "8",
              "7",
              "6",
              "5",
              "4",
              "3",
              "2",
              "1",
              "0",
              "5V",
              "GND",
            ]
          : c.type === "led"
            ? ["A", "K"]
            : ["1", "2"],
    }));
  const convert = (p: PinRef): PinRef => {
    const type = s.components.find((c) => c.id === p.componentId)?.type;
    return {
      ...p,
      pin:
        type === "uno" && p.pin.startsWith("GND")
          ? "GND"
          : type === "led" && p.pin === "C"
            ? "K"
            : type === "button"
              ? p.pin.startsWith("1")
                ? "1"
                : "2"
              : p.pin,
    };
  };
  const result: Netlist = {
    components,
    links: s.wires
      .filter(
        (w) =>
          components.some((c) => c.id === w.from.componentId) &&
          components.some((c) => c.id === w.to.componentId),
      )
      .map((w) => ({ id: w.id, from: convert(w.from), to: convert(w.to) })),
  };
  if (s.components.some((c) => c.type === "breadboard")) {
    const linked = connections(s);
    const terminals = s.components
      .filter((c) => c.type in types)
      .flatMap((c) =>
        c.type === "uno"
          ? [
              "13",
              "12",
              "11",
              "10",
              "9",
              "8",
              "7",
              "6",
              "5",
              "4",
              "3",
              "2",
              "1",
              "0",
              "5V",
              "GND.2",
            ].map((pin) => ({ componentId: c.id, pin }))
          : (c.type === "led"
              ? ["A", "C"]
              : c.type === "button"
                ? ["1.l", "2.l"]
                : ["1", "2"]
            ).map((pin) => ({ componentId: c.id, pin })),
      );
    terminals.forEach((a, i) =>
      terminals.slice(i + 1).forEach((b) => {
        if (linked(a, b))
          result.links.push({
            id: `net-${result.links.length}`,
            from: convert(a),
            to: convert(b),
          });
      }),
    );
  }
  return result;
}
