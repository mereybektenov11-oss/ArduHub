import { catalog, type PartType } from "@arduhub/arduino-core/parts/catalog";
import type {
  SceneComponent,
  SceneDoc,
} from "@arduhub/arduino-core/scene/scene";

export const snap = (n: number) => Math.round(n / 10) * 10;
export function bounds(part: SceneComponent) {
  const { width, height } = catalog[part.type];
  const angle = (part.rotation * Math.PI) / 180;
  const points = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => ({
    x: part.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: part.y + x * Math.sin(angle) + y * Math.cos(angle),
  }));
  return {
    left: Math.min(...points.map((p) => p.x)) - 8,
    top: Math.min(...points.map((p) => p.y)) - 44,
    right: Math.max(...points.map((p) => p.x)) + 8,
    bottom: Math.max(...points.map((p) => p.y)) + 16,
  };
}
export function overlaps(
  a: ReturnType<typeof bounds>,
  b: ReturnType<typeof bounds>,
) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}
export function freePosition(
  scene: SceneDoc,
  type: PartType,
  center = { x: 300, y: 220 },
) {
  const occupied = scene.components.map(bounds);
  for (let radius = 0; radius < 400; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const point = {
          x: snap(center.x + dx * 40),
          y: snap(center.y + dy * 40),
        };
        const box = bounds({
          id: "candidate",
          type,
          ...point,
          rotation: 0,
          attrs: {},
        });
        if (
          box.left < 16 ||
          box.top < 16 ||
          box.right > 9900 ||
          box.bottom > 9900
        )
          continue;
        if (!occupied.some((other) => overlaps(box, other))) return point;
      }
    }
  }
  return { x: 16, y: snap(sceneExtent(scene).height + 60) };
}
export function sceneExtent(scene: SceneDoc) {
  const boxes = [
    ...scene.components.map(bounds),
    ...scene.wires.flatMap((w) =>
      w.bends.map((p) => ({
        left: p.x - 4,
        right: p.x + 4,
        top: p.y - 4,
        bottom: p.y + 4,
      })),
    ),
  ];
  const x = Math.floor(Math.min(0, ...boxes.map((b) => b.left - 16)) / 10) * 10,
    y = Math.floor(Math.min(0, ...boxes.map((b) => b.top - 16)) / 10) * 10;
  return {
    x,
    y,
    width: Math.max(600, ...boxes.map((b) => b.right + 32)) - x,
    height: Math.max(440, ...boxes.map((b) => b.bottom + 32)) - y,
  };
}
