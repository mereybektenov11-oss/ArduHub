import type { SceneDoc } from "@/domain/scene/scene";
export function initialInputs(scene: SceneDoc): Record<string, number> {
  return Object.fromEntries(
    scene.components.map((part) => [
      part.id,
      Number(
        part.attrs.value ??
          ([
            "pot",
            "ldr",
            "slide-potentiometer",
            "analog-joystick",
            "big-sound-sensor",
            "small-sound-sensor",
            "gas-sensor",
          ].includes(part.type)
            ? 50
            : ["ntc-temperature-sensor", "dht"].includes(part.type)
              ? 25
              : part.type === "ultrasonic"
                ? 100
                : part.type === "membrane-keypad"
                  ? -1
                  : 0),
      ),
    ]),
  );
}
