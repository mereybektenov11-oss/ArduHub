"use client";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { catalog } from "@arduhub/arduino-core/parts/catalog";
import { pinPosition } from "@arduhub/arduino-core/parts/pins";
import { sceneExtent } from "@arduhub/arduino-core/scene/placement";
import PartView from "@/components/workspace/PartView";
export default function ScenePreview({
  scene,
  title,
}: {
  scene: SceneDoc;
  title: string;
}) {
  const size = sceneExtent(scene);
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`${size.x} ${size.y} ${size.width} ${size.height}`}
      width="100%"
      height="180"
      preserveAspectRatio="xMidYMid meet"
    >
      {scene.wires.map((w) => {
        const a = scene.components.find((p) => p.id === w.from.componentId),
          b = scene.components.find((p) => p.id === w.to.componentId);
        const from = a && pinPosition(a, w.from.pin),
          to = b && pinPosition(b, w.to.pin);
        return from && to ? (
          <polyline
            key={w.id}
            points={[from, ...w.bends, to]
              .map((p) => `${p.x},${p.y}`)
              .join(" ")}
            stroke={w.color}
            strokeWidth="3"
            fill="none"
          />
        ) : null;
      })}
      {scene.components.map((part) => (
        <foreignObject
          key={part.id}
          x={0}
          y={0}
          width={catalog[part.type].width}
          height={catalog[part.type].height}
          transform={`translate(${part.x} ${part.y}) rotate(${part.rotation})`}
        >
          <div>
            <PartView type={part.type} attrs={part.attrs} lazy />
          </div>
        </foreignObject>
      ))}
    </svg>
  );
}
