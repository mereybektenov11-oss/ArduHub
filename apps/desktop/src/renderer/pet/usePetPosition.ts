import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  clampPos,
  fromFractions,
  loadFractions,
  saveFractions,
  toFractions,
  type Pos,
  type View,
} from "./drag";

const DRAG_THRESHOLD = 4;
const view = (): View => ({ w: window.innerWidth, h: window.innerHeight });

// Drag the companion with the mouse (or pen/touch), or move it with the
// arrow keys when it has focus. A press that moved more than a few pixels is
// a drag, not a click: `consumeClick` then tells the button to ignore it.
export function usePetPosition() {
  const [pos, setPos] = useState<Pos>(() =>
    fromFractions(loadFractions(), view()),
  );
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(
    null,
  );
  const moved = useRef(false);
  const latest = useRef(pos);

  const place = useCallback((p: Pos, persist: boolean) => {
    const v = view();
    const next = clampPos(p, v);
    latest.current = next;
    setPos(next);
    if (persist) saveFractions(toFractions(next, v));
  }, []);

  // Keep the same relative place when the window is resized.
  useEffect(() => {
    const onResize = () => setPos(fromFractions(loadFractions(), view()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    start.current = {
      px: e.clientX,
      py: e.clientY,
      x: latest.current.x,
      y: latest.current.y,
    };
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!moved.current) {
      moved.current = true;
      setDragging(true);
    }
    place({ x: s.x + dx, y: s.y + dy }, false);
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    start.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (moved.current) {
      setDragging(false);
      place(latest.current, true);
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const step = e.shiftKey ? 96 : 24;
    const d = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[e.key];
    if (!d) return;
    e.preventDefault();
    place({ x: latest.current.x + d[0], y: latest.current.y + d[1] }, true);
  };
  /** True once after a drag, so the click that ends it is ignored. */
  const consumeClick = () => {
    const wasDrag = moved.current;
    moved.current = false;
    return wasDrag;
  };

  return {
    pos,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onKeyDown },
    consumeClick,
  };
}
