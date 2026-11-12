"use client";
import { useId, type CSSProperties } from "react";
import { iconsRu } from "@/content/icons.ru";
import { motionTokens } from "@/lib/motion";
import "./icons.css";

import type { IconName, IconState } from "./iconTypes";
export { iconNames, type IconName, type IconState } from "./iconTypes";
const flame =
  "M12 3c2 5-2 6 0 9 2-1 3-3 3-5 5 5 7 10 3 13-3 3-10 2-12-2-2-4 1-8 4-11-1 4 0 5 1 6 3-3-1-6 1-10Z";
const paths: Record<IconName, string> = {
  streak: flame,
  freeze: flame,
  sparks: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  tokens:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M9 9h6v6H9Z M10 6v3m4-3v3m-4 6v3m4-3v3M6 10h3m6 0h3M6 14h3m6 0h3",
  xp: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z",
  level: "m12 3 9 5v9l-9 5-9-5V8Z",
  led: "M7 15V9a5 5 0 0 1 10 0v6ZM6 15h12M9 15v6m6-6v6M9 9a3 3 0 0 1 3-3",
  button: "M4 12h16v7H4ZM7 12V7h10v5M7 19v3m10-3v3M9 4h6",
  sensor:
    "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  motor:
    "M5 7h12v12H5ZM17 11h5v4h-5M2 11h3m-3 4h3M8 4v3m6-3v3M8 19v3m6-3v3M11 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  display: "M3 4h18v13H3ZM8 21h8m-4-4v4M6 8h5m-5 4h9m1-4h2",
  rocket:
    "M9 15c0-6 5-11 12-12 0 7-5 12-11 12ZM9 9H5l-3 6h6m7 0v4l-6 3v-6M6 18l-3 3M15 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  book: "M12 6C8 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-6-1-10 2Zm0 0v15M5 8l4 1m6 0 4-1",
  target:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3v4m-2-2h4",
  gold: "m5 3 4 8h6l4-8h-5l-2 5-2-5ZM12 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z",
  silver: "m5 3 4 8h6l4-8h-5l-2 5-2-5ZM12 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z",
  bronze: "m5 3 4 8h6l4-8h-5l-2 5-2-5ZM12 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z",
  hints:
    "M8 16c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8Zm0 3h8m-6 3h4m-2-6V9m-3 0 3 3 3-3",
  frame: "M3 3h18v18H3ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 19c0-6 12-6 12 0",
  saved: "M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 1 12ZM8 12l3 3 6-6",
};
export function Icon({
  name,
  state = "idle",
  size = 24,
  value,
  className = "",
  style,
}: {
  name: IconName;
  state?: IconState;
  size?: 24 | 32 | 48 | 96;
  value?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const frozen = name === "freeze" || state === "frozen";
  const iconStyle = {
    "--icon-event-duration": `${motionTokens.duration.state}s`,
    ...style,
  } as CSSProperties;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`ardu-icon icon-${name} icon-state-${state} ${frozen ? "icon-ice" : ""} ${className}`}
      style={iconStyle}
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
      data-state={state}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="var(--icon-tone-start)" />
          <stop offset="1" stopColor="var(--icon-tone-end)" />
        </linearGradient>
      </defs>
      {state === "current" && (
        <circle className="icon-current-ring" cx="12" cy="12" r="11" />
      )}
      <g className="icon-body">
        <path
          d={paths[name]}
          fill={`url(#${id})`}
          stroke="var(--icon-outline)"
        />
        {(name === "streak" || name === "freeze") && (
          <path
            d="M12 13c3 3 4 6 0 7-4-1-3-4 0-7Z"
            className="icon-core"
            stroke="none"
          />
        )}
        {name === "tokens" && (
          <path d="M5 7h2m10 10h2" stroke="var(--icon-highlight)" />
        )}
        {(name === "sparks" ||
          name === "xp" ||
          ["gold", "silver", "bronze"].includes(name)) && (
          <path
            className="icon-shine"
            d="m7 5 1 2m9 9 1 2"
            stroke="var(--icon-highlight)"
          />
        )}
        {name === "level" && (
          <text
            x="12"
            y="16"
            textAnchor="middle"
            stroke="none"
            fill="var(--icon-outline)"
            className="icon-value"
          >
            {value ?? 1}
          </text>
        )}
        {state === "milestone" && (
          <>
            <path d="m6 6 1-4 5 2 5-2 1 4Z" fill="var(--icon-core)" />
            <text
              x="12"
              y="7"
              textAnchor="middle"
              className="icon-crown-value"
              stroke="none"
            >
              {value ?? 7}
            </text>
            <path d="M2 10h2m16 0h2M4 4l1 1m14-1-1 1" />
          </>
        )}
        {(state === "none" || state === "extinguish") && name === "streak" && (
          <path d="M12 5c-3-2 3-2 0-4" className="icon-smoke" />
        )}
        {frozen && (
          <path d="M15 11v9m-4-7 8 5m-8 0 8-5" stroke="var(--icon-highlight)" />
        )}
      </g>
      {state === "done" && <path className="icon-check" d="m14 18 3 3 5-6" />}
      {state === "locked" && (
        <g className="icon-lock">
          <path d="M15 17h7v6h-7Zm1-1v-1a2.5 2.5 0 0 1 5 0v1" />
        </g>
      )}
      {state === "pending" && <title>{iconsRu.pending}</title>}
    </svg>
  );
}
export default Icon;
