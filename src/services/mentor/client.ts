import { templateReply } from "./templates";
import type { CheckError } from "@arduhub/arduino-core/types";
import type { SceneDoc } from "@arduhub/arduino-core/scene/scene";
import { learningRu as learning } from "@arduhub/curriculum/learning.ru";
import { shorted } from "@arduhub/arduino-core/scene/netlist";
import { explain } from "@/services/compile/explain";
export type MentorInput = {
  mentorId: string;
  mode?:
    | "lesson"
    | "project"
    | "explain_errors"
    | "chat"
    | "compile_error"
    | "project_review";
  context?: {
    step?: string;
    scene?: string;
    code?: string;
    errors?: string[];
    level?: number;
  };
  project?: { scene: SceneDoc; code: string; observed: boolean };
  lessonId?: string;
  errors?: CheckError[];
  message?: string;
  history?: { role: string; text: string }[];
};
function fallbackReply(input: MentorInput) {
  return input.mode === "project_review" && input.project
    ? `${learning.works}\n${learning.reviewWorks}\n\n${learning.risk}\n${shorted(input.project.scene) ? learning.checks.short : learning.reviewRisk}\n\n${learning.nextStep}\n${learning.reviewNext}`
    : input.mode === "compile_error"
      ? explain(input.message ?? "")
      : templateReply(input.message, input.errors?.[0]?.code);
}
export async function askMentor(
  input: MentorInput,
  options: {
    signal?: AbortSignal;
    onDelta?: (text: string) => void;
    templateOnly?: boolean;
  } = {},
): Promise<{
  reply: string;
  fallback: boolean;
  blocked?: boolean;
  interrupted?: boolean;
  tokensUsed?: number;
}> {
  if (options.templateOnly)
    return { reply: fallbackReply(input), fallback: true, tokensUsed: 0 };
  const abort = new AbortController();
  let timer = setTimeout(() => abort.abort(), 7500);
  const forwardAbort = () => abort.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  let partial = "";
  try {
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        project: undefined,
        message: input.message?.slice(0, 500),
        history: input.history
          ?.slice(-12)
          .map((h) => ({ ...h, text: h.text.slice(0, 80) })),
        context: input.context
          ? {
              ...input.context,
              code: input.context.code?.slice(0, 1000),
              scene: input.context.scene?.slice(0, 1000),
              errors: input.context.errors
                ?.slice(0, 6)
                .map((e) => e.slice(0, 100)),
            }
          : input.project
            ? {
                scene:
                  input.project.scene.components
                    .map((p) => `${p.id}:${p.type}`)
                    .join(",")
                    .slice(0, 800) +
                  "; " +
                  input.project.scene.wires
                    .map(
                      (w) =>
                        `${w.from.componentId}:${w.from.pin}>${w.to.componentId}:${w.to.pin}`,
                    )
                    .join(",")
                    .slice(0, 400),
                code: input.project.code.slice(0, 1000),
              }
            : undefined,
      }),
      signal: abort.signal,
    });
    if (res.status === 402)
      return {
        reply: fallbackReply(input),
        fallback: true,
        blocked: true,
        tokensUsed: 0,
      };
    if (res.status === 429)
      return {
        reply:
          "Сделай небольшую паузу. Можно отправлять до 10 вопросов в минуту.",
        fallback: false,
        blocked: true,
      };
    if (!res.ok) throw Error();
    clearTimeout(timer);
    timer = setTimeout(() => abort.abort(), 20000);
    if (
      res.headers.get("content-type")?.includes("text/event-stream") &&
      res.body
    ) {
      const reader = res.body.getReader(),
        decoder = new TextDecoder();
      let pending = "",
        complete = false,
        fallback = false,
        tokensUsed = 0;
      while (true) {
        const chunk = await reader.read();
        clearTimeout(timer);
        timer = setTimeout(() => abort.abort(), 20000);
        if (chunk.done) break;
        pending += decoder.decode(chunk.value, { stream: true });
        const events = pending.split(/\r?\n\r?\n/);
        pending = events.pop() ?? "";
        for (const event of events) {
          const kind = event.match(/^event: (.+)$/m)?.[1],
            data = event.match(/^data: (.+)$/m)?.[1];
          if (!data) continue;
          const value = JSON.parse(data);
          if (kind === "delta" && typeof value.text === "string") {
            partial += value.text;
            options.onDelta?.(partial);
          }
          if (kind === "done") {
            complete = true;
            fallback = !!value.fallback;
            tokensUsed = Number(value.tokensUsed) || 0;
          }
        }
      }
      if (!partial) throw Error();
      return { reply: partial, fallback, tokensUsed, interrupted: !complete };
    }
    const data = await res.json();
    if (typeof data.reply !== "string" || !data.reply.trim()) throw Error();
    return { reply: data.reply, fallback: false };
  } catch {
    if (options.signal?.aborted && !partial)
      return { reply: "", fallback: false, interrupted: true, tokensUsed: 0 };
    if (partial)
      return {
        reply: partial,
        fallback: false,
        interrupted: true,
        tokensUsed: 0,
      };
    return {
      reply: fallbackReply(input),
      fallback: true,
      tokensUsed: 0,
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}
