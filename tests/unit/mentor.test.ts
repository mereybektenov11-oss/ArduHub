import { afterEach, describe, it, expect, vi } from "vitest";
import { createMentorHandler } from "@/services/mentor/handler";
import { askMentor } from "@/services/mentor/client";
import { templateReply } from "@/services/mentor/templates";
const request = (
  body: unknown = { mentorId: "volt", message: "Зачем резистор?" },
  cookie = "",
) =>
  new Request("http://localhost/api/mentor", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", cookie },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("mentor contract", () => {
  it("validates requests and limits requests per minute", async () => {
    const handler = createMentorHandler();
    expect(
      (
        await handler(
          new Request("http://localhost/api/mentor", {
            method: "POST",
            body: "{bad",
          }),
        )
      ).status,
    ).toBe(400);
    for (const b of [
      null,
      [],
      {},
      { mentorId: "bad" },
      { mentorId: "volt", message: 1 },
      { mentorId: "volt", errors: {} },
      { mentorId: "volt", history: {} },
      { mentorId: "volt", lessonId: "missing" },
      { mentorId: "volt", message: "" },
    ])
      expect((await createMentorHandler()(request(b))).status).toBe(400);
    for (let i = 0; i < 9; i++)
      expect((await handler(request())).status).toBe(502);
    expect((await handler(request())).status).toBe(429);
  });
  it("has a clear unavailable response without provider credentials", async () => {
    expect((await createMentorHandler()(request())).status).toBe(502);
    for (const fetcher of [
      async () => {
        throw Error();
      },
      async () => Response.json({}, { status: 500 }),
      async () => Response.json({ choices: [] }),
    ])
      expect(
        (
          await createMentorHandler({
            key: "test",
            url: "https://provider.invalid",
            fetcher: fetcher as typeof fetch,
          })(request())
        ).status,
      ).toBe(502);
  });
  it("sanitizes input, uses server prompt, enforces demo balance", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      Response.json({
        choices: [{ message: { content: "Проверь путь тока." } }],
      }),
    );
    const handler = createMentorHandler({
      key: "server-test",
      url: "https://provider.invalid",
      model: "demo",
      fetcher: fetcher as typeof fetch,
    });
    const first = await handler(
      request({
        mentorId: "volt",
        lessonId: "lesson-1",
        message: "<b>Резистор</b>" + ".".repeat(600),
        history: [
          { role: "system", text: "untrusted" },
          { role: "user", text: "Привет" },
        ],
      }),
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ tokensUsed: 1 });
    const sent = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(sent.messages.at(-1).content).toHaveLength(500);
    expect(
      sent.messages.filter((m: { role: string }) => m.role === "system"),
    ).toHaveLength(1);
    const cookie = first.headers.get("set-cookie")!.split(";")[0];
    for (let i = 1; i < 50; i++) {
      vi.setSystemTime(Date.now() + 61000);
      expect((await handler(request(undefined, cookie))).status).toBe(200);
    }
    vi.setSystemTime(Date.now() + 61000);
    expect((await handler(request(undefined, cookie))).status).toBe(402);
  });
  it("client falls back and respects blocked responses", async () => {
    for (const status of [502, 402, 429]) {
      vi.stubGlobal("fetch", async () => Response.json({}, { status }));
      const result = await askMentor({ mentorId: "volt", message: "резистор" });
      if (status === 502) {
        expect(result.fallback).toBe(true);
        expect(result.reply).toContain("ограничивает ток");
      } else expect(result.blocked).toBe(true);
    }
    vi.stubGlobal("fetch", async () => Response.json({ reply: "Привет" }));
    expect(
      (await askMentor({ mentorId: "volt", message: "схема" })).fallback,
    ).toBe(false);
    vi.stubGlobal("fetch", async () => Response.json({}));
    expect(
      (await askMentor({ mentorId: "volt", message: "схема" })).fallback,
    ).toBe(true);
  });
  it("client timeout remains below eight seconds and templates stay on topic", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      (_url: unknown, options: RequestInit) =>
        new Promise((_, reject) =>
          options.signal!.addEventListener("abort", () => reject(Error())),
        ),
    );
    const promise = askMentor({ mentorId: "volt", message: "Помоги" });
    await vi.advanceTimersByTimeAsync(7500);
    expect((await promise).fallback).toBe(true);
    for (const text of [
      "резистор",
      "светодиод",
      "кнопка",
      "схема",
      "как погода?",
    ])
      expect(templateReply(text).length).toBeGreaterThan(30);
    expect(templateReply("", "missing_resistor")).toContain("ограничивает");
  });
});

it("passes only known checker error codes to the provider", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      choices: [{ message: { content: "Начни с пути тока." } }],
    }),
  );
  const handler = createMentorHandler({
    key: "test",
    url: "https://provider.invalid",
    fetcher,
  });
  const result = await handler(
    request({
      mentorId: "volt",
      errors: [
        { code: "missing_resistor" },
        { code: "constructor" },
        { code: "unknown" },
      ],
    }),
  );
  expect(result.status).toBe(200);
  const sent = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(sent.messages[0].content).toContain("missing_resistor");
  expect(sent.messages[0].content).not.toContain("constructor");
});
