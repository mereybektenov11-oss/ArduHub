"use client";
import { useRef } from "react";
import Image from "next/image";
import { heroAssets } from "../landing/hero-assets";
import { useSceneActivity } from "../landing/useSceneActivity";

export default function HeroBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSceneActivity(ref);
  return (
    <div
      ref={ref}
      className="hero-background"
      data-active={active}
      aria-hidden="true"
    >
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />
      {heroAssets.map((asset) => (
        <div className={`hero-component ${asset.className}`} key={asset.id}>
          <div className="hero-component-motion">
            <picture>
              <source
                media="(max-width: 767px)"
                srcSet={`/images/landing/cobalt/${asset.id}-256.webp`}
              />
              <Image
                src={asset.src}
                width={asset.width}
                height={asset.height}
                alt=""
                unoptimized
                loading="eager"
                decoding={asset.id === "uno" ? "sync" : "async"}
                fetchPriority={asset.id === "uno" ? "high" : "auto"}
              />
            </picture>
          </div>
        </div>
      ))}
    </div>
  );
}
