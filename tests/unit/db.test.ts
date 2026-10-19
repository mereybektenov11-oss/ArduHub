import { afterEach, it, expect, vi } from "vitest";
import { databaseConfigured, saveSignup } from "@/lib/db";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("refuses to claim storage without configuration", async () => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  expect(databaseConfigured()).toBe(false);
  await expect(saveSignup({ email: "a@example.com" })).rejects.toThrow(
    "database_not_configured",
  );
});
it("requires both URL and secret", async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  expect(databaseConfigured()).toBe(false);
  await expect(saveSignup({ email: "a@example.com" })).rejects.toThrow();
});
it.each([
  [[{ id: "test" }], "created"],
  [[], "duplicate"],
] as const)("uses atomic conflict handling for %s", async (rows, result) => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co/");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  const fetch = vi.fn().mockResolvedValue(Response.json(rows));
  vi.stubGlobal("fetch", fetch);
  expect(databaseConfigured()).toBe(true);
  expect(await saveSignup({ email: "a@example.com", role: "school" })).toBe(
    result,
  );
  expect(fetch.mock.calls[0][0]).toBe(
    "https://example.supabase.co/rest/v1/waitlist_signups?on_conflict=email",
  );
  expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    role: "school",
    source: "landing",
    locale: "ru",
  });
});
it.each([
  Response.json({ error: "test" }, { status: 500 }),
  Response.json({ unexpected: true }),
])("rejects database failures", async (response) => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(saveSignup({ email: "a@example.com" })).rejects.toThrow();
});
