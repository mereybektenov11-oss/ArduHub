import type { Trace } from "@arduhub/arduino-core/sim/runner";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
export type BehaviorCheck =
  | { kind: "pinBlinks"; pin: number; minToggles: number; withinMs: number }
  | {
      kind: "pinHighWhen";
      pin: number;
      input: { part: string; state: "pressed" };
      withinMs: number;
    }
  | { kind: "serialContains"; text: string }
  | { kind: "serialNumber"; min: number; max: number }
  | { kind: "pulseWidth"; pin: number; min: number; max: number }
  | { kind: "displayContains"; text: string }
  | { kind: "pwmLevel"; pin: number; min: number; max: number };
export type CheckResult = { pass: boolean; message: string };
export function checkBehavior(
  checks: BehaviorCheck[],
  trace: Trace,
): CheckResult[] {
  return checks.map((check) => {
    if (check.kind === "displayContains")
      return {
        pass: trace.samples.some((s) =>
          Object.values(s.devices ?? {}).some(
            (v) => typeof v === "string" && v.includes(check.text),
          ),
        ),
        message: c.checks.serial(check.text),
      };
    if (check.kind === "serialNumber")
      return {
        pass: trace.serial
          .trim()
          .split(/\s+/)
          .some(
            (v) =>
              v !== "" &&
              Number.isFinite(Number(v)) &&
              Number(v) >= check.min &&
              Number(v) <= check.max,
          ),
        message: c.checks.serial(`${check.min}…${check.max}`),
      };
    if (check.kind === "pulseWidth")
      return {
        pass: trace.samples.some((s) => {
          const width = s.pulseWidths?.[check.pin] ?? 0;
          return width >= check.min && width <= check.max;
        }),
        message: c.checks.pwm(check.pin, 90),
      };
    if (check.kind === "serialContains")
      return {
        pass: trace.serial.includes(check.text),
        message: c.checks.serial(check.text),
      };
    if (check.kind === "pinBlinks") {
      const values = trace.samples
        .filter((s) => s.time <= check.withinMs && s.pins[check.pin] >= 0)
        .map((s) => s.pins[check.pin]);
      const toggles = values.reduce(
        (n, v, i) => n + (i > 0 && values[i - 1] !== v ? 1 : 0),
        0,
      );
      return {
        pass: toggles >= check.minToggles,
        message:
          toggles >= check.minToggles
            ? c.checks.blink(check.pin, toggles)
            : c.checks.noBlink(check.pin),
      };
    }
    if (check.kind === "pinHighWhen") {
      const samples = trace.samples.filter(
        (s) => s.time > 100 && s.time <= check.withinMs,
      );
      const high = samples.some(
        (s) => s.inputs[check.input.part] === 1 && s.pins[check.pin] === 1,
      );
      const low = samples.some(
        (s) => s.inputs[check.input.part] === 0 && s.pins[check.pin] === 0,
      );
      return { pass: high && low, message: c.checks.button(check.pin) };
    }
    const samples = trace.samples.filter((s) => s.time > 100);
    const value = samples.length
      ? samples.reduce((sum, s) => sum + s.pwm[check.pin], 0) / samples.length
      : 0;
    return {
      pass: samples.length > 0 && value >= check.min && value <= check.max,
      message: c.checks.pwm(check.pin, value),
    };
  });
}
