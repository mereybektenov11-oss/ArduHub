"use client";
import { useRef, useState, type PointerEvent } from "react";
import { mapNodes, mapSize } from "@/content/mapNodes";
import { mapRu as c } from "@/content/map.ru";
import "./map.css";
export default function MapEditor() {
  const [nodes, setNodes] = useState(mapNodes);
  const [copied, setCopied] = useState(false);
  const selected = useRef<number | null>(null);
  function move(event: PointerEvent<SVGSVGElement>) {
    if (selected.current === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(
      Math.max(
        150,
        Math.min(
          mapSize.width - 150,
          ((event.clientX - rect.left) * mapSize.width) / rect.width,
        ),
      ),
    );
    const y = Math.round(
      Math.max(
        110,
        Math.min(
          mapSize.height - 110,
          ((event.clientY - rect.top) * mapSize.height) / rect.height,
        ),
      ),
    );
    setCopied(false);
    setNodes((current) =>
      current.map((node) =>
        node.levelId === selected.current ? { ...node, x, y } : node,
      ),
    );
  }
  const output = JSON.stringify(nodes, null, 2);
  return (
    <main className="map-editor">
      <h1>{c.editor}</h1>
      <p>{c.editorHelp}</p>
      <svg
        viewBox={`0 0 ${mapSize.width} ${mapSize.height}`}
        onPointerMove={move}
        onPointerUp={() => {
          selected.current = null;
        }}
        onPointerCancel={() => {
          selected.current = null;
        }}
      >
        <image
          href="/cabinet/island.webp"
          width={mapSize.width}
          height={mapSize.height}
        />
        {nodes.map((node) => (
          <g
            key={node.levelId}
            transform={`translate(${node.x} ${node.y})`}
            onPointerDown={(event) => {
              selected.current = node.levelId;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          >
            <circle r="28" />
            <text y="6" textAnchor="middle">
              {node.levelId}
            </text>
          </g>
        ))}
      </svg>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard
            .writeText(output)
            .then(() => setCopied(true));
        }}
      >
        {copied ? c.copied : c.export}
      </button>
      <label>
        {c.output}
        <textarea readOnly value={output} />
      </label>
    </main>
  );
}
