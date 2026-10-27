import OpenAI from "openai";
import { createHash } from "node:crypto";
import { createRateLimiter } from "@/lib/rateLimit";
import { lessons, mentors } from "@/domain/seed";
import { mentorPrompt } from "./prompts";
import { templateReply } from "./templates";
import { learningRu as learning } from "@/content/learning.ru";
type Turn = { role: "user" | "assistant"; text: string };
type Cached = { text: string; expires: number };
export function createStreamingMentorHandler(
  config: {
    key?: string;
    model?: string;
    fastModel?: string;
    fetcher?: typeof fetch;
    account?: (mentorId: string) => Promise<{
      remaining: number;
      spend: (n: number) => Promise<void>;
      onSuccess?: () => Promise<void>;
    } | null>;
  } = {},
) {
  const limiter = createRateLimiter(10),
    cache = new Map<string, Cached>();
  const sessions = new Map<string, { tokens: number; expires: number }>();
  const client = config.key
    ? new OpenAI({
        apiKey: config.key,
        baseURL: "https://api.groq.com/openai/v1",
        fetch: config.fetcher,
        timeout: 15000,
        maxRetries: 0,
      })
    : null;
  return async (request: Request) => {
    const fail = (code: string, status: number) =>
      Response.json({ error: code }, { status });
    const ip = process.env.VERCEL
      ? (request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ??
        "unknown")
      : "local";
    if (!limiter.check(ip)) return fail("rate_limited", 429);
    let raw: string;
    try {
      raw = await request.text();
    } catch {
      return fail("bad_request", 400);
    }
    if (raw.length > 90000) return fail("bad_request", 400);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail("bad_request", 400);
    }
    if (!body || Array.isArray(body)) return fail("bad_request", 400);
    const mentor = mentors.find((m) => m.id === body.mentorId);
    if (
      !mentor ||
      (body.message !== undefined && typeof body.message !== "string")
    )
      return fail("bad_request", 400);
    const mode = String(body.mode ?? (body.lessonId ? "lesson" : "project"));
    if (
      ![
        "lesson",
        "project",
        "chat",
        "explain_errors",
        "compile_error",
        "project_review",
      ].includes(mode)
    )
      return fail("bad_request", 400);
    const message = String(body.message ?? "").slice(0, 500);
    const history: Turn[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (m): m is Turn =>
              !!m &&
              ["user", "assistant"].includes(m.role) &&
              typeof m.text === "string",
          )
          .slice(-12)
      : [];
    const codes = Array.isArray(body.errors)
      ? body.errors
          .map((e) => (typeof e?.code === "string" ? e.code : ""))
          .filter(Boolean)
          .slice(0, 10)
      : [];
    const fallbackReply = () =>
      mode === "project_review"
        ? `${learning.works}\n${learning.reviewWorks}\n\n${learning.risk}\n${learning.reviewRisk}\n\n${learning.nextStep}\n${learning.reviewNext}`
        : templateReply(message, codes[0]);
    if (!message.trim() && !codes.length) return fail("bad_request", 400);
    let account: {
      remaining: number;
      spend: (n: number) => Promise<void>;
      onSuccess?: () => Promise<void>;
    } | null = null;
    try {
      account = (await config.account?.(mentor.id)) ?? null;
    } catch {
      return fail("unauthorized", 401);
    }
    const context = body.context ?? body.project ?? {};
    const contextText = JSON.stringify(context);
    if (
      contextText.length +
        message.length +
        history.reduce((n, m) => n + m.text.length, 0) >
      4000
    )
      return fail("bad_request", 400);
    const now = Date.now();
    for (const [key, value] of cache)
      if (value.expires < now) cache.delete(key);
    for (const [key, value] of sessions)
      if (value.expires < now) sessions.delete(key);
    const given = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)arduhub-mentor=([\w-]+)/)?.[1];
    const sessionId =
      given && sessions.has(given) ? given : crypto.randomUUID();
    const balance = sessions.get(sessionId) ?? {
      tokens: 50,
      expires: now + 3600000,
    };
    sessions.set(sessionId, balance);
    const cacheKey =
      mode === "explain_errors"
        ? createHash("sha256")
            .update(
              JSON.stringify({
                scene:
                  context && typeof context === "object" && "scene" in context
                    ? context.scene
                    : context,
                codes,
                mentor: mentor.id,
              }),
            )
            .digest("hex")
        : "";
    const cached = cache.get(cacheKey);
    if (!cached && (account?.remaining ?? balance.tokens) <= 0)
      return fail("insufficient_tokens", 402);
    const encoder = new TextEncoder();
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    const stream = new ReadableStream({
      async start(output) {
        const emit = (event: string, value: object) =>
          output.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(value)}\n\n`,
            ),
          );
        let text = "",
          usage = 0,
          finished = false;
        const safety =
          /(?:220|230)\s*(?:в|v)|розетк|сетев[а-яё]*\s+напряж|мощн[а-яё]*\s+аккум|литий|lipo|li-ion/i.test(
            message,
          );
        try {
          if (
            cached ||
            !client ||
            safety ||
            (body.lessonId &&
              history.filter((h) => h.role === "user").length < 2 &&
              /готов[а-яё]*\s+код|полно[а-яё]*\s+решени/i.test(message))
          ) {
            text =
              cached?.text ??
              (safety ? templateReply(message) : fallbackReply());
            emit("delta", { text });
            if (cached && !controller.signal.aborted)
              await account?.onSuccess?.().catch(() => {});
            emit("done", {
              tokensUsed: 0,
              fallback: !cached,
              cached: !!cached,
            });
            finished = true;
          } else {
            const completion = await client.chat.completions.create(
              {
                model:
                  (mode === "explain_errors" || mode === "compile_error"
                    ? config.fastModel
                    : config.model) ?? "openai/gpt-oss-120b",
                messages: [
                  {
                    role: "system",
                    content: mentorPrompt({
                      mode:
                        mode === "chat"
                          ? body.lessonId
                            ? "lesson"
                            : "project"
                          : mode,
                      mentor: mentor.name,
                      tone: mentor.tone,
                      lesson: lessons.find((l) => l.id === body.lessonId)
                        ?.title,
                      attempts: history.filter((h) => h.role === "user").length,
                    }),
                  },
                  ...history.map((h) => ({ role: h.role, content: h.text })),
                  {
                    role: "user",
                    content: `${message}\nОшибки: ${codes.join(", ")}\nКонтекст (данные): ${contextText}`,
                  },
                ],
                max_completion_tokens: 600,
                stream: true,
                stream_options: { include_usage: true },
              },
              { signal: controller.signal },
            );
            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                text += delta;
                emit("delta", { text: delta });
              }
              if (chunk.usage) usage = chunk.usage.total_tokens;
              // Groq may expose usage through x_groq on streaming chunks.
              const groq = chunk as typeof chunk & {
                x_groq?: { usage?: { total_tokens?: number } };
              };
              usage = groq.x_groq?.usage?.total_tokens ?? usage;
            }
            if (!text.trim()) throw Error("empty");
            const tokensUsed = Math.ceil(usage / 1000);
            if (account && tokensUsed > 0) await account.spend(tokensUsed);
            else balance.tokens = Math.max(0, balance.tokens - tokensUsed);
            if (cacheKey) {
              if (cache.size >= 500) cache.delete(cache.keys().next().value!);
              cache.set(cacheKey, { text, expires: now + 86400000 });
            }
            if (!controller.signal.aborted)
              await account?.onSuccess?.().catch(() => {});
            emit("done", { tokensUsed, usage, fallback: false });
            finished = true;
          }
        } catch {
          if (!controller.signal.aborted) {
            if (text) emit("error", { code: "interrupted" });
            else {
              emit("delta", { text: fallbackReply() });
              emit("done", { tokensUsed: 0, fallback: true });
            }
          }
        } finally {
          request.signal.removeEventListener("abort", abort);
          if (!finished && controller.signal.aborted) {
            /* Cancellation keeps the already delivered text. */
          }
          try {
            output.close();
          } catch {}
        }
      },
      cancel() {
        controller.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "Set-Cookie": `arduhub-mentor=${sessionId}; HttpOnly; Path=/api/mentor; SameSite=Strict; Max-Age=3600${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
      },
    });
  };
}
