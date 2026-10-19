import generated from "./catalog.generated.json" with { type: "json" };
import { aliases, overrides, type Category } from "./catalog.overrides";
import { partNames } from "@/content/parts.ru";
import { learningRu as c } from "@/content/learning.ru";
import { breadboardPins } from "./breadboard";
type Key = keyof typeof generated;
type Canonical<K extends Key> = K extends keyof typeof aliases
  ? (typeof aliases)[K]
  : K;
export type PartType = Canonical<Key> | "breadboard";
export type Part = {
  type: PartType;
  name: string;
  tag: string;
  module: string;
  simulated: boolean;
  category: Category;
  group: keyof typeof c.groups;
  libraries: string[];
  attrs: Record<string, string | number>;
  width: number;
  height: number;
  pins: { name: string; x: number; y: number }[];
};
export const catalog = Object.fromEntries(
  Object.entries(generated).map(([key, meta]) => {
    const type = Object.hasOwn(aliases, key)
      ? aliases[key as keyof typeof aliases]
      : key;
    const override = overrides[key];
    return [
      type,
      {
        ...meta,
        type,
        name: partNames[key] ?? meta.tag,
        category: override?.category ?? "misc",
        group:
          override?.category === "boards"
            ? "boards"
            : override?.category === "switches" ||
                override?.category === "sensors"
              ? "inputs"
              : "outputs",
        simulated: override?.simulated ?? false,
        libraries: override?.libraries ?? [],
        attrs: override?.attrs ?? meta.attrs,
      },
    ];
  }),
) as Record<PartType, Part>;
catalog.breadboard = {
  type: "breadboard",
  name: partNames.breadboard,
  tag: "arduhub-breadboard",
  module: "breadboard",
  simulated: true,
  category: "misc",
  group: "visual",
  libraries: [],
  attrs: {},
  width: 420,
  height: 220,
  pins: breadboardPins,
};
export const partTypes = [
  ...new Set([
    "uno",
    "led",
    "resistor",
    "button",
    "pot",
    "rgb",
    "switch",
    "ldr",
    "buzzer",
    ...Object.keys(catalog),
  ]),
] as PartType[];
export const isPartType = (value: unknown): value is PartType =>
  typeof value === "string" && Object.hasOwn(catalog, value);
