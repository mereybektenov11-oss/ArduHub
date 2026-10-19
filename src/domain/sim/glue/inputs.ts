import { findBoardPin, connections } from "@/domain/scene/netlist";
import type { SceneDoc } from "@/domain/scene/scene";
import type { UnoRunner } from "../runner";
export function applyInputs(
  r: UnoRunner,
  s: SceneDoc,
  states: Record<string, number>,
) {
  r.inputs = { ...states };
  const board = s.components.find((c) => c.type === "uno");
  if (!board) return;
  // INPUT_PULLUP works when no external contact grounds the input.
  for (let pin = 0; pin < 20; pin++) {
    if (r.externalPins.has(pin)) continue;
    const name = pin < 14 ? String(pin) : `A${pin - 14}`;
    const p = { componentId: board.id, pin: name };
    const linked = connections(s, false, states);
    r.input(pin, !linked(p, { componentId: board.id, pin: "GND.2" }));
  }
  for (const c of s.components)
    if (
      [
        "pot",
        "ldr",
        "slide-potentiometer",
        "ntc-temperature-sensor",
        "analog-joystick",
        "big-sound-sensor",
        "small-sound-sensor",
        "gas-sensor",
      ].includes(c.type)
    ) {
      const vcc = findBoardPin(s, { componentId: c.id, pin: "VCC" }, states),
        gnd = findBoardPin(s, { componentId: c.id, pin: "GND" }, states);
      const target = findBoardPin(
        s,
        {
          componentId: c.id,
          pin: ["pot", "slide-potentiometer"].includes(c.type)
            ? "SIG"
            : c.type === "ntc-temperature-sensor"
              ? "OUT"
              : c.type === "analog-joystick"
                ? "HORZ"
                : [
                      "big-sound-sensor",
                      "small-sound-sensor",
                      "gas-sensor",
                    ].includes(c.type)
                  ? "AOUT"
                  : "AO",
        },
        states,
      );
      if (target?.startsWith("A"))
        r.analog(
          Number(target.slice(1)),
          vcc === "5V" && gnd === "GND.2"
            ? c.type === "ntc-temperature-sensor"
              ? 5 *
                (1 /
                  (1 +
                    Math.exp(
                      3950 * (1 / ((states[c.id] ?? 25) + 273.15) - 1 / 298.15),
                    )))
              : Math.max(
                  0,
                  Math.min(100, states[c.id] ?? Number(c.attrs.value ?? 50)),
                ) / 20
            : 0,
        );
      if (c.type === "analog-joystick") {
        const vertical = findBoardPin(
          s,
          { componentId: c.id, pin: "VERT" },
          states,
        );
        if (vertical?.startsWith("A"))
          r.analog(
            Number(vertical.slice(1)),
            vcc === "5V" && gnd === "GND.2"
              ? (states[`${c.id}.y`] ?? 50) / 20
              : 0,
          );
      }
    }
  for (const part of s.components) {
    if (
      [
        "pir-motion-sensor",
        "tilt-switch",
        "big-sound-sensor",
        "small-sound-sensor",
        "gas-sensor",
      ].includes(part.type)
    ) {
      const pin = findBoardPin(
        s,
        {
          componentId: part.id,
          pin: ["pir-motion-sensor", "tilt-switch"].includes(part.type)
            ? "OUT"
            : "DOUT",
        },
        states,
      );
      const powered =
        findBoardPin(s, { componentId: part.id, pin: "VCC" }, states) ===
          "5V" &&
        findBoardPin(s, { componentId: part.id, pin: "GND" }, states) ===
          "GND.2";
      if (pin && /^\d+$/.test(pin))
        r.input(
          Number(pin),
          powered &&
            (states[part.id] ?? 0) >
              (["pir-motion-sensor", "tilt-switch"].includes(part.type)
                ? 0
                : 50),
        );
    }
  }
  for (const part of s.components)
    if (part.type === "ky-040") {
      const phase = Math.abs(Math.round(states[part.id] ?? 0)) % 4;
      const sequence = [
        [1, 1],
        [0, 1],
        [0, 0],
        [1, 0],
      ][phase];
      for (const [name, value] of [
        ["CLK", sequence[0]],
        ["DT", sequence[1]],
        ["SW", states[`${part.id}.press`] ? 0 : 1],
      ] as const) {
        const pin = findBoardPin(
          s,
          { componentId: part.id, pin: name },
          states,
        );
        if (pin && /^\d+$/.test(pin)) r.input(Number(pin), !!value);
      }
    }
}
