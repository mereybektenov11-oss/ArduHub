import { describe, it, expect } from "vitest";
import { check } from "@/domain/checker/check";
import {
  referenceCircuit,
  component,
  validLink,
} from "@/domain/checker/netlist";
describe("Circuit graph", () => {
  it("accepts equivalent series orders", () => {
    expect(check(referenceCircuit(), referenceCircuit())).toEqual([]);
    expect(check(referenceCircuit(false, true), referenceCircuit())).toEqual(
      [],
    );
    expect(check(referenceCircuit(true), referenceCircuit(true))).toEqual([]);
  });
  it("finds a bypassed or absent resistor", () => {
    const n = referenceCircuit();
    n.components = n.components.filter((c) => c.type !== "resistor");
    n.links = [
      {
        id: "a",
        from: { componentId: "uno", pin: "13" },
        to: { componentId: "led", pin: "A" },
      },
      {
        id: "b",
        from: { componentId: "led", pin: "K" },
        to: { componentId: "uno", pin: "GND" },
      },
    ];
    expect(check(n, referenceCircuit()).map((e) => e.code)).toContain(
      "missing_resistor",
    );
  });
  it("detects reversed diode and swapped supply", () => {
    const n = referenceCircuit();
    for (const w of n.links)
      for (const p of [w.from, w.to])
        if (p.componentId === "led") p.pin = p.pin === "A" ? "K" : "A";
    expect(check(n, referenceCircuit()).map((e) => e.code)).toContain(
      "led_reversed",
    );
    n.links[0].from.pin = "5V";
    expect(check(n, referenceCircuit()).map((e) => e.code)).toContain(
      "power_ground_swap",
    );
  });
  it("detects shorts, wrong pin, open wires, absent components and warns about extras", () => {
    const n = referenceCircuit();
    n.links[0].from.pin = "12";
    expect(check(n, referenceCircuit())[0].code).toBe("wrong_pin");
    n.links.push({
      id: "short",
      from: { componentId: "uno", pin: "5V" },
      to: { componentId: "uno", pin: "GND" },
    });
    expect(
      check(n, referenceCircuit()).some((e) => e.code === "short_circuit"),
    ).toBe(true);
    n.links = [];
    expect(
      check(n, referenceCircuit()).some((e) => e.code === "open_circuit"),
    ).toBe(true);
    expect(
      check({ components: [], links: [] }, referenceCircuit())[0].code,
    ).toBe("open_circuit");
    const good = referenceCircuit();
    good.components.push(component("button", "extra", 0, 0));
    expect(check(good, referenceCircuit())[0].severity).toBe("warning");
    expect(check(referenceCircuit(), referenceCircuit(true))[0].code).toBe(
      "open_circuit",
    );
  });
  it("rejects self, duplicate and same-net wires", () => {
    const n = referenceCircuit();
    expect(validLink(n, n.links[0].from, n.links[0].from)).toBe(false);
    expect(validLink(n, n.links[0].from, n.links[0].to)).toBe(false);
    expect(
      validLink(
        n,
        { componentId: "uno", pin: "12" },
        { componentId: "led", pin: "A" },
      ),
    ).toBe(true);
  });
});

it("reports an incomplete board-only circuit", () => {
  const n = referenceCircuit();
  n.components = n.components.filter((c) => c.type === "arduino");
  n.links = [];
  expect(check(n, referenceCircuit())[0].code).toBe("open_circuit");
});
