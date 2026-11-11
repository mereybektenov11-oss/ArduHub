import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { normalizeCode } from "@arduhub/arduino-core/compile/normalize";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { projectIdeas } from "@/domain/projects/ideas";
import fixtures from "@/services/compile/fixtures.json";
describe("trusted HEX cache", () => {
  it("ignores comments and formatting, keeps literals, operators and directives", () => {
    expect(
      normalizeCode("void setup(){/* hi */pinMode(13, OUTPUT);} // note"),
    ).toBe(normalizeCode("void setup( ) { pinMode ( 13 ,OUTPUT ) ; }"));
    expect(normalizeCode('Serial.println("a b");')).not.toBe(
      normalizeCode('Serial.println("ab");'),
    );
    expect(normalizeCode("a + + b")).not.toBe(normalizeCode("a++b"));
    expect(normalizeCode("#define X 1\nX")).not.toBe(
      normalizeCode("#define X 1 X"),
    );
    expect(normalizeCode('Serial.println(R"tag(a // b)tag");')).not.toBe(
      normalizeCode('Serial.println(R"tag(a )tag");'),
    );
  });
  it("contains every lesson reference solution and all trusted sketches", () => {
    const index = JSON.parse(readFileSync("public/hex/index.json", "utf8"));
    for (const code of [
      ...learningLessons.map((l) => l.code.solution),
      ...projectIdeas.map((i) => i.code),
      ...fixtures.map((f) => f.code),
    ]) {
      const hash = createHash("sha256")
        .update(normalizeCode(code))
        .digest("hex");
      expect(index.entries[hash], code).toBeTruthy();
      expect(
        readFileSync("public" + index.entries[hash].path, "utf8"),
      ).toContain(":00000001FF");
    }
  });
});
