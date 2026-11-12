import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  exampleScene,
  learningLessons,
} from "@arduhub/arduino-core/lessons/content";
import { isScene, emptyScene } from "@arduhub/arduino-core/scene/scene";
import { migrateScene } from "@arduhub/arduino-core/scene/migrate";
import { referenceCircuit } from "@arduhub/arduino-core/checker/netlist";
import { canWire, shorted } from "@arduhub/arduino-core/scene/netlist";
import { checkScene } from "@arduhub/arduino-core/scene/check";
import { checkBehavior } from "@arduhub/arduino-core/sim/checks";
import { UnoRunner } from "@arduhub/arduino-core/sim/runner";
import { applyInputs } from "@arduhub/arduino-core/sim/glue/inputs";
import { loadHex } from "@arduhub/arduino-core/sim/hex";

import { buzzerFrequency } from "@arduhub/arduino-core/sim/glue/outputs";
describe("learning scene", () => {
  it("validates actual Wokwi pins, migration and all examples", () => {
    for (const kind of ["blink", "button", "pwm", "serial"])
      expect(isScene(exampleScene(kind))).toBe(true);
    const old = migrateScene(referenceCircuit())!;
    expect(isScene(old)).toBe(true);
    expect(old.wires.some((w) => w.from.pin === "C")).toBe(true);
    expect(migrateScene({})).toBe(null);
    expect(migrateScene(old)).toEqual(old);
  });
  it("rejects invalid scene data", () => {
    for (const patch of [
      { version: 2 },
      { board: "mega" },
      { components: [{ id: "x", type: "<script>" }] },
      { wires: [{ id: "x" }] },
    ])
      expect(isScene({ ...emptyScene(), ...patch })).toBe(false);
    const scene = exampleScene();
    scene.wires[0].from.pin = "missing";
    expect(isScene(scene)).toBe(false);
  });
  it("passes three references and finds missing links, reversed LED and missing resistor", () => {
    for (const kind of ["blink", "button", "pwm"]) {
      const s = exampleScene(kind);
      expect(checkScene(s, s)).toEqual([]);
    }
    const ref = exampleScene();
    const missing = structuredClone(ref);
    missing.wires = [];
    expect(checkScene(missing, ref).length).toBeGreaterThan(0);
    const reversed = structuredClone(ref);
    for (const w of reversed.wires)
      for (const end of [w.from, w.to])
        if (end.componentId === "led") end.pin = end.pin === "A" ? "C" : "A";
    expect(checkScene(reversed, ref).length).toBeGreaterThan(0);
    expect(checkScene(emptyScene(), ref).length).toBe(1);
  });
  it("rejects duplicate or nonexistent pins and detects short circuit", () => {
    const s = exampleScene();
    expect(canWire(s, s.wires[0].from, s.wires[0].to)).toBe(false);
    expect(canWire(s, { componentId: "uno", pin: "no" }, s.wires[0].to)).toBe(
      false,
    );
    expect(shorted(s)).toBe(false);
    s.wires.push({
      id: "short",
      from: { componentId: "uno", pin: "5V" },
      to: { componentId: "uno", pin: "GND.1" },
      color: "#000000",
      bends: [],
    });
    expect(shorted(s)).toBe(true);
    expect(checkScene(s, exampleScene()).length).toBeGreaterThan(0);
  });
});
describe.skipIf(process.env.LEARNING_COVERAGE === "1")(
  "real AVR firmware",
  () => {
    for (const [kind, index] of [
      ["blink", 0],
      ["button", 2],
      ["pwm", 5],
    ] as const)
      it(`executes ${kind}.hex with GPIO, ADC, PWM and Serial`, () => {
        const hex = readFileSync(
            new URL(
              `../../../tests/fixtures/firmware/${kind}.hex`,
              import.meta.url,
            ),
            "utf8",
          ),
          r = new UnoRunner(hex),
          samples = [];
        const s = exampleScene(kind);
        while (r.time < 3200) {
          applyInputs(r, s, {
            btn: r.time >= 1000 && r.time < 2000 ? 1 : 0,
            pot: 50,
          });
          r.advance(20);
          samples.push(r.sample());
        }
        const result = checkBehavior(learningLessons[index].run.checks, {
          samples,
          serial: r.serial,
        });
        expect(
          result.every((x) => x.pass),
          JSON.stringify({ result, serial: r.serial }),
        ).toBe(true);
      }, 15000);
    it("measures tone frequency from real GPIO transitions", () => {
      const r = new UnoRunner(
        readFileSync(
          new URL(
            "../../../tests/fixtures/firmware/buzzer.hex",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const scene = exampleScene("buzzer");
      applyInputs(r, scene, {});
      r.advance(100);
      r.sample();
      r.advance(100);
      const data = r.sample();
      expect(buzzerFrequency(scene, "buzzer", data)).toBeCloseTo(1000, -1);
    });
    it(
      "does not pass constant output as blink or button response",
      { timeout: 15000 },
      () => {
        const r = new UnoRunner(
            readFileSync(
              new URL(
                "../../../tests/fixtures/firmware/constant.hex",
                import.meta.url,
              ),
              "utf8",
            ),
          ),
          samples = [];
        while (r.time < 3200) {
          r.advance(20);
          samples.push(r.sample());
        }
        expect(
          checkBehavior(learningLessons[0].run.checks, {
            samples,
            serial: "",
          })[0].pass,
        ).toBe(false);
        expect(
          checkBehavior(learningLessons[2].run.checks, {
            samples,
            serial: "",
          })[0].pass,
        ).toBe(false);
      },
    );
    it("handles empty traces and rejects invalid hex", () => {
      expect(
        checkBehavior(
          [
            { kind: "serialContains", text: "x" },
            { kind: "pwmLevel", pin: 9, min: 1, max: 2 },
          ],
          { samples: [], serial: "" },
        ).every((x) => !x.pass),
      ).toBe(true);
      for (const hex of [
        "",
        ":00000001FE",
        ":0100000001FE",
        ":00000001FF\n:00000001FF",
        "oops",
      ])
        expect(() => loadHex(hex)).toThrow();
    });
  },
);
