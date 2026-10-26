"use client";
export const sfxIds = [
  "tap",
  "part_drop",
  "wire_snap",
  "correct",
  "wrong",
  "check_done",
  "run_start",
  "hint",
  "spark_gain",
  "streak_ignite",
  "lesson_complete",
  "level_up",
  "unlock",
  "purchase",
  "deny",
  "mentor_open",
] as const;
export type SfxId = (typeof sfxIds)[number];
type Note = readonly [
  frequency: number,
  offset: number,
  duration: number,
  end?: number,
];
export const soundScores: Record<
  SfxId,
  { duration: number; notes: readonly Note[] }
> = {
  tap: { duration: 0.04, notes: [[520, 0, 0.04, 320]] },
  part_drop: { duration: 0.09, notes: [[220, 0, 0.09, 100]] },
  wire_snap: { duration: 0.08, notes: [[1000, 0, 0.08, 340]] },
  correct: {
    duration: 0.3,
    notes: [
      [523, 0, 0.14],
      [784, 0.14, 0.16],
    ],
  },
  wrong: {
    duration: 0.25,
    notes: [
      [220, 0, 0.1],
      [196, 0.14, 0.11],
    ],
  },
  check_done: {
    duration: 0.35,
    notes: [
      [1047, 0, 0.35],
      [1568, 0.04, 0.27],
    ],
  },
  run_start: { duration: 0.2, notes: [[330, 0, 0.2, 660]] },
  hint: {
    duration: 0.25,
    notes: [
      [880, 0, 0.25],
      [1320, 0.04, 0.18],
    ],
  },
  spark_gain: {
    duration: 0.4,
    notes: [
      [784, 0, 0.12],
      [988, 0.12, 0.12],
      [1175, 0.24, 0.16],
    ],
  },
  streak_ignite: {
    duration: 0.7,
    notes: [
      [160, 0, 0.4, 800],
      [1500, 0.38, 0.06],
      [900, 0.52, 0.05],
      [1800, 0.63, 0.07],
    ],
  },
  lesson_complete: {
    duration: 1.2,
    notes: [
      [523, 0, 0.24],
      [659, 0.24, 0.24],
      [784, 0.48, 0.55],
      [1568, 1.03, 0.17],
    ],
  },
  level_up: {
    duration: 1,
    notes: [
      [523, 0, 0.2],
      [659, 0.2, 0.2],
      [784, 0.4, 0.2],
      [1047, 0.6, 0.4],
    ],
  },
  unlock: {
    duration: 0.6,
    notes: [
      [180, 0, 0.07],
      [880, 0.12, 0.18],
      [1320, 0.32, 0.28],
    ],
  },
  purchase: {
    duration: 0.6,
    notes: [
      [220, 0, 0.08, 100],
      [1047, 0.12, 0.22],
      [1568, 0.34, 0.26],
    ],
  },
  deny: { duration: 0.2, notes: [[165, 0, 0.2, 130]] },
  mentor_open: { duration: 0.15, notes: [[350, 0, 0.15, 700]] },
};
export function createSfxEngine(runtime: {
  create: () => AudioContext;
  now: () => number;
  later: (fn: () => void, ms: number) => unknown;
}) {
  let context: AudioContext | undefined;
  let enabled = true,
    volume = 0.5,
    unlocked = false,
    active = 0;
  const last = new Map<SfxId, number>();
  const live = new Set<{ oscillators: OscillatorNode[]; gains: GainNode[] }>();
  const getContext = () => {
    if (!context || context.state === "closed") context = runtime.create();
    return context;
  };
  return {
    configure(settings: { enabled: boolean; volume?: number }) {
      enabled = settings.enabled;
      volume = Number.isFinite(settings.volume)
        ? Math.max(0, Math.min(1, settings.volume!))
        : 0.5;
      if (!enabled || !volume)
        for (const group of live)
          for (const gain of group.gains) {
            gain.gain.cancelScheduledValues(0);
            gain.gain.setValueAtTime(0, context?.currentTime ?? 0);
          }
    },
    unlock() {
      unlocked = true;
      if (!enabled || !volume) return;
      try {
        void getContext()
          .resume()
          .catch(() => {});
      } catch {
        /* Optional audio. */
      }
    },
    play(id: SfxId) {
      if (!enabled || !volume || !unlocked || active >= 6) return false;
      const now = runtime.now();
      if (now - (last.get(id) ?? -Infinity) < 80) return false;
      try {
        const audio = getContext();
        if (audio.state === "suspended") void audio.resume().catch(() => {});
        last.set(id, now);
        active++;
        const score = soundScores[id];
        const group = {
          oscillators: [] as OscillatorNode[],
          gains: [] as GainNode[],
        };
        live.add(group);
        for (const [frequency, offset, duration, end] of score.notes) {
          const oscillator = audio.createOscillator(),
            gain = audio.createGain();
          const start = audio.currentTime + offset;
          oscillator.type =
            id === "wire_snap" || id === "part_drop" ? "triangle" : "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          if (end)
            oscillator.frequency.exponentialRampToValueAtTime(
              end,
              start + duration,
            );
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(
            (0.08 * volume) / Math.sqrt(score.notes.length),
            start + 0.005,
          );
          gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start(start);
          oscillator.stop(start + duration);
          group.oscillators.push(oscillator);
          group.gains.push(gain);
        }
        runtime.later(
          () => {
            for (const oscillator of group.oscillators) oscillator.disconnect();
            for (const gain of group.gains) gain.disconnect();
            live.delete(group);
            active--;
          },
          score.duration * 1000 + 20,
        );
        return true;
      } catch {
        active = Math.max(0, active - 1);
        return false;
      }
    },
  };
}
const engine = createSfxEngine({
  create: () => new window.AudioContext(),
  now: () => performance.now(),
  later: (fn, ms) => setTimeout(fn, ms),
});
export function configureSfx(settings: { enabled: boolean; volume?: number }) {
  engine.configure(settings);
}
/** Call only from a trusted pointer/keyboard gesture, never from mount. */
export function unlockSfx() {
  engine.unlock();
}
export function playSfx(id: SfxId) {
  return engine.play(id);
}
