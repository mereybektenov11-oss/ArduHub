import { describe, it, expect } from "vitest";
import { exampleScene } from "@arduhub/arduino-core/lessons/content";
import { emptyScene, makePart } from "@arduhub/arduino-core/scene/scene";
import {
  connections,
  canWire,
  findBoardPin,
  shorted,
} from "@arduhub/arduino-core/scene/netlist";
import {
  migrateScene,
  legacyNetlist,
} from "@arduhub/arduino-core/scene/migrate";
import { referenceCircuit } from "@arduhub/arduino-core/checker/netlist";
import { checkScene } from "@arduhub/arduino-core/scene/check";
import { checkBehavior } from "@arduhub/arduino-core/sim/checks";
import type { Sample } from "@arduhub/arduino-core/sim/runner";

import { outputLevels } from "@arduhub/arduino-core/sim/glue/outputs";
const sample = (
  time: number,
  value: number,
  input = 0,
  pwm = value * 255,
): Sample => ({
  time,
  pins: Array(20).fill(value),
  pwm: Array(20).fill(pwm),
  inputs: { btn: input },
});
describe("every behavior check, passing and failing", () => {
  it("turns off fixed-power LEDs when the simulation stops", () => {
    const scene = exampleScene();
    scene.wires[0].from.pin = "5V";
    expect(outputLevels(scene, sample(1000, 0)).led).toBe(1);
    expect(outputLevels(scene, null).led).toBe(0);
  });
  it("checks toggles, observation windows and input-only pins", () => {
    const check = {
      kind: "pinBlinks",
      pin: 13,
      minToggles: 2,
      withinMs: 1000,
    } as const;
    expect(
      checkBehavior([check], {
        samples: [
          sample(0, -1),
          sample(10, 0),
          sample(20, 0),
          sample(100, 1),
          sample(200, 0),
          sample(2000, 1),
        ],
        serial: "",
      })[0].pass,
    ).toBe(true);
    expect(
      checkBehavior([check], { samples: [sample(0, 1)], serial: "" })[0].pass,
    ).toBe(false);
  });
  it("requires both released-low and pressed-high for button response", () => {
    const check = {
      kind: "pinHighWhen",
      pin: 13,
      input: { part: "btn", state: "pressed" },
      withinMs: 3000,
    } as const;
    for (const [samples, pass] of [
      [[sample(200, 0, 0), sample(1500, 1, 1)], true],
      [[sample(200, 1, 0), sample(1500, 1, 1)], false],
      [[sample(0, 0, 0), sample(4000, 1, 1)], false],
      [[sample(200, 0, 0), sample(1500, 0, 1)], false],
    ] as const)
      expect(
        checkBehavior([check], { samples: [...samples], serial: "" })[0].pass,
      ).toBe(pass);
  });
  it("checks serial and averaged PWM with no startup samples", () => {
    const checks = [
      { kind: "serialContains", text: "Hello" },
      { kind: "pwmLevel", pin: 9, min: 120, max: 136 },
    ] as const;
    expect(
      checkBehavior([...checks], {
        samples: [sample(0, 0), sample(1000, 1, 0, 128)],
        serial: "Hello world",
      }).every((x) => x.pass),
    ).toBe(true);
    for (const level of [0, 255])
      expect(
        checkBehavior([checks[1]], {
          samples: [sample(1000, 1, 0, level)],
          serial: "",
        })[0].pass,
      ).toBe(false);
    expect(
      checkBehavior([...checks], { samples: [], serial: "" }).every(
        (x) => !x.pass,
      ),
    ).toBe(true);
  });
});
describe("netlist branches and migrations", () => {
  it("handles input contacts, aliases, resistors and isolated pins", () => {
    const s = exampleScene("button");
    s.components.push(makePart("switch", "sw"));
    s.wires.push({
      id: "sw",
      from: { componentId: "sw", pin: "2" },
      to: { componentId: "uno", pin: "12" },
      color: "#000000",
      bends: [],
    });
    const p = (componentId: string, pin: string) => ({ componentId, pin });
    expect(connections(s)(p("btn", "1.l"), p("btn", "1.r"))).toBe(true);
    expect(connections(s)(p("btn", "1.l"), p("btn", "2.l"))).toBe(false);
    expect(
      connections(s, false, { btn: 1 })(p("btn", "1.l"), p("btn", "2.l")),
    ).toBe(true);
    expect(connections(s)(p("sw", "2"), p("sw", "1"))).toBe(true);
    expect(connections(s, false, { sw: 1 })(p("sw", "2"), p("sw", "3"))).toBe(
      true,
    );
    s.components.find((p) => p.id === "sw")!.attrs.value = 1;
    expect(connections(s)(p("sw", "2"), p("sw", "3"))).toBe(true);
    expect(findBoardPin(s, p("led", "A"))).toBe("13");
    expect(findBoardPin(s, p("led", "C"))).toBe("GND.2");
    expect(findBoardPin(s, p("sw", "3"), { sw: 1 })).toBe("12");
    expect(findBoardPin(s, p("no", "pin"))).toBeNull();
    expect(findBoardPin(emptyScene(), p("x", "x"))).toBeNull();
    expect(shorted(emptyScene())).toBe(false);
    expect(canWire(s, p("uno", "12"), p("uno", "12"))).toBe(false);
    expect(canWire(s, p("uno", "12"), p("uno", "11"))).toBe(true);
    s.wires = Array.from({ length: 120 }, (_, i) => ({
      id: `w${i}`,
      from: p("uno", "0"),
      to: p("uno", "1"),
      color: "#000000",
      bends: [],
    }));
    expect(canWire(s, p("uno", "12"), p("uno", "11"))).toBe(false);
  });
  it("migrates button/LED/GND pins and rejects incompatible old identifiers", () => {
    const old = referenceCircuit(true);
    expect(
      migrateScene(old)?.wires.flatMap((w) => [w.from.pin, w.to.pin]),
    ).toContain("1.l");
    old.components[0].id = "bad id";
    for (const w of old.links)
      for (const p of [w.from, w.to])
        if (p.componentId === "uno") p.componentId = "bad id";
    expect(migrateScene(old)).toBeNull();
    const scene = exampleScene("button");
    scene.components.push(makePart("pot", "pot"));
    expect(legacyNetlist(scene).components.some((c) => c.id === "pot")).toBe(
      false,
    );
  });
  it("rejects missing or miswired inputs and allows reversed button sides", () => {
    for (const kind of ["button", "pwm"]) {
      const ref = exampleScene(kind),
        s = structuredClone(ref);
      s.components = s.components.filter(
        (c) => c.type !== (kind === "button" ? "button" : "pot"),
      );
      s.wires = s.wires.filter(
        (w) =>
          s.components.some((c) => c.id === w.from.componentId) &&
          s.components.some((c) => c.id === w.to.componentId),
      );
      expect(checkScene(s, ref).length).toBeGreaterThan(0);
      const wrong = structuredClone(ref);
      wrong.wires.pop();
      expect(checkScene(wrong, ref).length).toBeGreaterThan(0);
    }
    const s = exampleScene("button");
    for (const w of s.wires)
      for (const p of [w.from, w.to])
        if (p.componentId === "btn") p.pin = p.pin === "1.l" ? "2.l" : "1.l";
    expect(checkScene(s, exampleScene("button"))).toEqual([]);
  });
});
