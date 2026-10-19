import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { exampleScene, learningLessons } from "@/domain/lessons/content";
import { isScene, emptyScene } from "@/domain/scene/scene";
import { migrateScene } from "@/domain/scene/migrate";
import { referenceCircuit } from "@/domain/checker/netlist";
import { canWire, shorted } from "@/domain/scene/netlist";
import { checkScene } from "@/domain/scene/check";
import { checkBehavior } from "@/domain/sim/checks";
import { UnoRunner } from "@/domain/sim/runner";
import { applyInputs } from "@/domain/sim/glue/inputs";
import { loadHex } from "@/domain/sim/hex";
import {
  LearningStore,
  importProject,
  isDraft,
  isProject,
  thumbnail,
  initialSteps,
} from "@/domain/projects/storage";
import { createCompileHandler } from "@/services/compile/handler";
import { explain } from "@/services/compile/explain";
import { codeIssue } from "@/domain/lessons/codeChecks";
import { buzzerFrequency } from "@/domain/sim/glue/outputs";
import sketches from "@/content/sketches.json" with { type: "json" };
describe("learning scene", () => {
  it("validates actual Wokwi pins, migration and all examples", () => {
    for (const kind of ["blink", "button", "pwm", "serial"])
      expect(isScene(exampleScene(kind))).toBe(true);
    const old = migrateScene(referenceCircuit())!;
    expect(isScene(old)).toBe(true);
    expect(old.wires.some((w) => w.from.pin === "C")).toBe(true);
    expect(migrateScene({})).toBe(null);
    expect(migrateScene(old)).toEqual(old);
  });
  it("rejects invalid scene data", () => {
    for (const patch of [
      { version: 2 },
      { board: "mega" },
      { components: [{ id: "x", type: "<script>" }] },
      { wires: [{ id: "x" }] },
    ])
      expect(isScene({ ...emptyScene(), ...patch })).toBe(false);
    const scene = exampleScene();
    scene.wires[0].from.pin = "missing";
    expect(isScene(scene)).toBe(false);
  });
  it("passes three references and finds missing links, reversed LED and missing resistor", () => {
    for (const kind of ["blink", "button", "pwm"]) {
      const s = exampleScene(kind);
      expect(checkScene(s, s)).toEqual([]);
    }
    const ref = exampleScene();
    const missing = structuredClone(ref);
    missing.wires = [];
    expect(checkScene(missing, ref).length).toBeGreaterThan(0);
    const reversed = structuredClone(ref);
    for (const w of reversed.wires)
      for (const end of [w.from, w.to])
        if (end.componentId === "led") end.pin = end.pin === "A" ? "C" : "A";
    expect(checkScene(reversed, ref).length).toBeGreaterThan(0);
    expect(checkScene(emptyScene(), ref).length).toBe(1);
  });
  it("rejects duplicate or nonexistent pins and detects short circuit", () => {
    const s = exampleScene();
    expect(canWire(s, s.wires[0].from, s.wires[0].to)).toBe(false);
    expect(canWire(s, { componentId: "uno", pin: "no" }, s.wires[0].to)).toBe(
      false,
    );
    expect(shorted(s)).toBe(false);
    s.wires.push({
      id: "short",
      from: { componentId: "uno", pin: "5V" },
      to: { componentId: "uno", pin: "GND.1" },
      color: "#000000",
      bends: [],
    });
    expect(shorted(s)).toBe(true);
    expect(checkScene(s, exampleScene()).length).toBeGreaterThan(0);
  });
});
describe.skipIf(process.env.LEARNING_COVERAGE === "1")(
  "real AVR firmware",
  () => {
    for (const [kind, index] of [
      ["blink", 0],
      ["button", 2],
      ["pwm", 5],
    ] as const)
      it(`executes ${kind}.hex with GPIO, ADC, PWM and Serial`, () => {
        const hex = readFileSync(`tests/fixtures/firmware/${kind}.hex`, "utf8"),
          r = new UnoRunner(hex),
          samples = [];
        const s = exampleScene(kind);
        while (r.time < 3200) {
          applyInputs(r, s, {
            btn: r.time >= 1000 && r.time < 2000 ? 1 : 0,
            pot: 50,
          });
          r.advance(20);
          samples.push(r.sample());
        }
        const result = checkBehavior(learningLessons[index].run.checks, {
          samples,
          serial: r.serial,
        });
        expect(
          result.every((x) => x.pass),
          JSON.stringify({ result, serial: r.serial }),
        ).toBe(true);
      }, 15000);
    it("measures tone frequency from real GPIO transitions", () => {
      const r = new UnoRunner(
        readFileSync("tests/fixtures/firmware/buzzer.hex", "utf8"),
      );
      const scene = exampleScene("buzzer");
      applyInputs(r, scene, {});
      r.advance(100);
      r.sample();
      r.advance(100);
      const data = r.sample();
      expect(buzzerFrequency(scene, "buzzer", data)).toBeCloseTo(1000, -1);
    });
    it(
      "does not pass constant output as blink or button response",
      { timeout: 15000 },
      () => {
        const r = new UnoRunner(
            readFileSync("tests/fixtures/firmware/constant.hex", "utf8"),
          ),
          samples = [];
        while (r.time < 3200) {
          r.advance(20);
          samples.push(r.sample());
        }
        expect(
          checkBehavior(learningLessons[0].run.checks, {
            samples,
            serial: "",
          })[0].pass,
        ).toBe(false);
        expect(
          checkBehavior(learningLessons[2].run.checks, {
            samples,
            serial: "",
          })[0].pass,
        ).toBe(false);
      },
    );
    it("handles empty traces and rejects invalid hex", () => {
      expect(
        checkBehavior(
          [
            { kind: "serialContains", text: "x" },
            { kind: "pwmLevel", pin: 9, min: 1, max: 2 },
          ],
          { samples: [], serial: "" },
        ).every((x) => !x.pass),
      ).toBe(true);
      for (const hex of [
        "",
        ":00000001FE",
        ":0100000001FE",
        ":00000001FF\n:00000001FF",
        "oops",
      ])
        expect(() => loadHex(hex)).toThrow();
    });
  },
);
describe("projects and compiler", () => {
  it("saves, imports safely and enforces project count", () => {
    const store = new LearningStore(null);
    store.load();
    const now = new Date().toISOString(),
      p = {
        id: "p1",
        title: "Test",
        idea: "",
        createdAt: now,
        updatedAt: now,
        scene: exampleScene(),
        code: sketches[0].code,
        thumbnailSvg: thumbnail(exampleScene()),
      };
    expect(isProject(p)).toBe(true);
    store.projects = [];
    expect(store.add(p)).toBe(true);
    const imported = importProject(JSON.stringify({ version: 1, project: p }));
    expect(imported?.id).not.toBe(p.id);
    expect(importProject("{}")).toBeNull();
    expect(importProject("x".repeat(205000))).toBeNull();
    for (let i = 1; i < 20; i++)
      expect(store.add({ ...p, id: `p${i + 1}` })).toBe(true);
    expect(store.add({ ...p, id: "overflow" })).toBe(false);
    expect(store.replace({ ...p, title: "new" })).toBe(true);
    store.remove("p1");
    expect(store.projects.length).toBe(19);
    expect(store.unavailable).toBe(true);
  });
  it("rejects corrupt storage without overwriting it", () => {
    const values = new Map([["arduhub.projects.v1", "bad"]]);
    const store = new LearningStore({
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => {
        values.set(k, v);
      },
      removeItem: (k) => {
        values.delete(k);
      },
    });
    store.load();
    store.save();
    expect(store.corrupt).toBe(true);
    expect(values.get("arduhub.projects.v1")).toBe("bad");
    store.reset();
    expect(store.corrupt).toBe(false);
    expect(
      isDraft({
        scene: exampleScene(),
        code: "",
        step: 3,
        steps: initialSteps(),
      }),
    ).toBe(true);
  });
  it("returns real firmware only for exact trusted cached code, rejects oversized payload, rate limits and handles unavailable compiler", async () => {
    const handler = createCompileHandler();
    const req = (body: unknown) =>
      new Request("http://localhost/api/compile", {
        method: "POST",
        body: JSON.stringify(body),
      });
    expect(
      (await handler(req({ code: sketches[0].code, board: "uno" }))).status,
    ).toBe(200);
    expect(
      (await handler(req({ code: "void loop(){}", board: "uno" }))).status,
    ).toBe(503);
    expect(
      (await handler(req({ code: "x".repeat(16385), board: "uno" }))).status,
    ).toBe(413);
    expect((await handler(req({ code: "x", board: "mega" }))).status).toBe(400);
    for (let i = 0; i < 6; i++) await handler(req({}));
    expect((await handler(req({}))).status).toBe(429);
  });
  it("explains compiler diagnostics and checks code size/blanks", () => {
    for (const msg of [
      "expected ';'",
      "x was not declared",
      "digitalwrite was not declared",
      "expected '}' at end of input",
      "expected '(' before",
      "forbidden header",
      "other",
    ])
      expect(explain(msg).length).toBeGreaterThan(20);
    expect(codeIssue("___")).toBeTruthy();
    expect(codeIssue("x".repeat(16385))).toBeTruthy();
    expect(codeIssue("void loop(){}")).toBeNull();
  });
});
