import { describe, expect, it } from "vitest";
import {
  PET,
  bubbleSide,
  chatBox,
  clampPos,
  defaultPos,
  fromFractions,
  toFractions,
} from "../src/renderer/pet/drag";

const v = { w: 1280, h: 800 };
// The largest rectangle the chat can take (it is at most maxHeight tall).
const rect = (b: ReturnType<typeof chatBox>) => {
  const top = b.top ?? v.h - (b.bottom ?? 0) - b.maxHeight;
  return {
    left: b.left,
    top,
    right: b.left + b.width,
    bottom: top + b.maxHeight,
  };
};
const inside = (b: ReturnType<typeof chatBox>) => {
  const r = rect(b);
  return r.left >= 0 && r.top >= 0 && r.right <= v.w && r.bottom <= v.h;
};
const overlaps = (
  b: ReturnType<typeof chatBox>,
  p: { x: number; y: number },
) => {
  const r = rect(b);
  return (
    r.left < p.x + PET && r.right > p.x && r.top < p.y + PET && r.bottom > p.y
  );
};

describe("companion position", () => {
  it("starts in the bottom-right corner and stays inside the window", () => {
    expect(defaultPos(v)).toEqual({ x: 1164, y: 686 });
    expect(clampPos({ x: -50, y: 5000 }, v)).toEqual({ x: 8, y: 696 });
  });

  it("keeps its relative place when the window is resized", () => {
    const f = toFractions({ x: 592, y: 352 }, v);
    expect(fromFractions(f, { w: 1920, h: 1080 })).toEqual({ x: 912, y: 492 });
    expect(fromFractions(null, v)).toEqual(defaultPos(v));
  });

  it("opens the bubble towards the free side", () => {
    expect(bubbleSide({ x: 1100, y: 600 }, v)).toEqual({
      horizontal: "left",
      vertical: "above",
    });
    expect(bubbleSide({ x: 40, y: 40 }, v)).toEqual({
      horizontal: "right",
      vertical: "below",
    });
  });

  it("puts the chat next to the companion, never on it, inside the window", () => {
    for (const p of [
      defaultPos(v),
      { x: 8, y: 8 },
      { x: 600, y: 350 },
      { x: 1100, y: 300 },
      { x: 30, y: 690 },
    ]) {
      const box = chatBox(p, v);
      expect(inside(box), JSON.stringify(p)).toBe(true);
      expect(overlaps(box, p), JSON.stringify(p)).toBe(false);
      expect(box.maxHeight, JSON.stringify(p)).toBeGreaterThanOrEqual(150);
    }
  });
});
