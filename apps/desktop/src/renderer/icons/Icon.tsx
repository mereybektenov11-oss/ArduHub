import { boxicons, type IconName } from "./boxicons.generated";

// Boxicons as inline SVG. Decorative by default (hidden from assistive tech);
// pass `label` when the icon is the only content of a control.
export default function Icon({
  name,
  size = "1.15em",
  label,
}: {
  name: IconName;
  size?: string;
  label?: string;
}) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      focusable="false"
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
