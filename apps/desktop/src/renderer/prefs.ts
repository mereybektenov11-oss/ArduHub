import { configureSfx } from "./sound/sfx";

// Per-device interface preferences (not account data).
export type Prefs = {
  textScale: 1 | 1.15 | 1.3;
  reduceMotion: boolean;
  sounds: boolean;
  volume: number; // 0..1
  theme: ThemeChoice;
};
export type ThemeChoice = "system" | "light" | "dark";
const themes = new Set<ThemeChoice>(["system", "light", "dark"]);

const KEY = "arduhub.prefs";
const scales = new Set([1, 1.15, 1.3]);
export const defaultPrefs: Prefs = {
  textScale: 1,
  reduceMotion: false,
  sounds: true,
  volume: 0.5,
  theme: "system",
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
      theme: themes.has(v.theme as ThemeChoice)
        ? (v.theme as ThemeChoice)
        : defaultPrefs.theme,
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
  document.documentElement.dataset.theme = resolveTheme(p.theme);
  // Window frame and background colour follow the same choice.
  void window.arduhub?.setTheme?.(p.theme);
}

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(
  choice: ThemeChoice,
  systemDark = typeof window !== "undefined" && darkQuery().matches,
): "light" | "dark" {
  return choice === "system" ? (systemDark ? "dark" : "light") : choice;
}

/** Re-applies the theme when Windows switches between light and dark. */
export function watchSystemTheme(onChange: () => void) {
  const query = darkQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
