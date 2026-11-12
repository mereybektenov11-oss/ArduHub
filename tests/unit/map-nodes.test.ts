import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mapNodes, mapNodeBounds, mapSize } from "@/content/mapNodes";
import { createProgress, lessons } from "@/domain/seed";
import { computeMapState } from "@/components/map/mapState";
import MapArtwork from "@/components/map/MapArtwork";
import { progressEvidence } from "../helpers/progressEvidence";
describe("island map", () => {
  it("uses the actual image dimensions", () => {
    const image = readFileSync("public/cabinet/island.webp");
    expect(image.toString("ascii", 12, 16)).toBe("VP8 ");
    expect(image.readUInt16LE(26) & 0x3fff).toBe(mapSize.width);
    expect(image.readUInt16LE(28) & 0x3fff).toBe(mapSize.height);
  });
  it("keeps every marker and label inside the image and mutually separate", () => {
    const bounds = mapNodes.map(mapNodeBounds);
    for (const box of bounds) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(mapSize.width);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(mapSize.height);
    }
    bounds.forEach((a, i) =>
      bounds
        .slice(i + 1)
        .forEach((b) =>
          expect(
            a.right <= b.left ||
              b.right <= a.left ||
              a.bottom <= b.top ||
              b.bottom <= a.top,
          ).toBe(true),
        ),
    );
  });
  it("opens levels only from verified course evidence", () => {
    const p = createProgress();
    expect(computeMapState(p).map((level) => level.status)).toEqual([
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
    for (const lesson of lessons.filter((lesson) => lesson.levelId === 0))
      p.lessons[lesson.id] = {
        ...p.lessons[lesson.id],
        status: "done",
        ...progressEvidence(lesson.id),
      };
    expect(computeMapState(p).map((level) => level.status)).toEqual([
      "done",
      "current",
      "locked",
      "locked",
      "locked",
    ]);
  });
  it("renders a natural-size image without portraits and distinguishes locked nodes", () => {
    const svg = renderToStaticMarkup(
      createElement(MapArtwork, { states: computeMapState(createProgress()) }),
    );
    expect(svg).toContain('viewBox="0 0 1280 720"');
    expect(svg).toContain('data-map-level="0" data-status="current"');
    expect(svg).toContain('data-map-level="1" data-status="locked"');
    expect(svg).not.toMatch(/volt|oma\.webp|rezik/);
    expect(svg).toContain('href="/cabinet/island.webp"');
    expect(svg).toContain('href="/app/map/0"');
    expect(svg).not.toContain('href="/app/map/1"');
  });
});
