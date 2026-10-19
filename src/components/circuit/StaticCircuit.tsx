/* eslint-disable @next/next/no-img-element -- Shared local SVG needs no raster resizing. */
import { ru } from "@/content/ru";
export default function StaticCircuit({
  decorative = false,
}: {
  decorative?: boolean;
}) {
  return (
    <img
      className="circuit"
      src="/circuit-static.svg"
      width={450}
      height={260}
      loading="lazy"
      decoding="async"
      alt={decorative ? "" : ru.ui.circuitLabel}
    />
  );
}
