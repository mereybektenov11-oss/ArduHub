import { test, expect, type Page } from "@playwright/test";
import { dismissRewardDialogs } from "./helpers/rewardDialogs";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "../../src/domain/lessons/content";

import { passLessonQuiz } from "./helpers/lessonQuiz";
import { stubExternalVideo } from "./helpers/externalVideo";

async function setup(page: Page, practice = false) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const p = createProgress();
  p.profile.name = "Проверка";
  p.tourSeen = {
    "/app": true,
    "/app/lesson/lesson-1": true,
    "/app/lesson/lesson-2": true,
  };
  await page.addInitScript(
    ({ p, lesson, practice }) => {
      if (localStorage.getItem("arduhub.progress.v1")) return;
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
      if (practice)
        localStorage.setItem(
          "arduhub.drafts.v1",
          JSON.stringify({
            version: 1,
            curriculumVersion: 2,
            drafts: {
              "lesson-1": {
                scene: lesson.circuit.referenceScene,
                code: lesson.code.solution,
                step: 3,
                steps: {
                  video: true,
                  theory: true,
                  quiz: true,
                  circuit: true,
                  code: true,
                  run: false,
                },
              },
            },
          }),
        );
    },
    { p, lesson: learningLessons[0], practice },
  );
  await page.route("**/api/lesson-video?*", (r) =>
    r.fulfill({ status: 200, json: {} }),
  );
  await stubExternalVideo(page);
}
async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
}

test("path popovers, closed node, keyboard and hover dedup", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/app");
  await page.locator(".dash-node.current").first().click();
  await expect(page.locator(".flow-node-popover")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".flow-node-popover")).toHaveCount(0);
  const locked = page.locator(".dash-node.locked").first();
  await locked.click();
  await expect(
    page.getByRole("button", { name: "Заблокировано", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(locked).toBeFocused();
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/lessons/lesson-1")) requests++;
  });
  const node = page.locator(".dash-node.current").first();
  await node.hover();
  await page.waitForTimeout(200);
  await node.focus();
  await page.waitForTimeout(200);
  expect(requests).toBeLessThanOrEqual(1);
  await audit(page);
});

test("full lesson, real AVR, reward once, next node and review", async ({
  page,
}) => {
  test.setTimeout(90000);
  await setup(page);
  await page.goto("/app");
  await page.locator(".dash-node.current").first().click();
  await page
    .locator(".flow-node-popover")
    .getByRole("link", { name: "Продолжить", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Загружаем урок", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".flow-video-stage")).toBeVisible();
  await audit(page);
  await expect(
    page.getByRole("button", { name: "К тесту →", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
  await expect(page.locator(".flow-answer")).toHaveCount(4);
  await audit(page);
  await passLessonQuiz(page);
  await audit(page);
  // Keep actual scene checking and AVR execution; load the known lesson solution as a learner draft.
  const code = page.getByRole("tab", { name: "Код", exact: true });
  await code.click();
  await page
    .getByRole("textbox", { name: "Код", exact: true })
    .fill(learningLessons[0].code.solution);
  await page.getByRole("tab", { name: "Схема", exact: true }).click();
  for (const [a, b] of [
    ["uno 13", "r 1"],
    ["r 2", "led A"],
    ["led C", "uno GND.2"],
  ]) {
    await page.getByRole("button", { name: a, exact: true }).click();
    await page.getByRole("button", { name: b, exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Проверить схему", exact: true })
    .click();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  const dialog = page.getByRole("dialog", { name: "Урок пройден!" });
  await expect(dialog).toBeVisible({ timeout: 30000 });
  await expect(dialog.locator("[data-confetti]")).toHaveCount(48);
  await expect(dialog.getByLabel("30 XP", { exact: true })).toHaveText(
    "+30 XP",
  );
  await expect(dialog.getByLabel("10 искр", { exact: true })).toHaveText(
    "+10 искр",
  );
  const getProgress = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("arduhub.progress.v1")!),
    );
  const awarded = await getProgress();
  expect(awarded.xp).toBe(36);
  expect(awarded.sparks).toBe(10);
  await page.waitForTimeout(2000);
  await expect(
    page.locator("[data-confetti],[data-reward-particle]"),
  ).toHaveCount(0);
  await dialog.getByRole("link", { name: "К пути", exact: true }).click();
  await dismissRewardDialogs(page);
  await expect(
    page.locator('.dash-node.done [data-state="done"]').first(),
  ).toBeVisible();
  await expect(page.locator(".flow-current-label").first()).toContainText(
    "Текущий урок",
  );
  await page.goto("/app/lesson/lesson-1?stage=practice");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByText("Награда за этот урок уже получена.", { exact: false }),
  ).toBeVisible({ timeout: 30000 });
  expect((await getProgress()).xp).toBe(awarded.xp);
});

test("old draft migration retains scene/code, resets unconfirmed stages and protects direct links", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/app/lesson/lesson-1");
  await expect(page.locator(".flow-video-stage")).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arduhub.drafts.v1")!),
  );
  expect(state.version).toBe(2);
  expect(state.drafts["lesson-1"].flow.stages.test).toBe(false);
  expect(state.drafts["lesson-1"].code).toContain("void setup");
  expect(state.drafts["lesson-1"].scene.wires.length).toBeGreaterThan(0);
  await page.goto("/app/lesson/lesson-2?stage=practice");
  await expect(
    page.getByText("Пройди предыдущий урок, чтобы открыть этот"),
  ).toBeVisible();
});

test("skeleton minimum, timeout, retry and offline shell", async ({ page }) => {
  test.setTimeout(30000);
  await setup(page);
  await page.route("**/api/lessons/lesson-1", async (r) => {
    await new Promise((resolve) => setTimeout(resolve, 9000));
    await r.abort();
  });
  await page.goto("/app/lesson/lesson-1?stage=practice");
  await expect(page.locator(".flow-shell")).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Загружаем урок", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Не получилось открыть урок|Нет связи/ }),
  ).toBeVisible({ timeout: 10000 });
  await page.unroute("**/api/lessons/lesson-1");
  // Measure from the action, including Playwright's post-click settling time.
  const start = Date.now();
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.locator(".flow-video-stage")).toBeVisible();
  expect(Date.now() - start).toBeGreaterThanOrEqual(300);
  await expect(page).toHaveURL(/stage=video/);
});

for (const reduce of [false, true])
  test(`360px ${reduce ? "reduced motion" : "normal"}: video/test/practice accessibility and no overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({
      reducedMotion: reduce ? "reduce" : "no-preference",
    });
    await setup(page);
    await page.goto("/app/lesson/lesson-1");
    await expect(page.locator(".flow-video-stage")).toBeVisible();
    await page.screenshot({
      path: `reports/lesson-flow/video-360-${reduce}.png`,
      fullPage: true,
    });
    await audit(page);
    await page
      .getByRole("button", { name: "Я посмотрел", exact: true })
      .click();
    await page.getByRole("button", { name: "К тесту →", exact: true }).click();
    await expect(page.locator(".flow-quiz")).toBeVisible();
    await audit(page);
    await passLessonQuiz(page);
    await page
      .getByRole("button", { name: "Показать задание", exact: true })
      .click();
    await expect(page.locator(".flow-checklist")).toBeVisible();
    await audit(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `reports/lesson-flow/practice-360-${reduce}.png`,
      fullPage: true,
    });
  });

test("actual 80 percent watch unlocks test while seeking does not count", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/lesson-video?*", (r) =>
    r.fulfill({
      json: {
        videoId: "abcdefghijk",
        title: "Учебное видео",
        channel: "ArduHub",
      },
    }),
  );
  await page.addInitScript(() => {
    const root = window as typeof window & { YT: unknown; flowSeek: boolean };
    root.flowSeek = true;
    root.YT = {
      Player: class {
        start = performance.now();
        constructor(
          _element: unknown,
          options: { events: { onReady: () => void } },
        ) {
          setTimeout(options.events.onReady, 0);
        }
        getDuration() {
          return 4;
        }
        getCurrentTime() {
          return root.flowSeek
            ? 4
            : Math.min(4, (performance.now() - this.start) / 1000);
        }
        getPlayerState() {
          return 1;
        }
        destroy() {}
      },
    };
  });
  await page.goto("/app/lesson/lesson-1");
  await expect(
    page.getByRole("heading", { name: "Учебное видео", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(
    page.getByRole("button", { name: "К тесту →", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    (window as typeof window & { flowSeek: boolean }).flowSeek = false;
  });
  // Restart the player at zero, then watch normal second-by-second progression.
  await page.reload();
  await page.evaluate(() => {
    (window as typeof window & { flowSeek: boolean }).flowSeek = false;
  });
  await expect(
    page.getByRole("button", { name: "К тесту →", exact: true }),
  ).toBeEnabled({ timeout: 8000 });
});

test("offline metadata error retains shell and retry recovers", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.route("**/api/lessons/lesson-1", async (r) => {
    await context.setOffline(true);
    await r.abort("internetdisconnected");
  });
  await page.goto("/app/lesson/lesson-1");
  await expect(
    page.getByRole("heading", { name: "Нет связи", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".flow-header")).toBeVisible();
  await context.setOffline(false);
  await page.unroute("**/api/lessons/lesson-1");
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.locator(".flow-video-stage")).toBeVisible();
});

test("missing quiz data does not automatically complete test or unlock practice", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/lessons/lesson-1", (r) =>
    r.fulfill({ json: { ...learningLessons[0], quiz: undefined } }),
  );
  await page.goto("/app/lesson/lesson-1");
  await expect(
    page.getByRole("heading", { name: "Не получилось открыть урок" }),
  ).toBeVisible();
  await expect(page.locator(".flow-practice")).toHaveCount(0);
  await page.goto("/app/lesson/lesson-1?stage=test");
  await expect(page.locator(".flow-practice")).toHaveCount(0);
});
