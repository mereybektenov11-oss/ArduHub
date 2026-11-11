import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { findBoardPin } from "@arduhub/arduino-core/scene/netlist";
import type { Sample } from "@arduhub/arduino-core/sim/runner";
export function buzzerFrequency(
  scene: SceneDoc,
  id: string,
  sample: Sample,
  states: Record<string, number> = {},
) {
  const target = ["1", "2"]
    .map((pin) => findBoardPin(scene, { componentId: id, pin }, states))
    .find((pin) => pin !== null && /^\d+$|^A[0-5]$/.test(pin));
  if (!target) return 0;
  const index = target.startsWith("A")
    ? 14 + Number(target.slice(1))
    : Number(target);
  return sample.frequency?.[index] ?? 0;
}
export function outputLevels(
  scene: SceneDoc,
  sample: Sample | null,
  states: Record<string, number> = {},
) {
  const voltage = (id: string, pin: string) => {
    if (!sample) return 0;
    const target = findBoardPin(scene, { componentId: id, pin }, states);
    if (target === "5V") return 1;
    if (target === "GND.2" || target === null) return 0;
    const n = target.startsWith("A")
      ? 14 + Number(target.slice(1))
      : Number(target);
    return sample ? Math.max(0, sample.pwm[n] ?? 0) / 255 : 0;
  };
  return Object.fromEntries(
    scene.components.map((c) => [
      c.id,
      c.type === "led"
        ? Math.max(0, voltage(c.id, "A") - voltage(c.id, "C"))
        : c.type === "rgb"
          ? ["R", "G", "B"].map((p) =>
              Math.max(0, voltage(c.id, p) - voltage(c.id, "COM")),
            )
          : c.type === "segment"
            ? ["A", "B", "C", "D", "E", "F", "G", "DP"].map((pin) =>
                Math.abs(voltage(c.id, pin) - voltage(c.id, "COM.1")),
              )
            : c.type === "led-bar-graph"
              ? Array.from({ length: 10 }, (_, i) =>
                  Math.max(
                    0,
                    voltage(c.id, `A${i + 1}`) - voltage(c.id, `C${i + 1}`),
                  ),
                )
              : c.type === "servo"
                ? (() => {
                    const pin = findBoardPin(scene, {
                      componentId: c.id,
                      pin: "PWM",
                    });
                    const width = pin ? sample?.pulseWidths?.[Number(pin)] : 0;
                    return width
                      ? Math.max(0, Math.min(180, ((width - 544) * 180) / 1856))
                      : 0;
                  })()
                : c.type === "stepper-motor"
                  ? Number(sample?.devices?.[c.id] ?? 0)
                  : c.type === "buzzer"
                    ? Math.abs(voltage(c.id, "2") - voltage(c.id, "1"))
                    : 0,
    ]),
  );
}
