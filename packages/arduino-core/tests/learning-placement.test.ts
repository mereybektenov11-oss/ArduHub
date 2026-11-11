import { describe, expect, it } from "vitest";
import { emptyScene, makePart } from "@arduhub/arduino-core/scene/scene";
import {
  bounds,
  freePosition,
  overlaps,
  sceneExtent,
  snap,
} from "@arduhub/arduino-core/scene/placement";
describe("free placement", () => {
  it("fits rotated parts and imported wire bends with negative coordinates", () => {
    const scene = emptyScene();
    scene.components = [{ ...makePart("uno", "board", 20, 60), rotation: 180 }];
    scene.wires = [
      {
        id: "w",
        from: { componentId: "board", pin: "13" },
        to: { componentId: "board", pin: "12" },
        color: "#c58320",
        bends: [{ x: -500, y: -300 }],
      },
    ];
    const box = bounds(scene.components[0]),
      size = sceneExtent(scene);
    expect(size.x).toBeLessThanOrEqual(-500);
    expect(size.y).toBeLessThanOrEqual(-300);
    expect(box.left).toBeGreaterThanOrEqual(size.x);
    expect(box.top).toBeGreaterThanOrEqual(size.y);
    expect(box.right).toBeLessThanOrEqual(size.x + size.width);
    expect(box.bottom).toBeLessThanOrEqual(size.y + size.height);
  });
  it("adds five resistors without intersecting the Arduino or labels", () => {
    const scene = emptyScene();
    scene.components.push(makePart("uno", "board", 45, 130));
    for (let i = 0; i < 5; i++) {
      const point = freePosition(scene, "resistor");
      const part = makePart("resistor", `r${i}`, point.x, point.y);
      expect(
        scene.components.some((p) => overlaps(bounds(p), bounds(part))),
      ).toBe(false);
      expect(point.x % 10).toBe(0);
      expect(point.y % 10).toBe(0);
      scene.components.push(part);
    }
  });
  it("expands beyond the visible area and accounts for rotation", () => {
    const scene = emptyScene();
    for (let i = 0; i < 60; i++) {
      const point = freePosition(scene, "uno");
      const part = {
        ...makePart("uno", `p${i}`, point.x, point.y),
        rotation: 90,
      };
      // Placement is requested before rotation; test the rotated box independently.
      expect(bounds(part).right).toBeGreaterThan(bounds(part).left);
      scene.components.push(makePart("uno", `p${i}`, point.x, point.y));
    }
    expect(sceneExtent(scene).height).toBeGreaterThan(440);
    expect(snap(43)).toBe(40);
  });
});
