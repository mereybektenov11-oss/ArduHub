import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/compile/cache", () => ({
  cachedHex: vi.fn(async () => null as string | null),
}));
import { compile } from "@/services/compile/client";
import { cachedHex } from "@/services/compile/cache";
import {
  recordCompileAttempt,
  matchesSolution,
} from "@/domain/lessons/solutions";
import { createProgress } from "@/domain/seed";
import { awardLesson } from "@/domain/progress/xp";
import { completeEvidence } from "../helpers/progressEvidence";
import { learningLessons } from "@/domain/lessons/content";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(cachedHex).mockResolvedValue(null);
});
describe("launch routing and outage fallback", () => {
  it("runs simple edited code without a compiler request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const code =
      "void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);delay(500);digitalWrite(13,LOW);delay(500);}";
    expect(await compile(code)).toMatchObject({
      source: "interpreter",
      interpreterCode: code,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("prefers compiled solutions, and sends unsupported code to the actual service", async () => {
    vi.mocked(cachedHex).mockResolvedValueOnce(":00000001FF");
    expect((await compile("void setup(){}void loop(){}")).source).toBe(
      "precompiled",
    );
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "compiler_unconfigured" }), {
          status: 503,
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await compile("#include <Servo.h>\nvoid setup(){}void loop(){}")).error,
    ).toBe("compiler_unconfigured");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("counts only consecutive server outages, resets on code errors or success", () => {
    let n = 0;
    for (let i = 0; i < 3; i++)
      n = recordCompileAttempt(n, { error: "compiler_unreachable" });
    expect(n).toBe(3);
    expect(recordCompileAttempt(n, { error: "compile_error" })).toBe(0);
    expect(
      recordCompileAttempt(n, { interpreterCode: "x", source: "interpreter" }),
    ).toBe(0);
    expect(recordCompileAttempt(n, { error: "rate_limited" })).toBe(0);
  });
  it("normalizes valid solution variants without accepting a different program", () => {
    expect(
      matchesSolution(
        "lesson-2",
        "// note\n" + learningLessons[1].code.solution,
      ),
    ).toBe(true);
    expect(matchesSolution("lesson-2", "void setup(){}void loop(){}")).toBe(
      false,
    );
    expect(
      matchesSolution(
        "lesson-2",
        learningLessons[1].code.solution.replace(/delay\(250\)/g, "delay(500)"),
      ),
    ).toBe(false);
  });
  it("grants a single half reward for matched outage completion", () => {
    const p = createProgress();
    p.lessons["lesson-1"] = {
      ...p.lessons["lesson-1"],
      ...completeEvidence("lesson-1"),
    };
    const next = awardLesson(p, "lesson-1", "lesson_fallback");
    expect([next.xp, next.sparks]).toEqual([15, 5]);
    expect(awardLesson(next, "lesson-1").xp).toBe(15);
  });
});
