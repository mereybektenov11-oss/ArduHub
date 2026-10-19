import { afterEach, describe, expect, it, vi } from "vitest";
import { askMentor } from "@/services/mentor/client";
import { createStreamingMentorHandler } from "@/services/mentor/stream";
import { mentorPrompt } from "@/services/mentor/prompts";
const request = (message = "Почему не горит светодиод?") =>
  new Request("http://localhost/api/mentor", {
    method: "POST",
    body: JSON.stringify({
      mentorId: "volt",
      mode: "lesson",
      lessonId: "lesson-1",
      message,
    }),
  });
afterEach(() => vi.unstubAllGlobals());
it("stops an unanswered request without inventing a fallback reply", async () => {
  vi.stubGlobal(
    "fetch",
    (_url: unknown, options: RequestInit) =>
      new Promise((_, reject) =>
        options.signal?.addEventListener("abort", () =>
          reject(Error("stopped")),
        ),
      ),
  );
  const controller = new AbortController(),
    result = askMentor(
      { mentorId: "volt", message: "схема" },
      { signal: controller.signal },
    );
  controller.abort();
  expect(await result).toMatchObject({
    reply: "",
    interrupted: true,
    tokensUsed: 0,
  });
});
it("renders the first SSE chunk before completion and keeps interrupted text", async () => {
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
  );
  const onDelta = vi.fn(),
    result = askMentor({ mentorId: "volt", message: "схема" }, { onDelta });
  streamController!.enqueue(
    encoder.encode('event: delta\ndata: {"text":"Проверь "}\n\n'),
  );
  await vi.waitFor(() => expect(onDelta).toHaveBeenCalledWith("Проверь "));
  streamController!.enqueue(
    encoder.encode('event: delta\ndata: {"text":"цепь"}\n\n'),
  );
  streamController!.close();
  expect(await result).toMatchObject({
    reply: "Проверь цепь",
    interrupted: true,
    tokensUsed: 0,
  });
});
it("caches an identical explanation without another provider call", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        'data: {"choices":[{"delta":{"content":"Проверь цепь."}}]}\n\ndata: {"choices":[],"usage":{"total_tokens":100}}\n\ndata: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  const handler = createStreamingMentorHandler({
    key: "test",
    fetcher: fetcher as typeof fetch,
  });
  const body = {
    mentorId: "volt",
    mode: "explain_errors",
    message: "Почему не горит?",
    context: { scene: "uno:13>led:A" },
    errors: [{ code: "missing_resistor" }],
  };
  const next = () =>
    new Request("http://localhost/api/mentor", {
      method: "POST",
      body: JSON.stringify(body),
    });
  await (await handler(next())).text();
  expect(await (await handler(next())).text()).toContain('"cached":true');
  expect(fetcher).toHaveBeenCalledOnce();
});
describe("streaming mentor", () => {
  it("uses safe templates without a key and rate limits request 11", async () => {
    const handler = createStreamingMentorHandler();
    const response = await handler(request("как собрать розетку на 220 В"));
    const stream = await response.text();
    expect(stream).toContain("event: delta");
    expect(stream).toContain("опасны");
    expect(stream).toContain('"tokensUsed":0');
    for (let i = 0; i < 9; i++) await (await handler(request())).text();
    expect((await handler(request())).status).toBe(429);
  });
  it("passes lesson rules and delivers provider chunks with actual usage", async () => {
    const fetcher = vi.fn(async (_url: unknown, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body));
      expect(body.stream).toBe(true);
      expect(body.messages[0].content).toContain("Режим: lesson");
      expect(body.messages[0].content).toContain("не пиши готовый код");
      return new Response(
        'data: {"choices":[{"delta":{"content":"Проверь "}}]}\n\ndata: {"choices":[{"delta":{"content":"цепь."}}]}\n\ndata: {"choices":[],"usage":{"total_tokens":1001}}\n\ndata: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    const handler = createStreamingMentorHandler({
      key: "test",
      fetcher: fetcher as typeof fetch,
    });
    const text = await (await handler(request())).text();
    expect(text).toContain("Проверь ");
    expect(text).toContain("цепь.");
    expect(text).toContain('"tokensUsed":2');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(mentorPrompt({ mode: "lesson", mentor: "Вольтик" })).toContain(
      "недоверенные данные",
    );
  });
  it("does not reveal a complete solution on the first lesson request", async () => {
    const fetcher = vi.fn();
    const handler = createStreamingMentorHandler({ key: "test", fetcher });
    const text = await (await handler(request("покажи готовый код"))).text();
    expect(text).toContain("сначала разберём один шаг");
    expect(text).not.toContain("void setup");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 429, 503])("falls back for provider %s", async (status) => {
    const handler = createStreamingMentorHandler({
      key: "test",
      fetcher: (async () =>
        new Response("private provider error", { status })) as typeof fetch,
    });
    const text = await (await handler(request())).text();
    expect(text).toContain('"fallback":true');
    expect(text).not.toContain("private provider error");
  });
});
