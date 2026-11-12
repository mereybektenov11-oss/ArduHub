import type { IconName } from "@/components/icons/Icon";
export const mapSize = { width: 1280, height: 720 } as const;
export type MapNode = {
  levelId: number;
  x: number;
  y: number;
  labelSide: "top" | "bottom";
  icon: IconName;
};
/** Coordinates are pixels in public/cabinet/island.webp, not percentages. */
export const mapNodes: MapNode[] = [
  { levelId: 0, x: 163, y: 392, labelSide: "bottom", icon: "led" },
  { levelId: 1, x: 440, y: 145, labelSide: "top", icon: "button" },
  { levelId: 2, x: 750, y: 215, labelSide: "bottom", icon: "sensor" },
  { levelId: 3, x: 1040, y: 115, labelSide: "top", icon: "motor" },
  { levelId: 4, x: 1060, y: 400, labelSide: "bottom", icon: "rocket" },
];
export const mapRoads = [
  "M163 392Q230 465 320 420L410 380 510 288 440 208 440 145",
  "M440 145L440 208 510 288 420 370 600 350 690 380 730 390 730 215",
  "M730 215L730 390 905 345 930 292 870 245 940 190 1040 115",
  "M1040 115L940 190 870 245 930 292 905 345 960 375 1060 400",
] as const;
export function mapNodeBounds(node: MapNode) {
  return {
    left: node.x - 150,
    right: node.x + 150,
    top: node.y - (node.labelSide === "top" ? 110 : 36),
    bottom: node.y + (node.labelSide === "bottom" ? 110 : 36),
  };
}
