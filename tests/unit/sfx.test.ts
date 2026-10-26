import { describe, expect, it, vi } from "vitest";
import { createSfxEngine, sfxIds, soundScores } from "@/lib/sfx";
function harness() {
  let now = 0;
  const pending: (() => void)[] = [];
  const param = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const audio = {
    state: "running",
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {}),
    createOscillator: vi.fn(() => ({
      frequency: param(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: param(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
  };
  const create = vi.fn(() => audio as unknown as AudioContext);
  return {
    engine: createSfxEngine({
      create,
      now: () => now,
      later: (fn) => pending.push(fn),
    }),
    audio,
    create,
    advance: (ms: number) => {
      now += ms;
    },
    finish: () => pending.splice(0).forEach((fn) => fn()),
  };
}
describe("synthesized event sounds", () => {
  it("never creates audio before a gesture or when disabled", () => {
    const h = harness();
    h.engine.play("tap");
    expect(h.create).not.toHaveBeenCalled();
    h.engine.configure({ enabled: false });
    h.engine.unlock();
    h.engine.play("correct");
    expect(h.audio.createOscillator).not.toHaveBeenCalled();
  });
  it("unlocks a shared context and throttles each id for 80ms", () => {
    const h = harness();
    h.engine.unlock();
    expect(h.audio.resume).toHaveBeenCalledOnce();
    expect(h.engine.play("tap")).toBe(true);
    expect(h.engine.play("tap")).toBe(false);
    h.advance(79);
    expect(h.engine.play("tap")).toBe(false);
    h.advance(1);
    expect(h.engine.play("tap")).toBe(true);
    expect(h.create).toHaveBeenCalledOnce();
  });
  it("caps concurrent events at six and releases their nodes", () => {
    const h = harness();
    h.engine.unlock();
    for (const id of sfxIds.slice(0, 6)) expect(h.engine.play(id)).toBe(true);
    expect(h.engine.play("hint")).toBe(false);
    h.finish();
    expect(h.engine.play("hint")).toBe(true);
    expect(
      h.audio.createOscillator.mock.results[0].value.disconnect,
    ).toHaveBeenCalled();
  });
  it.each(sfxIds)("synthesizes the distinct %s score", (id) => {
    const h = harness();
    h.engine.unlock();
    expect(h.engine.play(id)).toBe(true);
    expect(h.audio.createOscillator).toHaveBeenCalledTimes(
      soundScores[id].notes.length,
    );
    expect(soundScores[id].duration).toBeGreaterThan(0);
  });
  it("volume zero blocks playback and muting silences scheduled notes", () => {
    const h = harness();
    h.engine.unlock();
    h.engine.play("lesson_complete");
    h.engine.configure({ enabled: false });
    for (const result of h.audio.createGain.mock.results)
      expect(result.value.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    h.engine.configure({ enabled: true, volume: 0 });
    expect(h.engine.play("tap")).toBe(false);
  });
});
