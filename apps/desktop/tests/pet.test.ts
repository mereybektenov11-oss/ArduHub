import { describe, expect, it, vi } from "vitest";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";

vi.stubGlobal("__SUPABASE_URL__", "");
vi.stubGlobal("__SUPABASE_ANON_KEY__", "");
const { circuitErrors, hintFor, liveDanger, parseScene } =
  await import("../src/renderer/pet/brain");
const memory = await import("../src/renderer/pet/memory");

const lesson = learningLessons.find((l) => l.id === "lesson-1")!;
const reference = lesson.circuit.referenceScene;
const wire = (id: string, a: string, b: string) => {
  const [ca, pa] = a.split(":");
  const [cb, pb] = b.split(":");
  return {
    id,
    from: { componentId: ca, pin: pa },
    to: { componentId: cb, pin: pb },
    color: "#000",
    bends: [],
  };
};
const scene = (wires: ReturnType<typeof wire>[]): SceneDoc => ({
  ...reference,
  wires,
});

describe("companion brain", () => {
  it("sees no danger in the correct circuit", () => {
    expect(liveDanger(reference)).toBeNull();
    expect(circuitErrors(reference, "lesson-1")).toEqual([]);
  });

  it("stops a short circuit at once, while wiring", () => {
    const short = scene([...reference.wires, wire("s", "uno:5V", "uno:GND.1")]);
    expect(liveDanger(short)).toBe("short_circuit");
    expect(circuitErrors(short, "lesson-1")[0].code).toBe("short_circuit");
  });

  it("puts the dangerous LED-without-resistor first", () => {
    const direct = scene([
      wire("a", "uno:13", "led:A"),
      wire("b", "led:C", "uno:GND.2"),
    ]);
    expect(circuitErrors(direct, "lesson-1")[0].code).toBe("missing_resistor");
  });

  it("reports an open circuit for an unwired board", () => {
    const codes = circuitErrors(scene([]), "lesson-1").map((e) => e.code);
    expect(codes).toEqual(["open_circuit"]);
  });

  it("escalates hints: question, then hint, then the answer", () => {
    const [error] = circuitErrors(
      scene([wire("a", "uno:13", "led:A"), wire("b", "led:C", "uno:GND.2")]),
      "lesson-1",
    );
    expect(hintFor(error, 1)).toContain(error.hint1);
    expect(hintFor(error, 2)).toContain(error.hint2);
    expect(hintFor(error, 3)).toContain(error.answer);
    expect(hintFor(error, 2)).toContain("2-й");
  });

  it("ignores scenes it cannot read", () => {
    expect(parseScene("not json")).toBeNull();
    expect(parseScene('{"components":1}')).toBeNull();
    expect(liveDanger(null)).toBeNull();
  });
});

describe("companion memory", () => {
  it("counts mistakes and recalls the frequent one", () => {
    let m = memory.emptyMemory();
    let count = 0;
    for (let i = 0; i < 3; i++)
      [m, count] = memory.recordMistake(m, "led_reversed", "lesson-1");
    expect(count).toBe(3);
    expect(memory.frequentMistake(m)).toEqual({
      code: "led_reversed",
      count: 3,
    });
  });

  it("keeps the last 30 chat lines and survives bad storage", () => {
    let m = memory.emptyMemory();
    for (let i = 0; i < 40; i++)
      m = memory.addChat(m, { role: i % 2 ? "mentor" : "user", text: `${i}` });
    expect(m.chat).toHaveLength(30);
    expect(m.chat[0].text).toBe("10");
    const back = memory.parseMemory(JSON.stringify(m));
    expect(back.chat).toHaveLength(30);
    expect(memory.parseMemory("{bad").mistakes).toEqual({});
    expect(
      memory.parseMemory(
        '{"v":1,"mistakes":{"x;drop":{"count":2}},"chat":[{"role":"system","text":"hi"}]}',
      ),
    ).toEqual({ v: 1, mistakes: {}, chat: [] });
  });
});
