// Per-device interface preferences (not account data).
export type Prefs = { textScale: 1 | 1.15 | 1.3; reduceMotion: boolean };

const KEY = "arduhub.prefs";
const scales = new Set([1, 1.15, 1.3]);

export function parsePrefs(raw: string | null): Prefs {
  const fallback: Prefs = { textScale: 1, reduceMotion: false };
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw) as Partial<Prefs>;
    return {
      textScale: scales.has(v.textScale as number)
        ? (v.textScale as Prefs["textScale"])
        : 1,
      reduceMotion: v.reduceMotion === true,
    };
  } catch {
    return fallback;
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
}
