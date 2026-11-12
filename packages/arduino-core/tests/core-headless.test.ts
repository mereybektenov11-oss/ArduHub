import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  UnoRunner,
  checkBehavior,
  learningLessons,
  normalizeCode,
} from "@arduhub/arduino-core";

import index from "@arduhub/curriculum/hex/index.json";
import { createHash } from "node:crypto";

it("runs lesson-1 firmware through the public core in Node without DOM", () => {
  expect(typeof document).toBe("undefined");
  const lesson = learningLessons.find((item) => item.id === "lesson-1")!;

  const hash = createHash("sha256")
    .update(normalizeCode(lesson.code.solution))
    .digest("hex");
  const entry = index.entries[hash as keyof typeof index.entries];
  const require = createRequire(import.meta.url);
  const hex = readFileSync(
    require.resolve("@arduhub/curriculum" + entry.path),
    "utf8",
  );
  const runner = new UnoRunner(hex);
  const samples = [];
  while (runner.time < 3200) {
    runner.advance(20);
    samples.push(runner.sample());
  }
  expect(
    checkBehavior(
      [{ kind: "pinBlinks", pin: 13, minToggles: 3, withinMs: 3200 }],
      { samples, serial: runner.serial },
    )[0].pass,
  ).toBe(true);
}, 30_000);
