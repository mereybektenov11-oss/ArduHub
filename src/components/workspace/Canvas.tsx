"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SceneDoc, PinRef } from "@arduhub/arduino-core/scene/scene";
import { canWire, pinKey, connections } from "@arduhub/arduino-core/scene/netlist";
import { pinPosition, componentPins } from "@arduhub/arduino-core/parts/pins";
import { catalog, isPartType, type PartType } from "@arduhub/arduino-core/parts/catalog";
import { sceneExtent, snap } from "@arduhub/arduino-core/scene/placement";
import { learningRu as c } from "@arduhub/curriculum/learning.ru";
import PartView from "./PartView";
import { fitSceneToViewport } from "@arduhub/arduino-core/scene/viewport";
import { kidsWorkspaceRu as k } from "@/content/kids-workspace.ru";
import { playSfx } from "@/lib/sfx";
export default function Canvas({
  scene,
  onChange,
  levels,
  selected,
  onSelect,
  color,
  disabled = false,
  errors = [],
  onAdd,
  devices = {},
  inputs = {},
  onView,
  onRemove,
  tools,
  wireOptions,
}: {
  scene: SceneDoc;
  onChange: (s: SceneDoc) => void;
  levels: Record<string, number | number[]>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  color: string;
  disabled?: boolean;
  errors?: string[];
  onAdd?: (type: PartType, point: { x: number; y: number }) => void;
  devices?: Record<string, number | number[] | string>;
  inputs?: Record<string, number>;
  onView?: (center: { x: number; y: number }) => void;
  onRemove?: () => void;
  tools?: ReactNode;
  wireOptions?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    [zoom, setZoom] = useState(1),
    [pending, setPending] = useState<PinRef | null>(null),
    [message, setMessage] = useState("");
  const extent = sceneExtent(scene);
  const reportView = useCallback(() => {
    const view = viewport.current;
    if (view)
      onView?.({
        x: extent.x + (view.scrollLeft + view.clientWidth / 2) / zoom,
        y: extent.y + (view.scrollTop + view.clientHeight / 2) / zoom,
      });
  }, [extent.x, extent.y, onView, zoom]);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(reportView);
    observer.observe(viewport.current);
    reportView();
    return () => observer.disconnect();
  }, [reportView]);
  const manuallyZoomed = useRef(false);
  const fit = useCallback(
    (editing = false) => {
      if (viewport.current) {
        setZoom(
          Math.max(
            editing && viewport.current.clientWidth < 600 ? 0.8 : 0.01,
            fitSceneToViewport(
              { width: extent.width, height: extent.height },
              {
                width: viewport.current.clientWidth,
                height: viewport.current.clientHeight,
              },
            ),
          ),
        );
        viewport.current.scrollTo(0, 0);
      }
    },
    [extent.width, extent.height],
  );
  const fitRef = useRef(() => fit(true));
  useEffect(() => {
    fitRef.current = () => fit(true);
  }, [fit]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (!manuallyZoomed.current) fitRef.current();
    });
    observer.observe(element);
    const frame = requestAnimationFrame(() => {
      if (!manuallyZoomed.current) fitRef.current();
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const space = useRef(false),
    pan = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<number | null>(null);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      manuallyZoomed.current = true;
      setZoom((z) =>
        Math.max(0.01, Math.min(2, z * (event.deltaY > 0 ? 0.9 : 1.1))),
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (selected)
        root.current
          ?.querySelector(`[data-component="${CSS.escape(selected)}"]`)
          ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, scene.components.length]);
  const drag = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    next: SceneDoc;
  } | null>(null);
  const [preview, setPreview] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const displayed = {
    ...scene,
    components: scene.components.map((part) => ({
      ...part,
      ...preview[part.id],
    })),
  };
  const [hovered, setHovered] = useState<PinRef | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 400);
    return () => clearTimeout(timer);
  }, [flash]);
  const linked = hovered ? connections(scene) : null;
  function wire(p: PinRef) {
    if (disabled) return;
    if (!pending) {
      setPending(p);
      setMessage(c.choosePin);
      return;
    }
    if (canWire(scene, pending, p)) {
      playSfx("wire_snap");
      setFlash(pinKey(p));
      onChange({
        ...scene,
        wires: [
          ...scene.wires,
          { id: crypto.randomUUID(), from: pending, to: p, color, bends: [] },
        ],
      });
      setMessage("");
    } else setMessage(c.invalidWire);
    setPending(null);
  }
  const position = (p: PinRef) => {
    const part = displayed.components.find((c) => c.id === p.componentId);
    return part ? pinPosition(part, p.pin) : null;
  };
  return (
    <>
      <div className="kids-canvas-controls">
        <div
          className="kids-circuit-toolbar"
          role="toolbar"
          aria-label={k.tools}
        >
          {tools}
          <button
            className="cab-btn cab-btn-secondary"
            onClick={() => {
              manuallyZoomed.current = true;
              fit();
            }}
          >
            {c.fit}
          </button>
          <button
            className="cab-icon-btn"
            aria-label={k.zoomIn}
            onClick={() => {
              manuallyZoomed.current = true;
              setZoom((z) => Math.min(2, z * 1.2));
            }}
          >
            +
          </button>
          <button
            className="cab-icon-btn"
            aria-label={k.zoomOut}
            onClick={() => {
              manuallyZoomed.current = true;
              setZoom((z) => Math.max(0.01, z / 1.2));
            }}
          >
            −
          </button>
        </div>
        <details className="kids-canvas-menu">
          <summary className="cab-icon-btn" aria-label={k.more}>
            ⋯
          </summary>
          <div className="kids-options-panel">
            {wireOptions}
            <button
              className="cab-btn cab-btn-secondary"
              disabled={disabled || scene.wires.length === 0}
              onClick={() => {
                onChange({ ...scene, wires: [] });
                onSelect(null);
                setPending(null);
                setMessage(c.wiresCleared);
              }}
            >
              {c.clearWires}
            </button>
            {scene.wires.some((wire) => wire.id === selected) && (
              <button
                className="cab-btn cab-btn-secondary"
                disabled={disabled}
                onClick={onRemove}
              >
                {c.removeWire}
              </button>
            )}
            <span>
              {c.zoom}: {Math.round(zoom * 100)}%
            </span>
          </div>
        </details>
      </div>
      {scene.components.length >= 50 && (
        <p className="l2-note" role="status">
          {c.partsCount}: {scene.components.length}/60
        </p>
      )}
      <div
        ref={viewport}
        className="l2-canvas-scroll"
        onScroll={reportView}
        tabIndex={0}
        role="region"
        aria-label={c.circuit}
        onKeyDown={(e) => {
          if (
            e.code === "Space" &&
            !(e.target as HTMLElement).closest("button,input")
          ) {
            e.preventDefault();
            space.current = true;
          }
        }}
        onKeyUp={(e) => {
          if (e.code === "Space") {
            space.current = false;
            pan.current = null;
          }
        }}
        onBlur={() => {
          space.current = false;
          pan.current = null;
        }}
        onDragOver={(e) => {
          if (!disabled) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const type = e.dataTransfer.getData("application/x-arduhub-part");
          if (disabled || !isPartType(type) || !root.current) return;
          const box = root.current.getBoundingClientRect();
          onAdd?.(type, {
            x: extent.x + (e.clientX - box.left) / zoom,
            y: extent.y + (e.clientY - box.top) / zoom,
          });
        }}
        onPointerDown={(e) => {
          if (space.current || e.button === 1) {
            e.preventDefault();
            pan.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          if (e.pointerType === "touch") {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }
        }}
        onPointerMove={(e) => {
          if (pan.current) {
            viewport.current?.scrollBy(
              pan.current.x - e.clientX,
              pan.current.y - e.clientY,
            );
            pan.current = { x: e.clientX, y: e.clientY };
            return;
          }
          if (!touches.current.has(e.pointerId)) return;
          const before = touches.current.get(e.pointerId)!;
          touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const points = [...touches.current.values()];
          if (points.length === 2) {
            const distance = Math.hypot(
              points[0].x - points[1].x,
              points[0].y - points[1].y,
            );
            if (pinch.current)
              setZoom((z) =>
                Math.max(0.01, Math.min(2, (z * distance) / pinch.current!)),
              );
            pinch.current = distance;
          } else if (!(e.target as HTMLElement).closest("button"))
            viewport.current?.scrollBy(
              before.x - e.clientX,
              before.y - e.clientY,
            );
        }}
        onPointerUp={(e) => {
          pan.current = null;
          touches.current.delete(e.pointerId);
          pinch.current = null;
        }}
        onPointerCancel={(e) => {
          pan.current = null;
          touches.current.delete(e.pointerId);
          pinch.current = null;
        }}
      >
        <div
          style={{
            width: extent.width * zoom,
            height: extent.height * zoom,
            minWidth: "100%",
          }}
        >
          <div
            ref={root}
            className="l2-canvas"
            style={{
              width: extent.width,
              height: extent.height,
              minWidth: extent.width,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              margin: 0,
            }}
            aria-label={c.circuit}
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const w = scene.wires.find((w) => w.id === selected);
              if (w && !disabled && w.bends.length < 20) {
                const box = e.currentTarget.getBoundingClientRect();
                onChange({
                  ...scene,
                  wires: scene.wires.map((v) =>
                    v.id === w.id
                      ? {
                          ...v,
                          bends: [
                            ...v.bends,
                            {
                              x: Math.round(
                                extent.x +
                                  ((e.clientX - box.left) / box.width) *
                                    extent.width,
                              ),
                              y: Math.round(
                                extent.y +
                                  ((e.clientY - box.top) / box.height) *
                                    extent.height,
                              ),
                            },
                          ],
                        }
                      : v,
                  ),
                });
              } else onSelect(null);
              setPending(null);
            }}
          >
            {!scene.components.length && (
              <p className="l2-empty-canvas">{c.emptyCanvas}</p>
            )}
            <svg
              className="l2-wires"
              viewBox={`${extent.x} ${extent.y} ${extent.width} ${extent.height}`}
              aria-label={c.circuit}
            >
              {displayed.wires.map((w) => {
                const a = position(w.from),
                  b = position(w.to);
                if (!a || !b) return null;
                const points = [a, ...w.bends, b];
                return (
                  <g key={w.id} className="g3-wire-connected">
                    <polyline
                      pathLength="1"
                      points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={w.color}
                      strokeWidth={selected === w.id ? 5 : 3}
                      strokeLinejoin="round"
                    />
                    <polyline
                      role="button"
                      aria-pressed={selected === w.id}
                      aria-label={`${c.color}: ${w.from.componentId} ${w.from.pin} → ${w.to.componentId} ${w.to.pin}`}
                      tabIndex={0}
                      points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (disabled) return;
                        setPending(null);
                        e.currentTarget.focus();
                        onSelect(w.id);
                      }}
                      onKeyDown={(e) => {
                        if (!disabled && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault();
                          setPending(null);
                          onSelect(w.id);
                        }
                      }}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    />
                  </g>
                );
              })}
            </svg>
            {displayed.components.map((part) => (
              <div
                key={part.id}
                data-component={part.id}
                data-type={part.type}
                className={`l2-part ${selected === part.id ? "selected" : ""} ${errors.includes(part.id) ? "invalid" : ""}`}
                style={{
                  left: part.x - extent.x,
                  top: part.y - extent.y,
                  width: catalog[part.type].width,
                  height: catalog[part.type].height,
                  transform: `rotate(${part.rotation}deg)`,
                }}
              >
                <PartView
                  type={part.type}
                  attrs={part.attrs}
                  level={levels[part.id] ?? 0}
                  powered={disabled}
                  visual={devices[part.id]}
                  input={{
                    value:
                      inputs[part.id] ??
                      Number(
                        part.attrs.value ??
                          ([
                            "pot",
                            "slide-potentiometer",
                            "analog-joystick",
                          ].includes(part.type)
                            ? 50
                            : 0),
                      ),
                    y: inputs[`${part.id}.y`] ?? 50,
                  }}
                />
                <button
                  className="l2-part-handle"
                  aria-label={`${catalog[part.type].name} ${part.id}`}
                  disabled={disabled}
                  onClick={() => onSelect(part.id)}
                  onPointerDown={(e) => {
                    if (disabled) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onSelect(part.id);
                    drag.current = {
                      id: part.id,
                      clientX: e.clientX,
                      clientY: e.clientY,
                      x: part.x,
                      y: part.y,
                      next: scene,
                    };
                  }}
                  onPointerMove={(e) => {
                    const d = drag.current;
                    if (!d || d.id !== part.id || !root.current) return;
                    const scale =
                      extent.width / root.current.getBoundingClientRect().width;
                    const x = Math.max(
                        0,
                        Math.min(
                          9500,
                          snap(d.x + (e.clientX - d.clientX) * scale),
                        ),
                      ),
                      y = Math.max(
                        25,
                        Math.min(
                          9500,
                          snap(d.y + (e.clientY - d.clientY) * scale),
                        ),
                      );
                    setPreview({ [part.id]: { x, y } });
                    d.next = {
                      ...scene,
                      components: scene.components.map((c) =>
                        c.id === part.id ? { ...c, x, y } : c,
                      ),
                    };
                  }}
                  onPointerUp={() => {
                    const d = drag.current;
                    if (d && d.next !== scene) onChange(d.next);
                    drag.current = null;
                    setPreview({});
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                    setPreview({});
                  }}
                  onKeyDown={(e) => {
                    const delta: { [key: string]: [number, number] } = {
                      ArrowLeft: [-10, 0],
                      ArrowRight: [10, 0],
                      ArrowUp: [0, -10],
                      ArrowDown: [0, 10],
                    };
                    if (delta[e.key] && !disabled) {
                      e.preventDefault();
                      const [x, y] = delta[e.key];
                      onChange({
                        ...scene,
                        components: scene.components.map((c) =>
                          c.id === part.id
                            ? {
                                ...c,
                                x: Math.max(20, Math.min(9500, c.x + x)),
                                y: Math.max(60, Math.min(9500, c.y + y)),
                              }
                            : c,
                        ),
                      });
                    }
                  }}
                />
              </div>
            ))}
            {displayed.components.flatMap((part) =>
              componentPins(part).map((pin) => {
                const point = position({ componentId: part.id, pin: pin.name });
                if (!point) return null;
                return (
                  <button
                    key={`${part.id}:${pin.name}`}
                    onPointerEnter={() =>
                      setHovered({ componentId: part.id, pin: pin.name })
                    }
                    onPointerLeave={() => setHovered(null)}
                    className={`l2-pin ${pending && pinKey(pending) === `${part.id}:${pin.name}` ? "pending" : ""} ${flash === `${part.id}:${pin.name}` ? "g3-pin-connected" : ""}`}
                    aria-label={`${part.id} ${pin.name}`}
                    disabled={disabled}
                    style={{
                      left: point.x - extent.x,
                      top: point.y - extent.y,
                      ...(hovered &&
                      linked &&
                      linked(hovered, { componentId: part.id, pin: pin.name })
                        ? {
                            background: "var(--amber-500)",
                            outline: "2px solid var(--amber-600)",
                          }
                        : {}),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      wire({ componentId: part.id, pin: pin.name });
                    }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <p className="l2-canvas-hint" role="status">
        {(message === c.wiresCleared && scene.wires.length > 0
          ? ""
          : message) || c.keyboard}
      </p>
    </>
  );
}
