// Where the companion stands. The position is the top-left corner of the
// 96×96 sprite in window pixels; it is stored as fractions of the free space
// so it survives window resizes. Per device (localStorage).
export const PET = 96;
const MARGIN = 8;
const KEY = "arduhub.pet.pos";

export type Pos = { x: number; y: number };
export type View = { w: number; h: number };

export function clampPos(p: Pos, v: View): Pos {
  return {
    x: Math.round(Math.min(Math.max(p.x, MARGIN), v.w - PET - MARGIN)),
    y: Math.round(Math.min(Math.max(p.y, MARGIN), v.h - PET - MARGIN)),
  };
}

export const defaultPos = (v: View): Pos =>
  clampPos({ x: v.w - PET - 20, y: v.h - PET - 18 }, v);

export function toFractions(p: Pos, v: View) {
  return {
    fx: Math.min(1, Math.max(0, p.x / Math.max(1, v.w - PET))),
    fy: Math.min(1, Math.max(0, p.y / Math.max(1, v.h - PET))),
  };
}

export function fromFractions(
  f: { fx: number; fy: number } | null,
  v: View,
): Pos {
  if (!f) return defaultPos(v);
  return clampPos({ x: f.fx * (v.w - PET), y: f.fy * (v.h - PET) }, v);
}

export function loadFractions(): { fx: number; fy: number } | null {
  try {
    const f = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return Number.isFinite(f?.fx) && Number.isFinite(f?.fy)
      ? { fx: f.fx, fy: f.fy }
      : null;
  } catch {
    return null;
  }
}

export function saveFractions(f: { fx: number; fy: number }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* position lasts for this run only */
  }
}

/** Speech bubble goes towards the open side of the window. */
export function bubbleSide(p: Pos, v: View) {
  return {
    horizontal:
      p.x + PET / 2 > v.w / 2 ? ("left" as const) : ("right" as const),
    vertical: p.y < 220 ? ("below" as const) : ("above" as const),
  };
}

/** Chat window next to the companion, inside the window. The chat is only
 *  as tall as its content, so it is anchored at the edge facing the
 *  companion (top or bottom) and limited to the room on that side. */
export type ChatBox = {
  left: number;
  width: number;
  maxHeight: number;
} & ({ top: number; bottom?: undefined } | { bottom: number; top?: undefined });

const MIN_CHAT = 300;

export function chatBox(p: Pos, v: View, size = { w: 380, h: 560 }): ChatBox {
  const width = Math.min(size.w, v.w - 2 * MARGIN);
  const right = p.x + PET / 2 > v.w / 2;
  const clampLeft = (x: number) =>
    Math.round(Math.min(Math.max(x, MARGIN), v.w - width - MARGIN));
  const roomAbove = p.y - 12 - MARGIN;
  const roomBelow = v.h - (p.y + PET + 12) - MARGIN;
  const aligned = clampLeft(right ? p.x + PET - width : p.x);
  if (roomAbove >= MIN_CHAT)
    return {
      left: aligned,
      bottom: Math.round(v.h - (p.y - 12)),
      width,
      maxHeight: Math.min(size.h, roomAbove),
    };
  if (roomBelow >= MIN_CHAT)
    return {
      left: aligned,
      top: Math.round(p.y + PET + 12),
      width,
      maxHeight: Math.min(size.h, roomBelow),
    };
  // Beside the companion, bottoms aligned, growing upwards.
  return {
    left: clampLeft(right ? p.x - 12 - width : p.x + PET + 12),
    bottom: Math.round(v.h - (p.y + PET)),
    width,
    maxHeight: Math.min(size.h, p.y + PET - MARGIN),
  };
}
