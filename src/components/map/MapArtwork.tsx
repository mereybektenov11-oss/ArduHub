"use client";
import { useState, useRef, useEffect, type PointerEvent } from "react";
import Icon from "@/components/icons/Icon";
import { mapNodes, mapRoads, mapSize } from "@/content/mapNodes";
import { mapRu as c } from "@/content/map.ru";
import assets from "@/content/cabinet-art.json";
import type { computeMapState } from "./mapState";
import "./map.css";
type MapStates = ReturnType<typeof computeMapState>;
export default function MapArtwork({
  states,
  unlock = null,
}: {
  states: MapStates;
  unlock?: number | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const svg = useRef<SVGSVGElement>(null);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; distance: number } | null>(null);
  const dragged = useRef(false);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setLoaded(true);
    image.src = "/cabinet/island.webp";
    return () => {
      image.onload = null;
    };
  }, []);
  function pointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * mapSize.width) / rect.width,
      y: ((event.clientY - rect.top) * mapSize.height) / rect.height,
    };
  }
  function metrics() {
    const entries = [...points.current.values()];
    const a = entries[0],
      b = entries[1] ?? a;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (
      !matchMedia("(max-width: 768px)").matches ||
      event.pointerType === "mouse"
    )
      return;
    if (!points.current.size) dragged.current = false;
    points.current.set(event.pointerId, pointer(event));
    last.current = metrics();
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, pointer(event));
    const next = metrics(),
      before = last.current;
    if (before) {
      if (
        Math.hypot(next.x - before.x, next.y - before.y) > 2 ||
        Math.abs(next.distance - before.distance) > 2
      )
        dragged.current = true;
      setView((old) => {
        const scale = Math.min(
          3,
          Math.max(
            1,
            before.distance > 0 && next.distance > 0
              ? (old.scale * next.distance) / before.distance
              : old.scale,
          ),
        );
        const ratio = scale / old.scale;
        return {
          scale,
          x: Math.min(
            0,
            Math.max(
              mapSize.width * (1 - scale),
              next.x - (before.x - old.x) * ratio,
            ),
          ),
          y: Math.min(
            0,
            Math.max(
              mapSize.height * (1 - scale),
              next.y - (before.y - old.y) * ratio,
            ),
          ),
        };
      });
    }
    last.current = next;
  }
  function up(event: PointerEvent<SVGSVGElement>) {
    points.current.delete(event.pointerId);
    last.current = points.current.size ? metrics() : null;
  }
  return (
    <div className="island-map-stage">
      <div className="island-map-viewport" data-map-viewport>
        <svg
          ref={svg}
          className="island-map-svg"
          viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
          role="group"
          aria-label={c.description}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onClickCapture={(event) => {
            if (dragged.current) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
            <image
              href={assets.island.blur}
              width={mapSize.width}
              height={mapSize.height}
            />
            <image
              href="/cabinet/island.webp"
              width={mapSize.width}
              height={mapSize.height}
              className={`island-map-image ${loaded ? "is-loaded" : ""}`}
            />
            {mapRoads.map((d, i) => (
              <path
                key={i}
                d={d}
                className={`island-gold-road ${states[i + 1]?.status !== "locked" ? "is-open" : ""} ${unlock === i + 1 ? "is-unlocking" : ""}`}
                pathLength="100"
                aria-hidden="true"
              />
            ))}
            {mapNodes.map((node) => {
              const state = states.find((state) => state.id === node.levelId);
              if (!state) return null;
              const labelY = node.labelSide === "top" ? -105 : 52;
              return (
                <g
                  key={node.levelId}
                  transform={`translate(${node.x} ${node.y})`}
                >
                  <a
                    href={
                      state.status === "locked"
                        ? undefined
                        : `/app/map/${node.levelId}`
                    }
                    aria-label={`${state.zoneName} · ${c[state.status]} · ${c.progress(state.done, state.total)}`}
                    aria-disabled={state.status === "locked"}
                    className={`island-map-node is-${state.status} ${unlock === node.levelId ? "is-unlocking" : ""}`}
                    data-map-level={node.levelId}
                    data-status={state.status}
                  >
                    <circle r="36" className="island-node-orb" />
                    {unlock === node.levelId && (
                      <path
                        className="island-unlock-lock"
                        d="M-9-2h18v17H-9Zm3-1v-6a6 6 0 0 1 12 0v6"
                        aria-hidden="true"
                      />
                    )}
                    <svg
                      x="-24"
                      y="-24"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <Icon name={node.icon} state={state.status} size={24} />
                    </svg>
                    {state.status === "current" && (
                      <path
                        d="M24-35v25m0-24h18l-7 7h-11"
                        className="island-node-flag"
                        aria-hidden="true"
                      />
                    )}
                    <rect
                      x="-150"
                      y={labelY}
                      width="300"
                      height="53"
                      rx="14"
                      className="island-node-label"
                    />
                    <text
                      x="0"
                      y={labelY + 22}
                      textAnchor="middle"
                      className="island-node-name"
                    >
                      {state.zoneName}
                    </text>
                    <text
                      x="0"
                      y={labelY + 42}
                      textAnchor="middle"
                      className="island-node-progress"
                    >
                      {c[state.status]}
                    </text>
                  </a>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="island-map-controls">
        <button
          type="button"
          aria-label={c.zoomIn}
          onClick={() =>
            setView((old) => ({ ...old, scale: Math.min(3, old.scale + 0.5) }))
          }
        >
          +
        </button>
        <button
          type="button"
          aria-label={c.zoomOut}
          onClick={() =>
            setView((old) => ({
              scale: Math.max(1, old.scale - 0.5),
              x: 0,
              y: 0,
            }))
          }
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            dragged.current = false;
            setView({ scale: 1, x: 0, y: 0 });
          }}
        >
          {c.reset}
        </button>
      </div>
    </div>
  );
}
