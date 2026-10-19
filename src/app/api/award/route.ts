import { sameOrigin } from "@/lib/requestOrigin";
import { serverSupabase } from "@/lib/supabase/server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403 });
  const client = await serverSupabase();
  if (!client) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await client.auth.getUser();
  if (!data.user)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (
    !body ||
    !["lesson", "mission", "game"].includes(body.source) ||
    typeof body.refId !== "string" ||
    body.refId.length > 100 ||
    !Number.isInteger(body.amount) ||
    body.amount < 1 ||
    body.amount > 100
  )
    return Response.json({ error: "bad_request" }, { status: 400 });
  const { data: result, error } = await client.rpc("award", {
    source: body.source,
    ref_id: body.refId,
    amount: body.amount,
  });
  if (error) {
    const code =
      ["already_awarded", "daily_cap", "mission_incomplete"].find((code) =>
        error.message.includes(code),
      ) ?? "bad_request";
    return Response.json(
      { error: code },
      {
        status:
          code === "already_awarded" ? 409 : code === "daily_cap" ? 429 : 400,
      },
    );
  }
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
