import type { SVGProps } from "react";
import Icon, { type IconName } from "./Icon";
export type RewardKind =
  "flame" | "spark" | "token" | "level" | "xp" | "medal" | "mission" | "check";
const names: Record<RewardKind, IconName> = {
  flame: "streak",
  spark: "sparks",
  token: "tokens",
  level: "level",
  xp: "xp",
  medal: "gold",
  mission: "book",
  check: "target",
};
/** Compatibility entrypoint: all reward surfaces share the thematic icon renderer. */
export default function RewardIcon({
  kind,
  className,
  style,
}: SVGProps<SVGSVGElement> & { kind: RewardKind }) {
  return (
    <Icon
      name={names[kind]}
      state={kind === "check" ? "done" : kind === "flame" ? "none" : "idle"}
      className={className}
      style={style}
    />
  );
}
