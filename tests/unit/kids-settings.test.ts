import { describe, it, expect } from "vitest";
import { BrowserProgressStore } from "@/domain/progress/storage";
import { createProgress } from "@/domain/seed";
import { fitSceneToViewport } from "@arduhub/arduino-core/scene/viewport";
describe("child-facing workspace defaults", () => {
  it("keeps sound and mentor hint preferences after reload", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
      removeItem: (k: string) => {
        values.delete(k);
      },
    };
    const progress = createProgress();
    progress.settings = { textScale: 1.15, sounds: false, mentorHints: false };
    new BrowserProgressStore(storage).save(progress);
    expect(new BrowserProgressStore(storage).load().settings).toEqual({
      textScale: 1.15,
      sounds: false,
      mentorHints: false,
    });
  });
  it("fits the whole circuit using real viewport height and width", () => {
    const zoom = fitSceneToViewport(
      { width: 900, height: 720 },
      { width: 720, height: 540 },
    );
    expect(zoom * 900).toBeLessThanOrEqual(720);
    expect(zoom * 720).toBeLessThanOrEqual(540);
    expect(zoom).toBeGreaterThan(0.7);
    expect(
      fitSceneToViewport({ width: 600, height: 440 }, { width: 0, height: 0 }),
    ).toBe(1);
  });
});
