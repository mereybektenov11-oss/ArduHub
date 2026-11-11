import {
  catalog,
  isPartType,
  type PartType,
} from "@arduhub/arduino-core/parts/catalog";
import { validPin } from "@arduhub/arduino-core/parts/pins";
export type PinRef = { componentId: string; pin: string };
export type SceneComponent = {
  id: string;
  type: PartType;
  x: number;
  y: number;
  rotation: number;
  attrs: Record<string, string | number>;
};
export type SceneDoc = {
  version: 1;
  board: "uno";
  components: SceneComponent[];
  wires: {
    id: string;
    from: PinRef;
    to: PinRef;
    color: string;
    bends: { x: number; y: number }[];
  }[];
};
export const emptyScene = (): SceneDoc => ({
  version: 1,
  board: "uno",
  components: [],
  wires: [],
});
export function makePart(
  type: PartType,
  id: string,
  x = 60,
  y = 100,
): SceneComponent {
  return { id, type, x, y, rotation: 0, attrs: { ...catalog[type].attrs } };
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const coordinate = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 10000;
const id = (v: unknown) => typeof v === "string" && /^[\w-]{1,80}$/.test(v);
export function isScene(v: unknown): v is SceneDoc {
  if (
    !record(v) ||
    v.version !== 1 ||
    v.board !== "uno" ||
    !Array.isArray(v.components) ||
    !Array.isArray(v.wires) ||
    v.components.length > 60 ||
    v.wires.length > 120
  )
    return false;
  if (
    !v.components.every(
      (c) =>
        record(c) &&
        id(c.id) &&
        isPartType(c.type) &&
        coordinate(c.x) &&
        coordinate(c.y) &&
        [0, 90, 180, 270].includes(c.rotation as number) &&
        record(c.attrs) &&
        Object.keys(c.attrs).length <= 12 &&
        Object.entries(c.attrs).every(
          ([k, a]) =>
            ["value", "color", "common", "frequency", "pins"].includes(k) &&
            ((typeof a === "string" && a.length <= 40) ||
              (typeof a === "number" &&
                Number.isFinite(a) &&
                Math.abs(a) <= 1e9)),
        ),
    )
  )
    return false;
  const s = v as SceneDoc;
  if (
    new Set(s.components.map((c) => c.id)).size !== s.components.length ||
    new Set(s.wires.map((w) => w.id)).size !== s.wires.length
  )
    return false;
  return s.wires.every(
    (w) =>
      record(w) &&
      id(w.id) &&
      record(w.from) &&
      record(w.to) &&
      validPin(s, w.from as PinRef) &&
      validPin(s, w.to as PinRef) &&
      typeof w.color === "string" &&
      /^#[\da-f]{6}$/i.test(w.color) &&
      Array.isArray(w.bends) &&
      w.bends.length <= 20 &&
      w.bends.every((p) => record(p) && coordinate(p.x) && coordinate(p.y)),
  );
}
