import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { normalizeCode } from "@arduhub/arduino-core/compile/normalize";
import index from "@arduhub/curriculum/hex/index.json";
const require = createRequire(import.meta.url);
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { isScene } from "@arduhub/arduino-core/scene/scene";
import { checkScene } from "@arduhub/arduino-core/scene/check";
import { catalog } from "@arduhub/arduino-core/parts/catalog";
import { UnoRunner } from "@arduhub/arduino-core/sim/runner";
import { applyInputs } from "@arduhub/arduino-core/sim/glue/inputs";
import { attachTimed } from "@arduhub/arduino-core/sim/glue/timed";
import { attachBuses } from "@arduhub/arduino-core/sim/glue/buses";
import { checkBehavior } from "@arduhub/arduino-core/sim/checks";
describe("twelve lesson data", () => {
  it("contains valid scenes, allowed parts, video queries and three hints", () => {
    expect(learningLessons).toHaveLength(12);
    for (const lesson of learningLessons) {
      expect(isScene(lesson.circuit.referenceScene), lesson.id).toBe(true);
      expect(
        checkScene(
          lesson.circuit.referenceScene,
          lesson.circuit.referenceScene,
        ),
        lesson.id,
      ).toEqual([]);
      expect(lesson.video.query.length).toBeGreaterThan(10);
      expect(lesson.theory.length).toBeGreaterThanOrEqual(3);
      expect(lesson.code.hints).toHaveLength(3);
      expect(lesson.circuit.hints).toHaveLength(3);
      expect(lesson.circuit.allowedParts.every((p) => !!catalog[p])).toBe(true);
      expect(lesson.available).toBe(
        lesson.circuit.referenceScene.components.every(
          (p) => catalog[p.type].simulated,
        ),
      );
    }
  });
});
describe.skipIf(process.env.LEARNING_COVERAGE === "1")(
  "course real firmware",
  () => {
    for (const lesson of learningLessons)
      it(`passes ${lesson.id}: ${lesson.title}`, () => {
        const hash = createHash("sha256")
          .update(normalizeCode(lesson.code.solution))
          .digest("hex");
        const entry = index.entries[hash as keyof typeof index.entries];
        const firmware = entry && {
          hex: readFileSync(
            require.resolve("@arduhub/curriculum" + entry.path),
            "utf8",
          ),
        };
        expect(firmware, lesson.id).toBeDefined();
        const r = new UnoRunner(firmware!.hex),
          scene = lesson.circuit.referenceScene,
          samples = [];
        let states: Record<string, number> = {};
        attachTimed(r, scene, () => states);
        attachBuses(r, scene, () => states);
        while (r.time < lesson.run.durationMs) {
          states = {
            btn: r.time >= 1000 && r.time < 2000 ? 1 : 0,
            pot: 50,
            device: 100,
          };
          applyInputs(r, scene, states);
          r.advance(20);
          samples.push(r.sample());
        }
        const result = checkBehavior(lesson.run.checks, {
          samples,
          serial: r.serial,
        });
        expect(
          result.every((check) => check.pass),
          JSON.stringify(result),
        ).toBe(true);
      }, 20000);
  },
);
