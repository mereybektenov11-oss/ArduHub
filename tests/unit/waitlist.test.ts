import { beforeEach, afterEach, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ saveSignup: vi.fn() }));
import { POST } from "@/app/api/waitlist/route";
import { saveSignup } from "@/lib/db";
import { waitlistLimiter } from "@/lib/rateLimit";
const save = vi.mocked(saveSignup);
function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  waitlistLimiter.clear();
  save.mockReset();
  vi.stubEnv("VERCEL", "");
});
afterEach(() => vi.unstubAllEnvs());
it("creates a normalized signup and forwards school role", async () => {
  save.mockResolvedValue("created");
  const response = await POST(
    request({ email: "TEST@EXAMPLE.COM", role: "school" }),
  );
  expect(response.status).toBe(201);
  expect(save).toHaveBeenCalledWith({
    email: "test@example.com",
    role: "school",
  });
  expect(await response.json()).toEqual({ ok: true });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("accepts duplicate without disclosing membership in response body", async () => {
  save.mockResolvedValue("duplicate");
  const response = await POST(request({ email: "test@example.com" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
it("does not save a honeypot request", async () => {
  const response = await POST(
    request({ email: "test@example.com", website: "bot" }),
  );
  expect(response.status).toBe(200);
  expect(save).not.toHaveBeenCalled();
});
it.each([
  null,
  [],
  "text",
  {},
  { email: "abc" },
  { email: "test@example.com", role: "admin" },
])("validates request %s", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(save).not.toHaveBeenCalled();
});
it("handles malformed JSON", async () =>
  expect(
    (
      await POST(
        new Request("http://localhost/api/waitlist", {
          method: "POST",
          body: "{",
        }),
      )
    ).status,
  ).toBe(400));
it("handles unavailable database", async () => {
  save.mockRejectedValue(new Error("db"));
  expect(
    (await POST(request({ email: "test@example.com", website: 1 }))).status,
  ).toBe(500);
});
it("rejects the sixth request", async () => {
  save.mockResolvedValue("duplicate");
  for (let i = 0; i < 5; i++)
    expect(
      (await POST(request({ email: "test@example.com", website: "" }))).status,
    ).toBe(200);
  const r = await POST(request({ email: "test@example.com" }));
  expect(r.status).toBe(429);
  expect(await r.json()).toEqual({ ok: false, error: "rate_limited" });
});
it("uses trusted Vercel IPs and treats missing IP as unknown", async () => {
  vi.stubEnv("VERCEL", "1");
  save.mockResolvedValue("created");
  expect(
    (
      await POST(
        request(
          { email: "a@example.com" },
          { "x-vercel-forwarded-for": "10.0.0.1, 10.0.0.2" },
        ),
      )
    ).status,
  ).toBe(201);
  expect((await POST(request({ email: "a@example.com" }))).status).toBe(201);
  expect(
    (
      await POST(
        request({ email: "a@example.com" }, { "x-vercel-forwarded-for": "" }),
      )
    ).status,
  ).toBe(201);
});
