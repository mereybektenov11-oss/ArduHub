import { describe, expect, it } from "vitest";
import { mentorRigs, selectedMentor } from "../src/renderer/mentor/mentors";
import { voiceLayers } from "../src/renderer/sound/sfx";

describe("selected mentor", () => {
  it("uses the mentor chosen in the account, otherwise Вольтик", () => {
    expect(selectedMentor({ mentor: { selectedId: "shina" } })).toBe("shina");
    expect(selectedMentor({ mentor: { selectedId: "oma" } })).toBe("oma");
    expect(selectedMentor({ mentor: { selectedId: "unknown" } })).toBe("volt");
    expect(selectedMentor({ mentor: { selectedId: 3 } })).toBe("volt");
    expect(selectedMentor(null)).toBe("volt");
  });
});

describe("mentor rigs", () => {
  it("keep hands and pivots inside the 384×384 art", () => {
    for (const [id, rig] of Object.entries(mentorRigs)) {
      expect(rig.hand.length, id).toBeGreaterThanOrEqual(4);
      for (const [x, y] of [...rig.hand, rig.pivot]) {
        expect(x, id).toBeGreaterThanOrEqual(0);
        expect(x, id).toBeLessThanOrEqual(384);
        expect(y, id).toBeGreaterThanOrEqual(0);
        expect(y, id).toBeLessThanOrEqual(384);
      }
      expect(Math.abs(rig.wave[0]) + Math.abs(rig.wave[1]), id).toBeLessThan(
        40,
      );
    }
  });
});

describe("mentor voices", () => {
  it("give each mentor a short blip in their own range", () => {
    const pitch = (id: string, v: number) => voiceLayers(id, v)[0].freq!;
    expect(pitch("oma", 0)).toBeLessThan(pitch("volt", 0));
    for (const id of ["volt", "oma", "rezik", "shina"]) {
      const [layer] = voiceLayers(id, 1);
      expect(layer.dur).toBeLessThan(0.1);
      expect(layer.gain).toBeLessThanOrEqual(0.2);
    }
  });
});
