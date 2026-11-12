import { sameOrigin } from "@/lib/requestOrigin";
import { serverSupabase } from "@/lib/supabase/server";
import { blitzDeck, diagnosticDeck, matchDeck } from "@/content/cabinet.ru";
import { games } from "@/domain/seed";
import { recordAchievementEvidence } from "@/services/achievements/evidence";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (body: object, status: number) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return reply({ error: "forbidden" }, 403);
  const client = await serverSupabase();
  const user = client && (await client.auth.getUser()).data.user;
  if (!user) return reply({ error: "unauthorized" }, 401);
  if (request.headers.get("X-ArduHub-User") !== user.id)
    return reply({ error: "forbidden" }, 403);
  let body;
  try {
    const text = await request.text();
    if (text.length > 2048) return reply({ error: "bad_request" }, 400);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  if (
    !body ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.attemptId ?? "",
    ) ||
    !Number.isInteger(body.questionIndex) ||
    body.questionIndex < 0 ||
    body.questionIndex > 5
  )
    return reply({ error: "bad_request" }, 400);
  const game = games.find((g) => g.id === body.gameId);
  if (!game) return reply({ error: "bad_request" }, 400);
  let correct: boolean;
  if (game.kind === "blitz") {
    const pair = body.pair;
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      pair.some(
        (p) =>
          typeof p !== "string" ||
          !["13", "5V", "GND", "A", "K", "R1"].includes(p),
      )
    )
      return reply({ error: "bad_request" }, 400);
    correct =
      [...pair].sort().join("|") ===
      [...blitzDeck[body.questionIndex % blitzDeck.length].pair]
        .sort()
        .join("|");
  } else if (game.kind === "findbug") {
    const question = diagnosticDeck[5 + (body.questionIndex % 3)];
    if (
      !Number.isInteger(body.option) ||
      body.option < 0 ||
      body.option >= question.options.length
    )
      return reply({ error: "bad_request" }, 400);
    correct = body.option === question.correct;
  } else {
    if (
      !Array.isArray(body.match) ||
      body.match.length !== 2 ||
      body.match.some(
        (i: unknown) =>
          !Number.isInteger(i) ||
          Number(i) < 0 ||
          Number(i) >= matchDeck.length,
      )
    )
      return reply({ error: "bad_request" }, 400);
    correct = body.match[0] === body.match[1];
  }
  const recorded = await recordAchievementEvidence({
    userId: user.id,
    eventId: body.attemptId,
    kind: game.kind === "blitz" ? "blitz" : "topic",
    correct,
    topic: game.topic,
  });
  return recorded
    ? reply({ ok: true }, 200)
    : reply({ error: "unavailable" }, 503);
}
