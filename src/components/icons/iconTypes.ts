export const iconNames = [
  "streak",
  "sparks",
  "tokens",
  "xp",
  "level",
  "led",
  "button",
  "sensor",
  "motor",
  "display",
  "rocket",
  "book",
  "target",
  "gold",
  "silver",
  "bronze",
  "freeze",
  "hints",
  "frame",
  "saved",
] as const;
export type IconName = (typeof iconNames)[number];
export type IconState =
  | "none"
  | "active"
  | "pending"
  | "frozen"
  | "milestone"
  | "idle"
  | "done"
  | "current"
  | "locked"
  | "gain"
  | "spend"
  | "ignite"
  | "extinguish";
