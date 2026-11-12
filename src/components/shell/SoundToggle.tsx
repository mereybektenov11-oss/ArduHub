"use client";
import { useSound } from "@/lib/useSound";
import { motionSoundRu as c } from "@/content/motion-sound.ru";
export default function SoundToggle() {
  const { enabled, toggle } = useSound();
  return (
    <button
      className="cab-icon-btn g3-sound-toggle"
      aria-label={enabled ? c.soundOn : c.soundOff}
      aria-pressed={enabled}
      onClick={toggle}
      title={enabled ? c.soundOn : c.soundOff}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M11 4 6 8H3v8h3l5 4Z" />
        {enabled ? (
          <path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
        ) : (
          <path d="m16 9 6 6m0-6-6 6" />
        )}
      </svg>
    </button>
  );
}
