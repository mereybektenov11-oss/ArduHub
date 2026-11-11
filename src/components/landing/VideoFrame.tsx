"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { ru } from "@/content/ru";

type Props = {
  id: string;
  src: string;
  poster: string;
  label: string;
  tone: "rainbow" | "blue" | "pink" | "green";
  featured?: boolean;
};

export default function VideoFrame({
  id,
  src,
  poster,
  label,
  tone,
  featured = false,
}: Props) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState === "visible",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element || !window.IntersectionObserver) return;
    const nearby = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          nearby.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    const inView = new IntersectionObserver(
      ([entry]) =>
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: [0, 0.15] },
    );
    nearby.observe(element);
    inView.observe(element);
    const visibility = () =>
      setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", visibility);
    return () => {
      nearby.disconnect();
      inView.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element || !ready || failed) return;
    const shouldPlay = visible && tabVisible && !reduced;
    if (shouldPlay) {
      void element.play().catch(() => {
        /* Keep the poster if the browser blocks autoplay. */
      });
    } else element.pause();
  }, [ready, visible, tabVisible, reduced, failed]);

  return (
    <figure
      ref={root}
      className={`video-frame video-frame-${tone}${featured ? " video-frame-featured" : ""}`}
      id={id}
    >
      <div className="video-viewport">
        <video
          ref={video}
          src={ready ? src : undefined}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          width="1280"
          height="800"
          aria-label={label}
          onError={() => setFailed(true)}
          style={failed ? { visibility: "hidden" } : undefined}
        />
        {failed && (
          <>
            <Image
              className="video-fallback"
              src={poster}
              alt=""
              width={1280}
              height={800}
              unoptimized
            />
            <p className="video-error" role="status">
              {ru.landingVideo.mediaError}
            </p>
          </>
        )}
      </div>
    </figure>
  );
}
