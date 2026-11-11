import { describe, expect, it } from "vitest";
import { createProgress } from "@/domain/seed";
import { awardLesson } from "@/domain/progress/xp";
import { BrowserProgressStore, STORAGE_KEY } from "@/domain/progress/storage";
import { completeEvidence } from "../helpers/progressEvidence";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}

describe("progress edge branches", () => {
  it("does not pay a reward twice when a rewarded lesson is completed again", () => {
    const p = createProgress();
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...completeEvidence("lesson-1"),
      rewarded: true,
    };
    const next = awardLesson(p, "lesson-1");
    expect(next.lessons["lesson-1"].status).toBe("done");
    expect([next.xp, next.sparks]).toEqual([p.xp, p.sparks]);
  });

  it("drops a non-finite saved sound volume", () => {
    const saved = JSON.stringify(createProgress()).replace(
      '"settings":{',
      '"settings":{"soundVolume":1e999,',
    );
    const store = new BrowserProgressStore(memory({ [STORAGE_KEY]: saved }));
    const loaded = store.load();
    expect(store.corrupt).toBe(false);
    expect(loaded.settings?.soundVolume).toBeUndefined();
  });

  it("uses default settings when a saved profile has none", () => {
    const { settings: _settings, ...rest } = createProgress();
    void _settings;
    const store = new BrowserProgressStore(
      memory({ [STORAGE_KEY]: JSON.stringify(rest) }),
    );
    const loaded = store.load();
    expect(store.corrupt).toBe(false);
    expect(loaded.settings).toMatchObject({ sounds: true, textScale: 1 });
    expect(loaded.settings?.soundVolume).toBeUndefined();
  });

  it("clamps a saved sound volume to the 0..1 range", () => {
    const load = (volume: number) => {
      const p = createProgress();
      p.settings = { textScale: 1, ...p.settings, soundVolume: volume };
      return new BrowserProgressStore(
        memory({ [STORAGE_KEY]: JSON.stringify(p) }),
      ).load().settings?.soundVolume;
    };
    expect([load(1.7), load(-0.5), load(0.4)]).toEqual([1, 0, 0.4]);
  });
});
