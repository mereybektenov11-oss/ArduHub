import { describe, expect, it } from "vitest";
import {
  createSfxEngine,
  sfxIds,
  soundDesign,
  soundLength,
} from "../src/renderer/sound/sfx";

describe("sound design", () => {
  it("defines every id with sane, short layers", () => {
    for (const id of sfxIds) {
      const layers = soundDesign[id];
      expect(layers.length, id).toBeGreaterThan(0);
      expect(soundLength(id), id).toBeLessThanOrEqual(1.5);
      for (const l of layers) {
        expect(l.dur, id).toBeGreaterThan(0);
        expect(l.gain, id).toBeGreaterThan(0);
        expect(l.gain, id).toBeLessThanOrEqual(1);
        if (l.kind === "tone") {
          expect(l.freq, id).toBeGreaterThanOrEqual(40);
          expect(l.freq, id).toBeLessThanOrEqual(8000);
        }
      }
    }
  });
});

// Minimal Web Audio stand-in that records started sources.
function fakeAudio() {
  const started: string[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  });
  const node = () => ({ connect() {}, disconnect() {} });
  const ctx = {
    state: "running",
    currentTime: 0,
    sampleRate: 8000,
    destination: node(),
    resume: async () => {},
    createGain: () => ({ ...node(), gain: param() }),
    createDelay: () => ({ ...node(), delayTime: param() }),
    createBiquadFilter: () => ({ ...node(), type: "", frequency: param() }),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      ratio: param(),
    }),
    createBuffer: (_c: number, n: number) => ({
      getChannelData: () => new Float32Array(n),
    }),
    createOscillator: () => ({
      ...node(),
      type: "sine",
      frequency: param(),
      detune: param(),
      start: () => started.push("osc"),
      stop() {},
    }),
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      start: () => started.push("noise"),
      stop() {},
    }),
  };
  return { ctx: ctx as unknown as AudioContext, started };
}

describe("sfx engine", () => {
  it("stays silent until a gesture, then plays; respects the setting", () => {
    const { ctx, started } = fakeAudio();
    let now = 0;
    const engine = createSfxEngine({
      create: () => ctx,
      now: () => now,
      later: () => 0,
    });
    expect(engine.play("tap")).toBe(false);
    engine.unlock();
    expect(engine.play("tap")).toBe(true);
    expect(started.length).toBeGreaterThan(0);
    // Same sound within 80 ms is dropped.
    expect(engine.play("tap")).toBe(false);
    now = 200;
    engine.configure({ enabled: false });
    expect(engine.play("tap")).toBe(false);
    engine.configure({ enabled: true, volume: 0.3 });
    expect(engine.play("correct")).toBe(true);
    expect(engine.state().volume).toBe(0.3);
  });
});
