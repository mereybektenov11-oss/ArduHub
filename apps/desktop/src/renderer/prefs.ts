import { configureSfx } from "./sound/sfx";

// Per-device interface preferences (not account data).
export type Prefs = {
  textScale: 1 | 1.15 | 1.3;
  reduceMotion: boolean;
  sounds: boolean;
  volume: number; // 0..1
};

const KEY = "arduhub.prefs";
const scales = new Set([1, 1.15, 1.3]);
export const defaultPrefs: Prefs = {
  textScale: 1,
  reduceMotion: false,
  sounds: true,
  volume: 0.5,
};

export function parsePrefs(raw: string | null): Prefs {
  if (!raw) return { ...defaultPrefs };
  try {
    const v = JSON.parse(raw) as Partial<Prefs>;
    const volume = Number(v.volume);
    return {
      textScale: scales.has(v.textScale as number)
        ? (v.textScale as Prefs["textScale"])
        : 1,
      reduceMotion: v.reduceMotion === true,
      sounds: v.sounds !== false,
      volume:
        Number.isFinite(volume) && volume >= 0 && volume <= 1
          ? volume
          : defaultPrefs.volume,
    };
  } catch {
    return { ...defaultPrefs };
  }
}

export function loadPrefs(): Prefs {
  try {
    return parsePrefs(localStorage.getItem(KEY));
  } catch {
    return parsePrefs(null);
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: keep for this run only */
  }
}

export function applyPrefs(p: Prefs) {
  document.documentElement.style.setProperty(
    "--text-scale",
    String(p.textScale),
  );
  document.documentElement.dataset.motion = p.reduceMotion ? "reduce" : "full";
  configureSfx({ enabled: p.sounds, volume: p.volume });
}
