import { catalog } from "@arduhub/arduino-core/parts/catalog";
import type {
  SceneComponent,
  SceneDoc,
  PinRef,
} from "@arduhub/arduino-core/scene/scene";
export function componentPins(c: SceneComponent) {
  if ((c.type === "lcd" || c.type === "lcd2004") && c.attrs.pins === "i2c")
    return [
      { name: "GND", x: 4, y: 32 },
      { name: "VCC", x: 4, y: 41.5 },
      { name: "SDA", x: 4, y: 51 },
      { name: "SCL", x: 4, y: 60.5 },
    ];
  return catalog[c.type].pins;
}
export function validPin(scene: SceneDoc, p: PinRef): boolean {
  const component = scene.components.find((c) => c.id === p.componentId);
  return (
    !!component && componentPins(component).some((pin) => pin.name === p.pin)
  );
}
export function pinPosition(c: SceneComponent, pin: string) {
  const info = componentPins(c).find((p) => p.name === pin);
  if (!info) return null;
  const radians = (c.rotation * Math.PI) / 180;
  return {
    x: c.x + info.x * Math.cos(radians) - info.y * Math.sin(radians),
    y: c.y + info.x * Math.sin(radians) + info.y * Math.cos(radians),
  };
}
