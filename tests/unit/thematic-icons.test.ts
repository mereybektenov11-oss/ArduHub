import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Icon, { iconNames, type IconState } from "@/components/icons/Icon";

describe("thematic icon renderer", () => {
  it("renders every theme in each supported size with a two pixel contour", () => {
    for (const name of iconNames)
      for (const size of [24, 32, 48, 96] as const) {
        const svg = renderToStaticMarkup(createElement(Icon, { name, size }));
        expect(svg).toContain(`width="${size}"`);
        expect(svg).toContain('stroke-width="2"');
        expect(svg).toContain(`data-icon="${name}"`);
        expect(svg).not.toContain("undefined");
      }
  });
  it("exposes each streak and topic state for integration", () => {
    for (const state of [
      "none",
      "active",
      "pending",
      "frozen",
      "milestone",
      "ignite",
      "extinguish",
      "done",
      "current",
      "locked",
    ] as IconState[]) {
      const svg = renderToStaticMarkup(
        createElement(Icon, { name: "streak", state, value: 14 }),
      );
      expect(svg).toContain(`icon-state-${state}`);
      if (state === "pending") expect(svg).toContain("Позанимайся сегодня");
      if (state === "milestone") expect(svg).toContain(">14</text>");
    }
  });
  it("gives each gradient its own reference when icons share a surface", () => {
    const svg = renderToStaticMarkup(
      createElement(
        "div",
        null,
        ...[1, 2].map((key) => createElement(Icon, { key, name: "tokens" })),
      ),
    );
    const ids = [...svg.matchAll(/linearGradient id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(ids).size).toBe(2);
  });
  it("has an active flame animation and explicit static guards", () => {
    const css = readFileSync("src/components/icons/icons.css", "utf8");
    expect(css).toMatch(
      /\.icon-streak\.icon-state-active\s*\{[^}]*animation:\s*ardu-flame/,
    );
    expect(css).toMatch(
      /\.icon-state-none,\s*\.icon-state-none \*\s*\{\s*animation: none !important/,
    );
    expect(css).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*animation: none !important/,
    );
  });
});
