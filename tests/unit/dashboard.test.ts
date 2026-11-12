import { sameOrigin } from "@/lib/requestOrigin";
import { readEnv } from "@/lib/env";
import { describe, it, expect } from "vitest";
import { createProgress } from "@/domain/seed";
import { mergeProgress } from "@/domain/progress/merge";
import { freezeStreak } from "@/domain/progress/streak";
import { buyLocal } from "@/domain/shop";
import {
  claimDaily,
  recordDaily,
  millisecondsToReset,
  dayInZone,
} from "@/domain/missions";
import { validateRegistration } from "@/domain/auth";
import { searchCabinet } from "@/domain/search";
import { progressEvidence } from "../helpers/progressEvidence";
describe("Dashboard rules", () => {
  it("merges completed lessons without moving guest balances", () => {
    const guest = createProgress(),
      account = createProgress();
    guest.lessons["lesson-1"] = {
      ...guest.lessons["lesson-1"],
      ...progressEvidence("lesson-1"),
      status: "done",
    };
    guest.sparks = 100;
    guest.mentor.tokens = 100;
    account.lessons["lesson-2"] = {
      ...account.lessons["lesson-2"],
      ...progressEvidence("lesson-2"),
      status: "done",
    };
    account.sparks = 25;
    const m = mergeProgress(guest, account);
    expect(m.lessons["lesson-1"].status).toBe("done");
    expect(m.lessons["lesson-2"].status).toBe("done");
    expect(m.sparks).toBe(25);
    expect(m.mentor.tokens).toBe(50);
  });
  it("validates mismatch, short passwords, nick and consent", () => {
    const valid = {
      name: "Робот",
      password: "password1",
      repeat: "password1",
      consent: true,
    };
    expect(validateRegistration(valid)).toBeNull();
    for (const patch of [
      { repeat: "different" },
      { password: "short" },
      { name: "a".repeat(21) },
      { consent: false },
    ])
      expect(validateRegistration({ ...valid, ...patch })).toBeTruthy();
  });
  it("uses timezone date and handles DST midnight", () => {
    expect(dayInZone(new Date("2026-10-17T22:00:00Z"), "Asia/Almaty")).toBe(
      "2026-10-18",
    );
    const now = new Date("2026-03-08T05:00:00Z");
    expect(millisecondsToReset(now, "America/New_York") / 3600000).toBeCloseTo(
      23,
      2,
    );
  });
  it("claims complete daily missions once and resets tomorrow", () => {
    const now = new Date("2026-10-17T10:00:00Z");
    let p = createProgress();
    const n = structuredClone(p);
    n.lessons["lesson-1"] = { status: "done", attempts: 1, bestErrors: 0 };
    n.xp = 50;
    p = recordDaily(p, n, now);
    p = claimDaily(p, now);
    expect(p.sparks).toBe(10);
    expect(p.mentor.tokens).toBe(55);
    expect(claimDaily(p, now)).toBe(p);
    expect(claimDaily(p, new Date("2026-10-18T10:00:00Z"))).toBe(p);
  });
  it("does not reward mistakes as a first attempt success", () => {
    const before = createProgress();
    const after = structuredClone(before);
    after.lessons["lesson-1"] = { status: "done", attempts: 2, bestErrors: 0 };
    expect(recordDaily(before, after).daily?.perfect).toBe(false);
  });
  it("purchases once, cannot overdraw and applies token effects", () => {
    const start = createProgress();
    start.sparks = 100;
    const p = buyLocal(start, "freeze");
    expect(p.sparks).toBe(60);
    expect(p.boosts?.freeze).toBe(1);
    expect(buyLocal(p, "freeze")).toBe(p);
    expect(buyLocal(p, "shina")).toBe(p);
    expect(buyLocal(p, "tokens").mentor.tokens).toBe(60);
  });
  it("freezes exactly one missing day and consumes once", () => {
    expect(freezeStreak(createProgress())).toEqual(createProgress());
    const legacy = createProgress();
    legacy.streak = { count: 7, lastActiveDate: "2026-10-15" };
    expect(freezeStreak(legacy, "2026-10-17")).toBe(legacy);
    const start = createProgress();
    start.streak = { count: 7, lastActiveDate: "2026-10-15" };
    start.boosts = { freeze: 1, hints: 0 };
    const p = freezeStreak(start, "2026-10-17");
    expect(p.streak).toEqual({ count: 7, lastActiveDate: "2026-10-16" });
    expect(p.boosts?.freeze).toBe(0);
    expect(freezeStreak(p, "2026-10-17")).toBe(p);
    expect(freezeStreak(start, "2026-10-18")).toBe(start);
  });
  it("searches lessons and terms, including resistor", () => {
    expect(
      searchCabinet("резистор").some((r) => r.group === 0 || r.group === 1),
    ).toBe(true);
    expect(searchCabinet("несуществующийзапрос")).toHaveLength(0);
  });
  it("matches browser Origin to the actual Host behind Next proxy", () => {
    expect(
      sameOrigin(
        new Request("http://localhost:3100/api/auth/guest", {
          headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
        }),
      ),
    ).toBe(true);
    expect(
      sameOrigin(
        new Request("http://localhost:3100/api/auth/guest", {
          headers: { host: "127.0.0.1:3100", origin: "https://other.example" },
        }),
      ),
    ).toBe(false);
  });
  it("allows guest configuration and rejects incomplete mandatory auth configuration", () => {
    expect(readEnv({})).toBeTruthy();
    expect(() => readEnv({ AUTH_REQUIRED: "true" })).toThrow(/Supabase/);
  });
});
