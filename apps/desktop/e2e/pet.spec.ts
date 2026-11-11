import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { errorCopy } from "@arduhub/arduino-core/checker/errors.ru";
import { passLessonQuiz } from "../../../tests/e2e/helpers/lessonQuiz";
import {
  fakeJwt,
  launchMocked,
  learnerProgress,
  signIn,
  userId,
} from "./helpers";
import { removeDir } from "./helpers";

const shots = resolve(__dirname, "../../../outputs/desktop-pet");
const axeSource = readFileSync(
  createRequire(
    createRequire(join(__dirname, "../../../package.json")).resolve(
      "@axe-core/playwright",
    ),
  ).resolve("axe-core/axe.min.js"),
  "utf8",
);
async function contrast(page: Page, where: string) {
  await page.waitForTimeout(400);
  await page.evaluate(axeSource);
  const r = (await page.evaluate(() =>
    (
      window as unknown as { axe: { run: (o: object) => Promise<unknown> } }
    ).axe.run({ runOnly: ["color-contrast"] }),
  )) as { violations: { nodes: { target: string[] }[] }[] };
  expect(
    r.violations.flatMap((v) => v.nodes.map((n) => n.target[0])),
    where,
  ).toEqual([]);
}

// Records what the companion says instead of speaking out loud in tests.
async function recordSpeech(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(`${u.voice?.name ?? "?"}: ${u.text}`);
    };
  });
}
const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

test("pixel companion: memory, hints, stops a short circuit out loud, chat", async () => {
  test.setTimeout(150_000);
  const userData = mkdtempSync(join(tmpdir(), "arduhub-pet-"));
  try {
    let s = await launchMocked(userData, { progress: learnerProgress("oma") });
    let page = s.page;
    await recordSpeech(page);
    // Memory from earlier sessions: three reversed LEDs.
    await page.evaluate(
      ([key]) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            v: 1,
            mistakes: { led_reversed: { count: 3, last: "2026-11-10" } },
            chat: [],
          }),
        ),
      [`arduhub.pet.v1.${userId}`],
    );
    await signIn(page, "correct-horse");
    await page.getByRole("button", { name: /Обучение/ }).click();

    // The selected mentor (Ома) appears and recalls the frequent mistake.
    const pet = page.getByRole("button", { name: "Ома: открыть чат" });
    await expect(pet).toBeVisible();
    const bubble = page.locator(".pet-bubble");
    await expect(bubble).toContainText(errorCopy.led_reversed[0]);
    await expect(bubble).toContainText("3 раза");
    await page.screenshot({ path: join(shots, "map-memory.png") });

    // Into the practice of lesson 1.
    await page.getByRole("button", { name: /Урок 1: Первый огонёк/ }).click();
    await page
      .getByRole("button", { name: "Я посмотрел", exact: true })
      .click();
    await page.getByRole("button", { name: "К тесту", exact: true }).click();
    await passLessonQuiz(page);

    // A check with nothing wired: a hint, not a stop.
    await page
      .getByRole("button", { name: "Проверить схему", exact: true })
      .click();
    await expect(bubble).toContainText(errorCopy.open_circuit[1]);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.screenshot({ path: join(shots, "hint.png") });

    // A short circuit stops the learner at once, out loud.
    const pin = (name: string) =>
      page.getByRole("button", { name, exact: true });
    await pin("uno 5V").click();
    await pin("uno GND.1").click();
    const stop = page.getByRole("alertdialog");
    await expect(stop).toContainText("Короткое замыкание");
    await expect(stop).toContainText("нельзя делать никогда");
    expect((await spoken(page)).join("\n")).toMatch(
      /(Irina|Pavel).*Стоп! Короткое замыкание/,
    );
    await contrast(page, "stop dialog");
    await page.screenshot({ path: join(shots, "stop.png") });
    await page.getByRole("button", { name: "Понятно, исправлю" }).click();
    await expect(stop).toHaveCount(0);

    // Chat: click the companion and ask.
    await pet.click();
    const chat = page.getByRole("region", { name: "Чат с наставником" });
    await expect(chat).toBeVisible();
    await chat.getByRole("textbox").fill("Зачем нужен резистор?");
    await chat.getByRole("textbox").press("Enter");
    await expect(chat.locator(".pet-mentor")).not.toHaveCount(0);
    await expect(chat).toContainText("ИИ в приложении ещё не подключён");
    await page.screenshot({ path: join(shots, "chat.png") });
    await contrast(page, "chat");
    // The site call is aborted in this test (template answer): Chromium logs
    // that one failed request; nothing else may fail.
    expect(s.errors.filter((e) => !e.includes("net::ERR_FAILED"))).toEqual([]);
    await s.app.close();

    // Memory survives a restart: the conversation and the short circuit.
    s = await launchMocked(userData, { progress: learnerProgress("oma") });
    page = s.page;
    await expect(
      page.getByRole("heading", { name: /Привет, Алия!/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Обучение/ }).click();
    await page.getByRole("button", { name: "Ома: открыть чат" }).click();
    await expect(
      page.getByRole("region", { name: "Чат с наставником" }),
    ).toContainText("Зачем нужен резистор?");
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
      `arduhub.pet.v1.${userId}`,
    );
    expect(saved.mistakes.short_circuit.count).toBe(1);
    expect(saved.mistakes.open_circuit.count).toBe(1);
    await s.app.close();
  } finally {
    removeDir(userData);
  }
});

test("chat with the AI mentor: the site answers with the learner's token", async () => {
  const userData = mkdtempSync(join(tmpdir(), "arduhub-pet-ai-"));
  try {
    const s = await launchMocked(userData, {
      progress: learnerProgress("rezik"),
      mentorReply: "Резистор ограничивает ток, чтобы светодиод не сгорел.",
    });
    const page = s.page;
    await signIn(page, "correct-horse");
    await page.getByRole("button", { name: /Обучение/ }).click();
    await page.getByRole("button", { name: "Резик: открыть чат" }).click();
    const chat = page.getByRole("region", { name: "Чат с наставником" });
    await chat.getByRole("textbox").fill("Зачем резистор?");
    await chat.getByRole("textbox").press("Enter");
    await expect(chat.locator(".pet-mentor").last()).toHaveText(
      "Резистор ограничивает ток, чтобы светодиод не сгорел.",
    );
    await expect(chat).not.toContainText("ИИ в приложении ещё не подключён");
    // Signed with the session token, from the app origin, with the context.
    expect(s.mentorCalls).toHaveLength(1);
    expect(s.mentorCalls[0].authorization).toBe(`Bearer ${fakeJwt}`);
    expect(s.mentorCalls[0].origin).toBe("app://arduhub");
    expect(s.mentorCalls[0].body).toMatchObject({
      mentorId: "rezik",
      mode: "chat",
      message: "Зачем резистор?",
    });
    await page.screenshot({ path: join(shots, "chat-ai.png") });
    expect(s.errors).toEqual([]);
    await s.app.close();
  } finally {
    removeDir(userData);
  }
});
