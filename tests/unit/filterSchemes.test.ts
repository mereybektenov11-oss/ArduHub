import { it, expect } from "vitest";
import { ru } from "@/content/ru";
import { filterSchemes, emptyFilters } from "@/lib/filterSchemes";
it("starts with 12 demo schemes", () =>
  expect(filterSchemes(ru.schemes, emptyFilters)).toHaveLength(12));
it("filters by easy difficulty", () =>
  expect(
    filterSchemes(ru.schemes, { ...emptyFilters, level: ["easy"] }),
  ).toHaveLength(5));
it("uses OR within a group and AND across groups", () => {
  const list = filterSchemes(ru.schemes, {
    topic: ["led", "button"],
    level: ["easy"],
    status: ["new"],
  });
  expect(list.map((s) => s.id)).toEqual(["01", "04"]);
});
it("handles empty results", () =>
  expect(
    filterSchemes(ru.schemes, {
      topic: ["led"],
      level: ["hard"],
      status: ["new"],
    }),
  ).toHaveLength(0));
it("has complete content and six topics with no fabricated lesson counts", () => {
  expect(ru.steps).toHaveLength(5);
  expect(ru.faq).toHaveLength(6);
  expect(ru.topics).toHaveLength(6);
  expect(ru.topics.every((t) => t.lessons === null)).toBe(true);
  expect(new Set(ru.schemes.map((s) => s.id)).size).toBe(12);
  for (const entry of [...ru.faq, ...ru.features, ...ru.steps, ...ru.topics])
    expect(
      Object.values(entry)
        .filter((v) => typeof v === "string")
        .every((v) => v.length > 0),
    ).toBe(true);
});
