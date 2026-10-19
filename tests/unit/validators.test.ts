import { describe, it, expect } from "vitest";
import { normalizeEmail, validRole } from "@/lib/validators";
describe("email and role", () => {
  it.each([
    "",
    undefined,
    null,
    10,
    "abc",
    "a@b",
    "a b@example.com",
    "a@@example.com",
    "a@example..com",
    "a@-example.com",
    "a@exam_ple.com",
    "x".repeat(255) + "@example.com",
  ])("rejects invalid input %s", (v) => expect(normalizeEmail(v)).toBeNull());
  it("normalizes surrounding whitespace and case", () =>
    expect(normalizeEmail("  STUDENT+One@EXAMPLE.COM  ")).toBe(
      "student+one@example.com",
    ));
  it.each(["student", "teacher", "school", "parent", "other"])(
    "accepts %s role",
    (v) => expect(validRole(v)).toBe(true),
  );
  it.each([undefined, null, 7, "admin"])("rejects unknown role %s", (v) =>
    expect(validRole(v)).toBe(false),
  );
});
