import { normalizeEmail, validRole } from "@/lib/validators";
import { waitlistLimiter } from "@/lib/rateLimit";
import { saveSignup } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const respond = (body: object, status: number) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    : "local";
  if (!waitlistLimiter.check(ip))
    return respond({ ok: false, error: "rate_limited" }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ ok: false, error: "invalid_email" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return respond({ ok: false, error: "invalid_email" }, 400);
  const data = body as Record<string, unknown>;
  if (typeof data.website === "string" && data.website)
    return respond({ ok: true }, 200);
  const email = normalizeEmail(data.email);
  if (!email) return respond({ ok: false, error: "invalid_email" }, 400);
  if (data.role !== undefined && !validRole(data.role))
    return respond({ ok: false, error: "invalid_role" }, 400);
  try {
    const result = await saveSignup({
      email,
      role: validRole(data.role) ? data.role : undefined,
    });
    return respond({ ok: true }, result === "created" ? 201 : 200);
  } catch {
    return respond({ ok: false, error: "server_error" }, 500);
  }
}
