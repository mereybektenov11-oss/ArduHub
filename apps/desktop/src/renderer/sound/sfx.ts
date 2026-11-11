// Sound effects of the desktop app («Ночная лаборатория»). Fully synthesized
// with Web Audio — no audio files, so no third-party licence applies.
// Same API as the site's src/lib/sfx.ts (configureSfx, unlockSfx, playSfx,
// same ids): the reused lesson components are aliased to this module.
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

// One layer of a sound. Tones go through a low-pass filter whose cutoff can
// sweep; noise layers make clicks and whooshes.
export type Layer = {
  kind: "tone" | "noise";
  wave?: OscillatorType;
  freq?: number; // Hz; tones only
  to?: number; // pitch glide target
  at: number; // start, s
  dur: number; // length, s
  gain: number; // 0..1 relative
  attack?: number; // s
  cutoff?: number; // low-pass start, Hz
  cutoffTo?: number; // low-pass end, Hz
  highpass?: number; // for noise, Hz
  detune?: number; // cents, adds a second voice for width
  echo?: number; // 0..1 send to the shared echo
};

const bell = (freq: number, at: number, dur: number, gain = 0.5): Layer[] => [
  { kind: "tone", wave: "sine", freq, at, dur, gain, cutoff: 8000, echo: 0.35 },
  // Inharmonic partial gives a glassy bell colour.
  {
    kind: "tone",
    wave: "sine",
    freq: freq * 2.76,
    at,
    dur: dur * 0.5,
    gain: gain * 0.18,
    echo: 0.35,
  },
];
const click = (at: number, gain = 0.35, highpass = 2500): Layer => ({
  kind: "noise",
  at,
  dur: 0.018,
  gain,
  highpass,
});

export const soundDesign: Record<SfxId, Layer[]> = {
  tap: [
    click(0, 0.18, 3500),
    {
      kind: "tone",
      wave: "sine",
      freq: 1320,
      to: 980,
      at: 0,
      dur: 0.05,
      gain: 0.25,
    },
  ],
  part_drop: [
    {
      kind: "tone",
      wave: "sine",
      freq: 150,
      to: 70,
      at: 0,
      dur: 0.16,
      gain: 0.7,
    },
    { kind: "noise", at: 0, dur: 0.05, gain: 0.25, highpass: 400 },
  ],
  wire_snap: [
    click(0, 0.45, 3000),
    {
      kind: "tone",
      wave: "triangle",
      freq: 1760,
      to: 1400,
      at: 0.005,
      dur: 0.07,
      gain: 0.3,
      echo: 0.2,
    },
  ],
  correct: [...bell(784, 0, 0.32, 0.45), ...bell(1175, 0.11, 0.42, 0.45)],
  wrong: [
    {
      kind: "tone",
      wave: "square",
      freq: 233,
      to: 196,
      at: 0,
      dur: 0.16,
      gain: 0.25,
      cutoff: 900,
    },
    {
      kind: "tone",
      wave: "square",
      freq: 196,
      to: 165,
      at: 0.15,
      dur: 0.2,
      gain: 0.25,
      cutoff: 700,
    },
  ],
  check_done: [...bell(1047, 0, 0.4, 0.4), ...bell(1568, 0.06, 0.5, 0.35)],
  run_start: [
    {
      kind: "tone",
      wave: "sawtooth",
      freq: 110,
      to: 440,
      at: 0,
      dur: 0.32,
      gain: 0.25,
      cutoff: 300,
      cutoffTo: 3000,
      detune: 12,
      echo: 0.25,
    },
    click(0.3, 0.2, 4000),
  ],
  hint: [...bell(1319, 0, 0.45, 0.35), ...bell(1760, 0.08, 0.4, 0.25)],
  spark_gain: [
    ...bell(1568, 0, 0.18, 0.3),
    ...bell(1976, 0.07, 0.2, 0.3),
    ...bell(2637, 0.14, 0.3, 0.3),
  ],
  streak_ignite: [
    {
      kind: "noise",
      at: 0,
      dur: 0.5,
      gain: 0.25,
      highpass: 300,
      cutoff: 600,
      cutoffTo: 6000,
    },
    ...bell(1319, 0.42, 0.3, 0.3),
    ...bell(1976, 0.52, 0.35, 0.3),
  ],
  lesson_complete: [
    // Soft pad chord under a rising arpeggio.
    {
      kind: "tone",
      wave: "sawtooth",
      freq: 262,
      at: 0,
      dur: 1.3,
      gain: 0.12,
      attack: 0.25,
      cutoff: 600,
      cutoffTo: 1800,
      detune: 10,
      echo: 0.3,
    },
    {
      kind: "tone",
      wave: "sawtooth",
      freq: 392,
      at: 0,
      dur: 1.3,
      gain: 0.1,
      attack: 0.25,
      cutoff: 600,
      cutoffTo: 1800,
      detune: 10,
      echo: 0.3,
    },
    ...bell(523, 0, 0.35, 0.4),
    ...bell(659, 0.14, 0.35, 0.4),
    ...bell(784, 0.28, 0.4, 0.4),
    ...bell(1047, 0.42, 0.8, 0.45),
  ],
  level_up: [
    {
      kind: "tone",
      wave: "sawtooth",
      freq: 196,
      to: 392,
      at: 0,
      dur: 0.5,
      gain: 0.18,
      cutoff: 400,
      cutoffTo: 4000,
      detune: 14,
      echo: 0.3,
    },
    ...bell(784, 0.35, 0.3, 0.4),
    ...bell(1175, 0.47, 0.3, 0.4),
    ...bell(1568, 0.59, 0.6, 0.45),
  ],
  unlock: [
    click(0, 0.35, 1500),
    {
      kind: "tone",
      wave: "triangle",
      freq: 220,
      to: 330,
      at: 0,
      dur: 0.08,
      gain: 0.3,
    },
    ...bell(1319, 0.12, 0.4, 0.4),
  ],
  purchase: [
    click(0, 0.3, 2000),
    ...bell(1047, 0.06, 0.25, 0.4),
    ...bell(1568, 0.16, 0.45, 0.4),
  ],
  deny: [
    {
      kind: "tone",
      wave: "square",
      freq: 147,
      to: 123,
      at: 0,
      dur: 0.18,
      gain: 0.25,
      cutoff: 600,
    },
  ],
  mentor_open: [
    {
      kind: "tone",
      wave: "triangle",
      freq: 440,
      to: 880,
      at: 0,
      dur: 0.18,
      gain: 0.25,
      cutoff: 2500,
      echo: 0.3,
    },
    ...bell(1760, 0.14, 0.25, 0.2),
  ],
};

export const soundLength = (id: SfxId) =>
  Math.max(...soundDesign[id].map((l) => l.at + l.dur));

type Runtime = {
  create: () => AudioContext;
  now: () => number;
  later: (fn: () => void, ms: number) => unknown;
};

export function createSfxEngine(runtime: Runtime) {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let echoIn: GainNode | undefined;
  let noise: AudioBuffer | undefined;
  let enabled = true,
    volume = 0.5,
    unlocked = false,
    active = 0;
  const last = new Map<SfxId, number>();

  function graph() {
    if (context && context.state !== "closed" && master && echoIn)
      return { audio: context, master, echoIn };
    const audio = runtime.create();
    context = audio;
    // Master: gentle compression keeps layered sounds even and safe.
    const comp = audio.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = audio.createGain();
    master.gain.value = volume;
    master.connect(comp);
    comp.connect(audio.destination);
    // Shared dark echo for space.
    echoIn = audio.createGain();
    const delay = audio.createDelay(1);
    delay.delayTime.value = 0.13;
    const feedback = audio.createGain();
    feedback.gain.value = 0.28;
    const tone = audio.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2800;
    echoIn.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(master);
    // One second of white noise, reused by every noise layer.
    noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return { audio, master, echoIn };
  }

  function layer(audio: AudioContext, out: GainNode, echo: GainNode, l: Layer) {
    const start = audio.currentTime + l.at;
    const end = start + l.dur;
    const amp = audio.createGain();
    const peak = 0.22 * l.gain;
    const attack = Math.min(l.attack ?? 0.004, l.dur / 2);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.linearRampToValueAtTime(peak, start + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(l.cutoff ?? 12000, start);
    if (l.cutoffTo)
      filter.frequency.exponentialRampToValueAtTime(l.cutoffTo, end);
    filter.connect(amp);
    amp.connect(out);
    if (l.echo) {
      const send = audio.createGain();
      send.gain.value = l.echo;
      amp.connect(send);
      send.connect(echo);
    }
    const sources: AudioScheduledSourceNode[] = [];
    if (l.kind === "noise") {
      const src = audio.createBufferSource();
      src.buffer = noise!;
      const hp = audio.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = l.highpass ?? 1000;
      src.connect(hp);
      hp.connect(filter);
      sources.push(src);
    } else {
      for (const cents of l.detune ? [-l.detune, l.detune] : [0]) {
        const osc = audio.createOscillator();
        osc.type = l.wave ?? "sine";
        osc.detune.value = cents;
        osc.frequency.setValueAtTime(l.freq ?? 440, start);
        if (l.to) osc.frequency.exponentialRampToValueAtTime(l.to, end);
        osc.connect(filter);
        sources.push(osc);
      }
    }
    for (const s of sources) {
      s.start(start);
      s.stop(end + 0.02);
    }
    return () => {
      for (const s of sources) s.disconnect();
      filter.disconnect();
      amp.disconnect();
    };
  }

  return {
    configure(settings: { enabled: boolean; volume?: number }) {
      enabled = settings.enabled;
      volume = Number.isFinite(settings.volume)
        ? Math.max(0, Math.min(1, settings.volume!))
        : volume;
      if (master && context)
        master.gain.setTargetAtTime(
          enabled ? volume : 0,
          context.currentTime,
          0.02,
        );
    },
    unlock() {
      unlocked = true;
      if (!enabled || !volume) return;
      try {
        void graph()
          .audio.resume()
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
        const { audio, master: out, echoIn: echo } = graph();
        if (audio.state === "suspended") void audio.resume().catch(() => {});
        last.set(id, now);
        active++;
        const cleanups = soundDesign[id].map((l) => layer(audio, out, echo, l));
        runtime.later(
          () => {
            cleanups.forEach((c) => c());
            active--;
          },
          soundLength(id) * 1000 + 60,
        );
        return true;
      } catch {
        active = Math.max(0, active - 1);
        return false;
      }
    },
    state: () => ({ enabled, volume, unlocked, active }),
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
export const sfxState = () => engine.state();
