import { it, expect } from "vitest";
import { explain } from "@/services/compile/explain";
it("all compiler explanations", () => {
  const messages = [
    "expected ';' before token",
    "undeclared variable",
    "expected '}' at end of input",
    "expected '(' before token",
    "digitalwrite was not declared",
    "header is forbidden",
    "unknown error",
  ];
  expect(new Set(messages.map(explain)).size).toBe(7);
});
