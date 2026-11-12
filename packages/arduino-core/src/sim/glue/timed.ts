import type { UnoRunner } from "@arduhub/arduino-core/sim/runner";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { findBoardPin } from "@arduhub/arduino-core/scene/netlist";
export function attachTimed(
  runner: UnoRunner,
  scene: SceneDoc,
  states: () => Record<string, number>,
) {
  const boardPin = (id: string, pin: string) => {
    const name = findBoardPin(scene, { componentId: id, pin });
    return name && /^\d+$/.test(name) ? Number(name) : -1;
  };
  const powered = (id: string, pin = "VCC") =>
    findBoardPin(scene, { componentId: id, pin }) === "5V" &&
    findBoardPin(scene, { componentId: id, pin: "GND" }) === "GND.2";
  for (const part of scene.components) {
    if (part.type === "membrane-keypad") {
      const rows = Array.from({ length: 4 }, (_, i) =>
        boardPin(part.id, `R${i + 1}`),
      );
      const columns = Array.from({ length: 4 }, (_, i) =>
        boardPin(part.id, `C${i + 1}`),
      );
      const values = new Map<number, number>();
      for (const pin of rows)
        if (pin >= 0) {
          runner.externalPins.add(pin);
          runner.input(pin, true);
        }
      runner.onPinChange.push((pin, value) => {
        if (!columns.includes(pin)) return;
        values.set(pin, value);
        const key = states()[part.id] ?? -1;
        rows.forEach((row, i) => {
          if (row >= 0)
            runner.input(
              row,
              !(
                key >= 0 &&
                Math.floor(key / 4) === i &&
                values.get(columns[key % 4]) === 0
              ),
            );
        });
      });
    }
    if (part.type === "ultrasonic" && powered(part.id)) {
      const trig = boardPin(part.id, "TRIG"),
        echo = boardPin(part.id, "ECHO");
      if (trig < 0 || echo < 0) continue;
      runner.externalPins.add(echo);
      runner.input(echo, false);
      let rising = 0;
      runner.onPinChange.push((pin, value, cycle) => {
        if (pin !== trig) return;
        if (value === 1) rising = cycle;
        else if (value === 0 && cycle - rising >= 160) {
          const distance = Math.max(2, Math.min(400, states()[part.id] ?? 100));
          runner.cpu.addClockEvent(() => runner.input(echo, true), 200 * 16);
          runner.cpu.addClockEvent(
            () => runner.input(echo, false),
            Math.round((200 + distance * 58) * 16),
          );
        }
      });
    }
    if (part.type === "stepper-motor") {
      const pins = ["A+", "A-", "B+", "B-"].map((name) =>
        boardPin(part.id, name),
      );
      if (pins.some((pin) => pin < 0)) continue;
      const values = [0, 0, 0, 0],
        sequence = [0b0101, 0b0110, 0b1010, 0b1001];
      let previous = -1,
        angle = 0,
        queued = false;
      runner.onPinChange.push((pin, value) => {
        const index = pins.indexOf(pin);
        if (index < 0) return;
        values[index] = value === 1 ? 1 : 0;
        if (queued) return;
        queued = true;
        runner.cpu.addClockEvent(() => {
          queued = false;
          const next = sequence.indexOf(
            values.reduce((n, v, i) => n | (v << i), 0),
          );
          if (next >= 0 && next !== previous) {
            if (previous >= 0) {
              const delta = (next - previous + 4) % 4;
              if (delta === 1) angle += 1.8;
              if (delta === 3) angle -= 1.8;
            }
            previous = next;
            runner.devices[part.id] = angle;
          }
        }, 100);
      });
    }
    if (part.type === "ky-040" && powered(part.id)) {
      const clk = boardPin(part.id, "CLK"),
        dt = boardPin(part.id, "DT"),
        sw = boardPin(part.id, "SW");
      for (const pin of [clk, dt, sw])
        if (pin >= 0) runner.externalPins.add(pin);
    }
  }
}
