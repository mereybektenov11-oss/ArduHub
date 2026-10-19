"use client";
import Image from "next/image";
import { useState } from "react";
import assets from "@/content/cabinet-art.json" with { type: "json" };
export type ArtName = keyof typeof assets;
export default function CabinetArt({
  name,
  alt,
  className = "",
  size,
  sizes,
}: {
  name: ArtName;
  alt: string;
  className?: string;
  size?: number;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const asset = assets[name];
  if (failed)
    return (
      <svg
        role="img"
        aria-label={alt}
        className={className}
        width={size ?? asset.width}
        height={size ?? asset.height}
        viewBox="0 0 100 100"
      >
        <rect width="100" height="100" rx="25" fill="var(--surface-mentor)" />
        <path d="m57 10-35 45h25l-5 35 35-48H53z" fill="var(--amber-500)" />
        <circle cx="45" cy="44" r="3" fill="var(--ink-900)" />
        <circle cx="59" cy="44" r="3" fill="var(--ink-900)" />
      </svg>
    );
  return (
    <Image
      src={`/cabinet/${name}.webp`}
      alt={alt}
      width={size ?? asset.width}
      height={size ?? asset.height}
      sizes={sizes ?? (size ? `${size}px` : "100vw")}
      placeholder="blur"
      blurDataURL={asset.blur}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
