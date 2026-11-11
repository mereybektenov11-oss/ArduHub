import { describe, expect, it } from "vitest";
import { BrowserProgressStore, STORAGE_KEY } from "@/domain/progress/storage";
import { createProgress } from "@/domain/seed";
import { lessonOpen } from "@/domain/progress/xp";
import { learningLessons, exampleScene } from "@arduhub/arduino-core/lessons/content";
import { emptyScene, makePart } from "@arduhub/arduino-core/scene/scene";
import { connections } from "@arduhub/arduino-core/scene/netlist";
import { checkScene } from "@arduhub/arduino-core/scene/check";
import { legacyNetlist } from "@arduhub/arduino-core/scene/migrate";
import { checkBehavior, type BehaviorCheck } from "@arduhub/arduino-core/sim/checks";
import type { Sample } from "@arduhub/arduino-core/sim/runner";
import { reviewSections } from "@/services/mentor/review";
function storage(value: unknown) {
  const data = new Map([[STORAGE_KEY, JSON.stringify(value)]]);
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
describe("curriculum migration contracts", () => {
  it("resets legacy completions without evidence, moves button/pot receipts, and preserves unrelated circuits", () => {
    const old = createProgress();
    delete old.curriculumVersion;
    delete old.settings;
    old.lessons["lesson-2"].status = "done";
    old.lessons["lesson-3"].status = "done";
    // These legacy circuits are valid saved structures, independent of their lesson assignment.
    old.circuits = {};
    const original = exampleScene();
    const circuit = legacyNetlist(original);
    old.circuits = {
      "lesson-1": circuit,
      "lesson-2": circuit,
      "lesson-3": circuit,
    };
    const store = new BrowserProgressStore(storage(old)),
      next = store.load();
    expect(next.curriculumVersion).toBe(2);
    expect(next.settings?.textScale).toBe(1);
    expect(next.lessons["lesson-1"].status).toBe("current");
    expect(next.lessons["lesson-3"].status).toBe("locked");
    expect(next.lessons["lesson-6"].status).toBe("locked");
    expect(next.lessons["lesson-3"].rewarded).toBe(true);
    expect(next.lessons["lesson-6"].rewarded).toBe(true);
    expect(next.lessons["lesson-2"].status).toBe("locked");
    expect(Object.keys(next.circuits)).toEqual([
      "lesson-1",
      "lesson-3",
      "lesson-6",
    ]);
    next.settings = { textScale: 1.3 };
    store.save(next);
    expect(
      new BrowserProgressStore(storage(next)).load().settings?.textScale,
    ).toBe(1.3);
  });
  it("does not open a lesson until its simulator is ready", () => {
    const lesson = learningLessons[0],
      saved = lesson.available;
    try {
      lesson.available = false;
      expect(lessonOpen(createProgress(), lesson.id)).toBe(false);
    } finally {
      lesson.available = saved;
    }
  });
});
describe("physical net contracts", () => {
  it("connects DIP channels independently and a selected keyboard row/column", () => {
    const s = emptyScene();
    s.components = [
      makePart("dip-switch-8", "dip"),
      makePart("membrane-keypad", "key"),
    ];
    const pair = (a: string, b: string, states: Record<string, number> = {}) =>
      connections(
        s,
        false,
        states,
      )({ componentId: "dip", pin: a }, { componentId: "dip", pin: b });
    expect(pair("1a", "1b")).toBe(false);
    expect(pair("1a", "1b", { dip: 1 })).toBe(true);
    expect(pair("2a", "2b", { dip: 1 })).toBe(false);
    expect(
      connections(s, false, { key: 5 })(
        { componentId: "key", pin: "R2" },
        { componentId: "key", pin: "C2" },
      ),
    ).toBe(true);
    expect(
      connections(s)(
        { componentId: "key", pin: "R1" },
        { componentId: "key", pin: "C1" },
      ),
    ).toBe(false);
    expect(
      connections(s, false, { key: -1 })(
        { componentId: "key", pin: "R1" },
        { componentId: "key", pin: "C1" },
      ),
    ).toBe(false);
  });
  it("checks a breadboard circuit exactly like its direct-wire equivalent", () => {
    const reference = exampleScene("button"),
      scene = structuredClone(reference);
    scene.components.push(
      makePart("breadboard", "bb", 0, 500),
      makePart("pot", "unused"),
    );
    const first = scene.wires.shift()!;
    scene.wires.push(
      { ...first, id: "to-board", to: { componentId: "bb", pin: "1a" } },
      { ...first, id: "from-board", from: { componentId: "bb", pin: "1e" } },
    );
    expect(checkScene(scene, reference)).toEqual(
      checkScene(reference, reference),
    );
    expect(legacyNetlist(scene).links.length).toBeGreaterThan(
      scene.wires.length,
    );
    // The same resistor can be inserted in either direction.
    const reverse = structuredClone(reference);
    for (const wire of reverse.wires)
      for (const p of [wire.from, wire.to])
        if (p.componentId === "r") p.pin = p.pin === "1" ? "2" : "1";
    expect(checkScene(reverse, reference)).toEqual([]);
  });
  it("maps imported component identities and detects missing wiring", () => {
    const reference = learningLessons[9].circuit.referenceScene,
      scene = structuredClone(reference);
    for (const part of scene.components) part.id = `copy-${part.id}`;
    for (const wire of scene.wires)
      for (const pin of [wire.from, wire.to])
        pin.componentId = `copy-${pin.componentId}`;
    expect(checkScene(scene, reference)).toEqual([]);
    scene.wires = [];
    expect(checkScene(scene, reference).length).toBeGreaterThan(0);
  });
});
describe("observed output contracts", () => {
  const frame = (
    devices: Sample["devices"] = {},
    pulseWidths: number[] = [],
  ): Sample => ({
    time: 500,
    pins: [],
    pwm: [],
    inputs: {},
    devices,
    pulseWidths,
  });
  it("requires observed display text, measured pulse and numeric Serial output", () => {
    const checks: BehaviorCheck[] = [
      { kind: "displayContains", text: "Privet" },
      { kind: "pulseWidth", pin: 0, min: 1450, max: 1500 },
      { kind: "serialNumber", min: 5500, max: 6100 },
    ];
    expect(
      checkBehavior(checks, {
        samples: [frame({ lcd: "Privet", other: 42 }, [1472])],
        serial: "noise\n5800\n",
      }).every((c) => c.pass),
    ).toBe(true);
    for (const sample of [
      frame({ lcd: [] }, []),
      { ...frame(), devices: undefined, pulseWidths: undefined },
      frame({ lcd: "wrong" }, [900]),
      frame({ lcd: "wrong" }, [2000]),
    ])
      expect(
        checkBehavior(checks, {
          samples: [sample],
          serial: "\nnoise\n9999\n",
        }).every((c) => !c.pass),
      ).toBe(true);
    expect(
      checkBehavior(checks, { samples: [], serial: "" }).every((c) => !c.pass),
    ).toBe(true);
    expect(
      reviewSections(
        "Что работает\nСхема собрана\nЧто рискованно\nПроверь питание\nСледующий шаг\nЗапусти",
      ),
    ).toHaveLength(3);
  });
});
