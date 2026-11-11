// The companion's voice: Windows speech synthesis (Russian voices Microsoft
// Irina / Pavel when installed), tuned per mentor. Falls back to silence when
// no Russian voice exists; the text is always shown in the bubble too.
import { loadPrefs } from "../prefs";

const tone: Record<string, { voice: RegExp; pitch: number; rate: number }> = {
  volt: { voice: /pavel/i, pitch: 1.6, rate: 1.12 },
  oma: { voice: /irina/i, pitch: 0.85, rate: 0.95 },
  rezik: { voice: /pavel/i, pitch: 0.75, rate: 1.02 },
  shina: { voice: /irina/i, pitch: 1.25, rate: 1.08 },
};

function russianVoice(prefer: RegExp) {
  const voices = speechSynthesis.getVoices().filter((v) => /^ru/i.test(v.lang));
  return voices.find((v) => prefer.test(v.name)) ?? voices[0] ?? null;
}

export function speechAvailable() {
  return typeof speechSynthesis !== "undefined";
}

/** Says the text in the mentor's voice; interrupts what was being said. */
export function speak(text: string, mentor: string, urgent = false) {
  const prefs = loadPrefs();
  if (!speechAvailable() || !prefs.sounds || !prefs.voice) return false;
  const t = tone[mentor] ?? tone.volt;
  const voice = russianVoice(t.voice);
  if (!voice) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.pitch = t.pitch;
  u.rate = urgent ? t.rate * 1.08 : t.rate;
  u.volume = Math.max(0, Math.min(1, prefs.volume * 1.6));
  speechSynthesis.speak(u);
  return true;
}

export function silence() {
  if (speechAvailable()) speechSynthesis.cancel();
}
