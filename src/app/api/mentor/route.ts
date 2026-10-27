import { sameOrigin } from "@/lib/requestOrigin";
import { createStreamingMentorHandler } from "@/services/mentor/stream";
import { serverSupabase } from "@/lib/supabase/server";
import { recordAchievementEvidence } from "@/services/achievements/evidence";
export const runtime = "nodejs";
const handler = createStreamingMentorHandler({
  key: process.env.GROQ_API_KEY,
  model: process.env.MENTOR_MODEL || "openai/gpt-oss-120b",
  fastModel: process.env.MENTOR_MODEL_FAST || "openai/gpt-oss-20b",
  async account(mentorId) {
    const client = await serverSupabase();
    if (!client) return null;
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return null;
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

export async function POST(request: Request) {
  if (request.headers.has("origin") && !sameOrigin(request))
    return Response.json({ error: "forbidden" }, { status: 403 });
  return handler(request);
}
