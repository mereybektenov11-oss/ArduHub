import type { SVGProps } from "react";
export type RewardKind =
  "flame" | "spark" | "token" | "level" | "xp" | "medal" | "mission" | "check";
const paths: Record<RewardKind, string> = {
  flame:
    "M13 3c1 5-4 5-2 9 2-1 3-3 3-4 4 3 5 6 3 10-2 4-9 4-11 0-2-4 1-7 4-10-1 4 0 5 1 6 2-4-1-6 2-11Z",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z",
  token:
    "M8 3h8l5 5v8l-5 5H8l-5-5V8Z M9 9h6v6H9Z M10 6v3m4-3v3m-4 6v3m4-3v3M6 10h3m6 0h3M6 14h3m6 0h3",
  level: "m12 2 9 5v10l-9 5-9-5V7Z",
  xp: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  medal: "m7 2 5 7 5-7M9 2l3 5 3-5M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z",
  mission: "M4 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0m4-6 3 3 5-5",
  check: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-14 0 3 3 7-7",
};
export default function RewardIcon({
  kind,
  ...props
}: SVGProps<SVGSVGElement> & { kind: RewardKind }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[kind]} />
    </svg>
  );
}
