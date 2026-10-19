// Tabler icons (MIT), retrieved with better-icons. See docs/cabinet-art.md.
export default function CabinetIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`cab-icon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <use href={`/icons/cabinet-sprite.svg#${name}`} />
    </svg>
  );
}
