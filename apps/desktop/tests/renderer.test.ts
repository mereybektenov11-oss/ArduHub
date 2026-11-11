import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("__SUPABASE_URL__", "");
vi.stubGlobal("__SUPABASE_ANON_KEY__", "");
const { countDone, loginError } = await import("../src/renderer/auth");
const { parsePrefs } = await import("../src/renderer/prefs");
const { t } = await import("../src/renderer/content");

describe("loginError", () => {
  it("maps Supabase errors to Russian messages", () => {
    expect(loginError(null)).toBeNull();
    expect(loginError({ code: "invalid_credentials" })).toBe(t.login.invalid);
    expect(loginError({ code: "over_request_rate_limit" })).toBe(t.login.rate);
    expect(loginError({ status: 429 })).toBe(t.login.rate);
    expect(loginError({ name: "AuthRetryableFetchError" })).toBe(
      t.login.network,
    );
    expect(loginError({ code: "email_not_confirmed" })).toBe(
      t.login.unconfirmed,
    );
  });
});

describe("countDone", () => {
  it("counts only finished course lessons", () => {
    const data = {
      lessons: {
        "lesson-1": { status: "done" },
        "lesson-2": { status: "current" },
        "lesson-3": { status: "done" },
        "lesson-13": { status: "done" },
      },
    };
    expect(countDone(data, 12)).toBe(2);
    expect(countDone(null, 12)).toBe(0);
    expect(countDone({ lessons: "bad" }, 12)).toBe(0);
  });
});

describe("parsePrefs", () => {
  it("accepts known values and falls back on anything else", () => {
    expect(
      parsePrefs(
        '{"textScale":1.15,"reduceMotion":true,"sounds":false,"volume":0.2}',
      ),
    ).toEqual({
      sounds: false,
      volume: 0.2,
      theme: "system",
      textScale: 1.15,
      reduceMotion: true,
    });
    expect(parsePrefs('{"textScale":3}')).toEqual({
      textScale: 1,
      reduceMotion: false,
      sounds: true,
      volume: 0.5,
      theme: "system",
    });
    expect(parsePrefs("not json")).toEqual({
      textScale: 1,
      reduceMotion: false,
      sounds: true,
      volume: 0.5,
      theme: "system",
    });
    expect(parsePrefs(null)).toEqual({
      textScale: 1,
      reduceMotion: false,
      sounds: true,
      volume: 0.5,
      theme: "system",
    });
  });
});

describe("resolveTheme", async () => {
  const { resolveTheme } = await import("../src/renderer/prefs");
  it("follows Windows only for the system choice", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("keeps a valid stored theme and rejects others", () => {
    expect(parsePrefs('{"theme":"light"}').theme).toBe("light");
    expect(parsePrefs('{"theme":"pink"}').theme).toBe("system");
  });
});
