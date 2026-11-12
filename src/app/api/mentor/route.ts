import { createClient } from "@supabase/supabase-js";
import { sameOrigin } from "@/lib/requestOrigin";
import { createStreamingMentorHandler } from "@/services/mentor/stream";
import { serverSupabase } from "@/lib/supabase/server";
import { recordAchievementEvidence } from "@/services/achievements/evidence";
export const runtime = "nodejs";

// The ArduHub desktop app (Electron, page origin app://arduhub) calls this
// route with the learner's Supabase access token instead of site cookies.
// Only that exact origin gets CORS, and only together with a bearer token;
// the token itself is verified by Supabase like any session.
const DESKTOP_ORIGIN = "app://arduhub";

function bearer(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(value);
  return match?.[1] ?? null;
}
const fromDesktop = (request: Request) =>
  request.headers.get("origin") === DESKTOP_ORIGIN && bearer(request) !== null;

async function clientFor(request: Request) {
  const token = bearer(request);
  if (!token) return serverSupabase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const handler = createStreamingMentorHandler({
  key: process.env.GROQ_API_KEY,
  model: process.env.MENTOR_MODEL || "openai/gpt-oss-120b",
  fastModel: process.env.MENTOR_MODEL_FAST || "openai/gpt-oss-20b",
  async account(mentorId, request) {
    const client = await clientFor(request);
    if (!client) return null;
    const token = bearer(request);
    const {
      data: { user },
    } = token ? await client.auth.getUser(token) : await client.auth.getUser();
    if (!user) {
      // A desktop request must carry a valid session.
      if (token) throw Error("unauthorized");
      return null;
    }
    const { data, error } = await client
      .from("profiles")
      .select("mentor_tokens,inventory")
      .eq("id", user.id)
      .single();
    if (
      error ||
      !data ||
      (mentorId !== "volt" && !data.inventory.includes(mentorId))
    )
      throw Error("unauthorized");
    return {
      remaining: data.mentor_tokens,
      async onSuccess() {
        await recordAchievementEvidence({ userId: user.id, kind: "mentor" });
      },
      async spend(n) {
        const { error } = await client.rpc("spend_mentor_tokens", { n });
        if (error) throw error;
      },
    };
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": DESKTOP_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "600",
  Vary: "Origin",
};

export async function OPTIONS(request: Request) {
  return request.headers.get("origin") === DESKTOP_ORIGIN
    ? new Response(null, { status: 204, headers: corsHeaders })
    : new Response(null, { status: 403 });
}

export async function POST(request: Request) {
  const desktop = fromDesktop(request);
  if (request.headers.has("origin") && !sameOrigin(request) && !desktop)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const response = await handler(request);
  if (!desktop) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  headers.delete("Set-Cookie");
  return new Response(response.body, { status: response.status, headers });
}
