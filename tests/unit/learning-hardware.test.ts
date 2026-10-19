import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { UnoRunner } from "@/domain/sim/runner";
import { applyInputs } from "@/domain/sim/glue/inputs";
import { attachTimed } from "@/domain/sim/glue/timed";
import { attachBuses } from "@/domain/sim/glue/buses";
import { outputLevels } from "@/domain/sim/glue/outputs";
import { hardwareScene } from "@/domain/lessons/content/hardware";
import type { PartType } from "@/domain/parts/catalog";
import { catalog } from "@/domain/parts/catalog";
import generated from "@/domain/parts/catalog.generated.json" with { type: "json" };
import { initialInputs } from "@/domain/sim/inputState";
import { emptyScene, makePart } from "@/domain/scene/scene";
import { connections } from "@/domain/scene/netlist";
function run(
  type: PartType,
  firmware: string,
  states: Record<string, number> = {},
  ms = 200,
) {
  const scene = hardwareScene(type, firmware === "lcd-i2c"),
    runner = new UnoRunner(
      readFileSync(`tests/fixtures/firmware/${firmware}.hex`, "utf8"),
    );
  states = { ...initialInputs(scene), ...states };
  attachTimed(runner, scene, () => states);
  attachBuses(runner, scene, () => states);
  while (runner.time < ms) {
    applyInputs(runner, scene, states);
    runner.advance(20);
  }
  const sample = runner.sample();
  return { runner, scene, sample, levels: outputLevels(scene, sample, states) };
}
describe("catalog and breadboard", () => {
  it("includes every installed component plus the project-owned breadboard", () => {
    expect(Object.keys(catalog)).toHaveLength(
      Object.keys(generated).length + 1,
    );
    expect(
      new Set(
        Object.values(catalog)
          .filter((p) => p.type !== "breadboard")
          .map((p) => p.tag),
      ),
    ).toEqual(new Set(Object.values(generated).map((p) => p.tag)));
  });
  it("joins five-hole strips and rails, without joining adjacent strips", () => {
    const scene = emptyScene();
    scene.components = [makePart("breadboard", "bb")];
    const linked = connections(scene);
    expect(
      linked(
        { componentId: "bb", pin: "1a" },
        { componentId: "bb", pin: "1e" },
      ),
    ).toBe(true);
    expect(
      linked(
        { componentId: "bb", pin: "1a" },
        { componentId: "bb", pin: "2a" },
      ),
    ).toBe(false);
    expect(
      linked(
        { componentId: "bb", pin: "1e" },
        { componentId: "bb", pin: "1f" },
      ),
    ).toBe(false);
    expect(
      linked(
        { componentId: "bb", pin: "tp1" },
        { componentId: "bb", pin: "tp30" },
      ),
    ).toBe(true);
  });
});
describe.skipIf(process.env.LEARNING_COVERAGE === "1")(
  "real firmware peripherals",
  () => {
    it("shows zero on 7segment and all LEDs on the bar", () => {
      expect(
        (run("segment", "segment").levels.device as number[]).map((v) =>
          Math.round(v),
        ),
      ).toEqual([1, 1, 1, 1, 1, 1, 0, 0]);
      expect(
        (run("led-bar-graph", "bar").levels.device as number[]).map((v) =>
          Math.round(v),
        ),
      ).toEqual(Array(10).fill(1));
    });
    it.each([
      "analog-joystick",
      "big-sound-sensor",
      "small-sound-sensor",
      "gas-sensor",
      "slide-potentiometer",
    ] as PartType[])("reads %s analog input", (type) => {
      expect(run(type, "analog-input", { device: 75 }).runner.serial).toContain(
        "768",
      );
    });
    it.each(["pir-motion-sensor", "tilt-switch"] as PartType[])(
      "reads %s digital input",
      (type) => {
        expect(
          run(type, "digital-input", { device: 1 }).runner.serial,
        ).toContain("1");
        expect(
          run(type, "digital-input", { device: 0 }).runner.serial,
        ).toContain("0");
      },
    );
    it("reads NTC, DIP and encoder pins", () => {
      expect(
        run("ntc-temperature-sensor", "analog-input", { device: 25 }).runner
          .serial,
      ).toContain("512");
      expect(
        run("dip-switch-8", "digital-input", { device: 1 }).runner.serial,
      ).toContain("0");
      expect(
        run("ky-040", "digital-input", { device: 1 }).runner.serial,
      ).toContain("0");
    });
    it("scans a membrane keypad using the real Keypad library", () =>
      expect(
        run("membrane-keypad", "keypad", { device: 0 }, 100).runner.serial,
      ).toContain("1"));
    it("decodes Servo.write(90) GPIO pulses", () =>
      expect(run("servo", "servo", {}, 100).levels.device).toBeCloseTo(90, 0));
    it("produces an HC-SR04 echo for pulseIn", () => {
      const text = run("ultrasonic", "ultrasonic", { device: 100 }, 200).runner
        .serial;
      const values = text.trim().split(/\s+/).map(Number);
      expect(
        values.some((n) => Math.abs(n - 5800) < 290),
        text,
      ).toBe(true);
    });
    it("moves a stepper through real phase changes", () =>
      expect(
        Math.abs(
          Number(run("stepper-motor", "stepper", {}, 300).levels.device),
        ),
      ).toBeGreaterThan(10));
    it("displays LiquidCrystal text on LCD1602 and LCD2004", () => {
      for (const type of ["lcd", "lcd2004"] as const)
        expect(run(type, "lcd", {}, 100).sample.devices?.device).toContain(
          "Privet",
        );
    });
    it("drives the LCD backpack through I2C enable transitions", () =>
      expect(run("lcd", "lcd-i2c", {}, 300).sample.devices?.device).toContain(
        "Privet",
      ));
    it("reads MPU6050 registers and DS1307 clock", () => {
      expect(
        run("mpu6050", "mpu", { "device.x": 1234 }).runner.serial,
      ).toContain("1234");
      expect(run("ds1307", "rtc").runner.serial).toContain("C");
    });
    it("draws an Adafruit SSD1306 framebuffer", () => {
      const buffer = run("ssd1306", "oled", {}, 300).sample.devices
        ?.device as number[];
      expect(buffer?.[1]).toBe(2);
    });
    it("reads DHT22 temperature over the one-wire signal", () => {
      expect(
        run("dht", "dht", { device: 23, "device.humidity": 50 }, 3500).runner
          .serial,
      ).toContain("23.00");
    }, 20000);
  },
);
