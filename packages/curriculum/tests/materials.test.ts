import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { courseCopy, learningRu } from "@arduhub/curriculum";
import sketches from "@arduhub/curriculum/sketches.json";
import index from "@arduhub/curriculum/hex/index.json";

it("exports lesson copy and every indexed firmware asset without a browser", () => {
  expect(typeof document).toBe("undefined");
  expect(Object.keys(courseCopy).length).toBeGreaterThan(0);
  expect(Object.keys(learningRu).length).toBeGreaterThan(0);
  expect(sketches.length).toBeGreaterThan(0);
  const require = createRequire(import.meta.url);
  for (const entry of Object.values(index.entries)) {
    const hex = readFileSync(
      require.resolve("@arduhub/curriculum" + entry.path),
      "utf8",
    );
    expect(hex.trim()).toMatch(/^:[\s\S]*:00000001FF$/);
  }
});
