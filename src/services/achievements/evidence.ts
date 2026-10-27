import { randomUUID } from "node:crypto";
import type { Topic } from "@/domain/types";

/** Server-only producer. Never import into client components or return credentials. */
export async function recordAchievementEvidence(input: {
  userId: string;
  eventId?: string;
  kind: "mentor" | "blitz" | "topic";
  correct?: boolean;
  topic?: Topic;
}): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return false;
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/rpc/record_achievement_event`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_user: input.userId,
          event_id: input.eventId ?? randomUUID(),
          event_kind: input.kind,
          event_correct: input.correct ?? null,
          event_topic: input.topic ?? null,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
