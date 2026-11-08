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
  const [mode, setMode] = useState<"auto" | "play" | "paused">("auto");
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    // A new system preference invalidates an earlier play gesture. A fresh
    // explicit play remains available after motion has been reduced.
    const changed = () => {
      if (media.matches) setMode("paused");
    };
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);

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
    const shouldPlay =
      visible &&
      tabVisible &&
      (mode === "play" || (mode === "auto" && !reduced));
    if (shouldPlay) {
      void element.play().catch(() => {
        /* The explicit play control remains available. */
      });
    } else element.pause();
  }, [ready, visible, tabVisible, mode, reduced, failed]);

  function toggle() {
    if (playing) setMode("paused");
    else {
      setReady(true);
      setMode("play");
      void video.current?.play().catch(() => {});
    }
  }

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
          aria-describedby={`${id}-caption`}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
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
        {!failed && (
          <button
            type="button"
            className="video-toggle"
            onClick={toggle}
            aria-label={playing ? ru.landingVideo.pause : ru.landingVideo.play}
          >
            <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
            <span>
              {playing ? ru.landingVideo.pauseShort : ru.landingVideo.playShort}
            </span>
          </button>
        )}
      </div>
      <figcaption id={`${id}-caption`}>{label}</figcaption>
      <noscript>
        <style>{".video-toggle{display:none}"}</style>
      </noscript>
    </figure>
  );
}
