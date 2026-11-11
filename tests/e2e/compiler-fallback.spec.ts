import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { completeEvidence } from "../helpers/progressEvidence";

const blink =
  "void setup(){pinMode(13,OUTPUT);}void loop(){digitalWrite(13,HIGH);delay(500);digitalWrite(13,LOW);delay(500);}";
async function setup(page: Page, code = blink) {
  const p = createProgress();
  p.profile.name = "Искра";
  p.achievements = {
    unlocked: ["first-light"],
    notified: ["first-light"],
    claimed: [],
  };
  p.tourSeen = { "/app": true, "/app/lesson/lesson-2": true };
  p.lessons["lesson-1"] = {
    ...p.lessons["lesson-1"],
    ...completeEvidence("lesson-1"),
    status: "done",
    rewarded: true,
  };
  const evidence = completeEvidence("lesson-2");
  evidence.stages.practice = false;
  evidence.practice.run = false;
  p.lessons["lesson-2"] = {
    ...p.lessons["lesson-2"],
    ...evidence,
    status: "current",
  };
  const draft = {
    scene: learningLessons[1].circuit.referenceScene,
    code,
    step: 3,
    steps: {
      video: true,
      theory: true,
      quiz: true,
      circuit: true,
      code: true,
      run: false,
    },
    updatedAt: "2026-10-25T17:00:00.000Z",
    flow: { ...evidence, version: 2, stage: "practice", tab: "code" },
  };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript(
    ({ p, draft }) => {
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
      localStorage.setItem(
        "arduhub.drafts.v1",
        JSON.stringify({
          version: 2,
          curriculumVersion: 2,
          drafts: { "lesson-2": draft },
        }),
      );
      localStorage.setItem(
        "arduhub.save-prompt.v1:local",
        JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
      );
    },
    { p, draft },
  );
  await page.route("**/api/lesson-video?*", (r) =>
    r.fulfill({ status: 200, json: {} }),
  );
  await page.route("**/api/compile", (r) =>
    r.fulfill({ status: 503, json: { error: "compiler_unconfigured" } }),
  );
  await page.goto("/app/lesson/lesson-2?stage=practice");
  await expect(
    page.getByRole("textbox", { name: "Код", exact: true }),
  ).toBeVisible();
}

test("edited 500ms Blink executes in real browser worker without compiler and blinks each second", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/compile")) requests++;
  });
  await page.addInitScript(() => {
    const global = window as typeof window & {
      simFrames: { time: number; pins: number[] }[];
    };
    global.simFrames = [];
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (e) => {
          if (e.data.type === "frame") global.simFrames.push(e.data.sample);
        });
      }
    };
  });
  await setup(page);
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(page.getByRole("button", { name: /^Запустить/ })).toBeEnabled({
    timeout: 15000,
  });
  const frames = await page.evaluate(
    () =>
      (
        window as typeof window & {
          simFrames: { time: number; pins: number[] }[];
        }
      ).simFrames,
  );
  const rising = frames
    .filter((s, i) => i > 0 && s.pins[13] === 1 && frames[i - 1].pins[13] === 0)
    .map((s) => s.time);
  expect(rising.length).toBeGreaterThanOrEqual(2);
  expect(rising[1] - rising[0]).toBeGreaterThanOrEqual(900);
  expect(rising[1] - rising[0]).toBeLessThanOrEqual(1100);
  expect(requests).toBe(0);
});
test("unsupported code shows a friendly error and only server outages reveal sample checking", async ({
  page,
}) => {
  await setup(page, "#include <Servo.h>\nvoid setup(){}void loop(){}");
  const launch = page.getByRole("button", { name: /^Запустить/ });
  for (let i = 0; i < 3; i++) {
    await launch.click();
    await expect(
      page.locator(".l2-error").filter({
        hasText: "Не получилось запустить, попробуй ещё раз через минуту",
      }),
    ).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Проверить по образцу", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Код", exact: true })
    .fill(learningLessons[1].code.solution);
  await page
    .getByRole("button", { name: "Проверить по образцу", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Урок пройден!" }),
  ).toBeVisible();
  await expect(page.getByLabel("15 XP", { exact: true })).toBeVisible();
  const xp = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    );
  expect(await xp()).toBe(15);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Проверить по образцу", exact: true }),
  ).toHaveCount(0);
  await launch.click();
  await expect(launch).toBeEnabled({ timeout: 15000 });
  expect(await xp()).toBe(15);
});
