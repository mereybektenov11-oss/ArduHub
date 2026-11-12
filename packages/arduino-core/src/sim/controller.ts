import { UnoRunner, type Sample } from "@arduhub/arduino-core/sim/runner";
import { applyInputs } from "@arduhub/arduino-core/sim/glue/inputs";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { attachTimed } from "@arduhub/arduino-core/sim/glue/timed";
import { attachBuses } from "@arduhub/arduino-core/sim/glue/buses";
import { initialInputs } from "@arduhub/arduino-core/sim/inputState";
import {
  ArduinoInterpreter,
  applyInterpreterInputs,
} from "@arduhub/arduino-core/sim/interpreter";
export type Start = {
  type: "start";
  hex?: string;
  interpreterCode?: string;
  scene: SceneDoc;
  durationMs: number;
  autoButton?: string;
  inputs?: Record<string, number>;
};
export function createSimulationController(emit: (message: unknown) => void) {
  let runner: UnoRunner | ArduinoInterpreter | null = null,
    scene: SceneDoc | null = null,
    paused = false,
    timer: ReturnType<typeof setTimeout> | null = null,
    duration = 3000,
    autoButton: string | undefined;
  let states: Record<string, number> = {},
    samples: Sample[] = [];
  function stop() {
    if (timer) clearTimeout(timer);
    timer = null;
    runner = null;
  }
  function tick() {
    if (!runner || !scene || paused) return;
    const started = performance.now();
    try {
      if (autoButton)
        states[autoButton] = runner.time >= 1000 && runner.time < 2000 ? 1 : 0;
      if (runner instanceof ArduinoInterpreter)
        applyInterpreterInputs(runner, scene, states);
      else applyInputs(runner, scene, states);
      runner.advance(20);
      const sample = runner.sample();
      samples.push(sample);
      if (samples.length > 1500) samples.shift();
      emit({ type: "frame", sample, serial: runner.serial });
      if (runner.time >= duration) {
        emit({
          type: "done",
          trace: { samples, serial: runner.serial },
        });
        stop();
        return;
      }
      timer = setTimeout(tick, Math.max(0, 20 - (performance.now() - started)));
    } catch {
      emit({ type: "error" });
      stop();
    }
  }
  const onmessage = (event: {
    data:
      | Start
      | { type: "stop" }
      | { type: "pause"; value: boolean }
      | { type: "input"; id: string; value: number };
  }) => {
    const data = event.data;
    if (data.type === "stop") {
      stop();
      return;
    }
    if (data.type === "pause") {
      paused = data.value;
      if (timer) clearTimeout(timer);
      if (!paused) tick();
      return;
    }
    if (data.type === "input") {
      states[data.id] = data.value;
      return;
    }
    stop();
    try {
      scene = data.scene;
      if (data.interpreterCode !== undefined)
        runner = new ArduinoInterpreter(data.interpreterCode);
      else {
        runner = new UnoRunner(data.hex!);
        attachTimed(runner, scene, () => states);
        attachBuses(runner, scene, () => states);
      }
      duration =
        data.durationMs === 0
          ? Infinity
          : Math.min(30000, Math.max(100, data.durationMs));
      autoButton = data.autoButton;
      samples = [];
      states = initialInputs(scene);
      states = { ...states, ...data.inputs };
      paused = false;
      tick();
    } catch {
      emit({ type: "error" });
      stop();
    }
  };

  return { onmessage, stop };
}
