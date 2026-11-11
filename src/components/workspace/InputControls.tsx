"use client";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { catalog } from "@arduhub/arduino-core/parts/catalog";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import { inputCopy as copy } from "@arduhub/curriculum/inputs.ru";
const interactive = [
  "button",
  "pushbutton-6mm",
  "switch",
  "pot",
  "ldr",
  "slide-potentiometer",
  "ntc-temperature-sensor",
  "analog-joystick",
  "big-sound-sensor",
  "small-sound-sensor",
  "gas-sensor",
  "pir-motion-sensor",
  "tilt-switch",
  "dip-switch-8",
  "membrane-keypad",
  "ky-040",
  "ultrasonic",
  "dht",
  "mpu6050",
];
export default function InputControls({
  scene,
  states,
  onInput,
}: {
  scene: SceneDoc;
  states: Record<string, number>;
  onInput: (id: string, value: number) => void;
}) {
  const slider = (
    id: string,
    label: string,
    min = 0,
    max = 100,
    initial = 50,
  ) => (
    <label key={id}>
      {label}: {states[id] ?? initial}
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={states[id] ?? initial}
        onChange={(e) => onInput(id, Number(e.target.value))}
      />
    </label>
  );
  return (
    <div className="l2-inputs">
      {scene.components
        .filter((p) => interactive.includes(p.type))
        .map((p) => (
          <fieldset key={p.id}>
            <legend>
              {catalog[p.type].name} · {p.id}
            </legend>
            {[
              "button",
              "pushbutton-6mm",
              "switch",
              "pir-motion-sensor",
              "tilt-switch",
            ].includes(p.type) ? (
              <button
                aria-label={`${catalog[p.type].name} ${p.id}`}
                aria-pressed={!!states[p.id]}
                onClick={() => onInput(p.id, states[p.id] ? 0 : 1)}
              >
                {states[p.id] ? c.pressed : c.released}
              </button>
            ) : p.type === "dip-switch-8" ? (
              Array.from({ length: 8 }, (_, i) => (
                <button
                  key={i}
                  aria-label={`${copy.switches} ${i + 1}`}
                  aria-pressed={!!((states[p.id] ?? 0) & (1 << i))}
                  onClick={() => onInput(p.id, (states[p.id] ?? 0) ^ (1 << i))}
                >
                  {i + 1}
                </button>
              ))
            ) : p.type === "membrane-keypad" ? (
              <select
                aria-label={copy.key}
                value={states[p.id] ?? -1}
                onChange={(e) => onInput(p.id, Number(e.target.value))}
              >
                <option value={-1}>{copy.released}</option>
                {[
                  "1",
                  "2",
                  "3",
                  "A",
                  "4",
                  "5",
                  "6",
                  "B",
                  "7",
                  "8",
                  "9",
                  "C",
                  "*",
                  "0",
                  "#",
                  "D",
                ].map((key, i) => (
                  <option key={key} value={i}>
                    {key}
                  </option>
                ))}
              </select>
            ) : p.type === "analog-joystick" ? (
              <>
                {slider(p.id, `${copy.horizontal} ${p.id}`)}
                {slider(`${p.id}.y`, `${copy.vertical} ${p.id}`)}
              </>
            ) : p.type === "ultrasonic" ? (
              slider(p.id, `${copy.distance} ${p.id}`, 2, 400, 100)
            ) : p.type === "ntc-temperature-sensor" || p.type === "dht" ? (
              <>
                {slider(p.id, `${copy.temperature} ${p.id}`, -20, 80, 25)}
                {p.type === "dht" &&
                  slider(
                    `${p.id}.humidity`,
                    `${copy.humidity} ${p.id}`,
                    0,
                    100,
                    50,
                  )}
              </>
            ) : p.type === "mpu6050" ? (
              <>
                {["x", "y", "z"].map((axis) =>
                  slider(
                    `${p.id}.${axis}`,
                    `${axis.toUpperCase()} ${p.id}`,
                    -16000,
                    16000,
                    0,
                  ),
                )}
              </>
            ) : (
              slider(
                p.id,
                `${p.type === "ky-040" ? copy.rotation : catalog[p.type].name} ${p.id}`,
                0,
                p.type === "ky-040" ? 1000 : 100,
                Number(p.attrs.value ?? (p.type === "ky-040" ? 0 : 50)),
              )
            )}
          </fieldset>
        ))}
    </div>
  );
}
