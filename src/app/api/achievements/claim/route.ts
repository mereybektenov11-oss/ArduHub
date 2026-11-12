import { sameOrigin } from "@/lib/requestOrigin";
import { serverSupabase } from "@/lib/supabase/server";
import { achievementDeck } from "@/content/achievements.ru";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403 });
  const client = await serverSupabase();
  if (!client) return Response.json({ error: "unauthorized" }, { status: 401 });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || !achievementDeck.some((item) => item.id === body.id))
    return Response.json({ error: "bad_request" }, { status: 400 });
  const { data, error } = await client.rpc("claim_achievement", {
    achievement_id: body.id,
  });
  if (error)
    return Response.json(
      {
        error: error.message.includes("achievement_locked")
          ? "achievement_locked"
          : "unavailable",
      },
      { status: error.message.includes("achievement_locked") ? 409 : 503 },
    );
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
