import { boxicons, type BoxiconName } from "./boxicons.generated";

export type { BoxiconName };

// Boxicons (MIT) as inline SVG, shared by the lesson components and the
// desktop app. Decorative by default (hidden from assistive tech, so a
// button keeps its text as its name); pass `label` when the icon is the only
// content of a control.
export default function Boxicon({
  name,
  size = "1.15em",
  label,
  className,
}: {
  name: BoxiconName;
  size?: string;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={className ? `boxicon ${className}` : "boxicon"}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      focusable="false"
      style={{ flex: "none", verticalAlign: "-0.18em" }}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      {boxicons[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
