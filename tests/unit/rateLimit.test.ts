import { it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rateLimit";
it("allows five requests, rejects the sixth and keeps IPs independent", () => {
  const l = createRateLimiter();
  for (let i = 0; i < 5; i++) expect(l.check("a", 0)).toBe(true);
  expect(l.check("a", 10)).toBe(false);
  expect(l.check("b", 10)).toBe(true);
});
it("expires old buckets and can reset", () => {
  const l = createRateLimiter(1, 60);
  expect(l.check("a", 0)).toBe(true);
  expect(l.check("a", 59)).toBe(false);
  expect(l.check("a", 60)).toBe(true);
  l.clear();
  expect(l.check("a", 61)).toBe(true);
  expect(l.check("b")).toBe(true);
});
