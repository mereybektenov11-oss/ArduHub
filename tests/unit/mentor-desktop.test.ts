import { afterEach, describe, expect, it, vi } from "vitest";

// The route reads cookies only for site requests; desktop requests use the
// bearer token. Supabase is not configured here, so no network is used.
vi.mock("@/lib/supabase/server", () => ({ serverSupabase: async () => null }));
const route = await import("@/app/api/mentor/route");

const token = "a".repeat(24) + "." + "b".repeat(24) + "." + "c".repeat(24);
const post = (headers: Record<string, string>) =>
  new Request("http://localhost/api/mentor", {
    method: "POST",
    body: JSON.stringify({ mentorId: "volt", message: "Зачем резистор?" }),
    headers: { "Content-Type": "application/json", ...headers },
  });

afterEach(() => vi.unstubAllEnvs());

describe("AI mentor route for the desktop app", () => {
  it("answers the preflight only for app://arduhub", async () => {
    const ok = await route.OPTIONS(
      new Request("http://localhost/api/mentor", {
        method: "OPTIONS",
        headers: { origin: "app://arduhub" },
      }),
    );
    expect(ok.status).toBe(204);
    expect(ok.headers.get("access-control-allow-origin")).toBe("app://arduhub");
    expect(ok.headers.get("access-control-allow-headers")).toContain(
      "authorization",
    );
    const other = await route.OPTIONS(
      new Request("http://localhost/api/mentor", {
        method: "OPTIONS",
        headers: { origin: "https://evil.example" },
      }),
    );
    expect(other.status).toBe(403);
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("refuses foreign origins and the app origin without a token", async () => {
    expect(
      (await route.POST(post({ origin: "https://evil.example" }))).status,
    ).toBe(403);
    expect(
      (
        await route.POST(
          post({
            origin: "https://evil.example",
            authorization: `Bearer ${token}`,
          }),
        )
      ).status,
    ).toBe(403);
    expect((await route.POST(post({ origin: "app://arduhub" }))).status).toBe(
      403,
    );
    expect(
      (
        await route.POST(
          post({ origin: "app://arduhub", authorization: "Bearer short" }),
        )
      ).status,
    ).toBe(403);
  });

  it("serves the app with CORS and without the site's session cookie", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const res = await route.POST(
      post({ origin: "app://arduhub", authorization: `Bearer ${token}` }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "app://arduhub",
    );
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).toContain("резистор");
  });
});
