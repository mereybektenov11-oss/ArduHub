import cached from "@arduhub/curriculum/lesson-videos.json" with { type: "json" };
import queries from "@arduhub/curriculum/lesson-video-queries.json" with { type: "json" };
import { createVideoResolver } from "@/services/video/resolve.mjs";
import { createRateLimiter } from "@/lib/rateLimit";
const limiter = createRateLimiter(20);
export const runtime = "nodejs";
const resolver = createVideoResolver({
  key: process.env.YOUTUBE_API_KEY,
  initial: cached,
});
export async function GET(request: Request) {
  const ip = process.env.VERCEL
    ? (request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ??
      "unknown")
    : "local";
  if (!limiter.check(ip))
    return Response.json({ error: "rate_limited" }, { status: 429 });
  const id = new URL(request.url).searchParams.get("lessonId") ?? "";
  if (!Object.hasOwn(queries, id))
    return Response.json({ error: "not_found" }, { status: 404 });
  try {
    const video = await resolver.resolve(
      id,
      queries[id as keyof typeof queries],
    );
    return Response.json(video, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (error) {
    const limited = error instanceof Error && error.message === "quota_guard";
    return Response.json(
      { error: limited ? "quota_guard" : "not_found" },
      { status: limited ? 429 : 404 },
    );
  }
}
