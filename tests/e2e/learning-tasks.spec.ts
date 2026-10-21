import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "../../src/domain/lessons/content";
async function init(page: Page) {
  const progress = createProgress();
  progress.tourSeen = { "/app": true, "/app/lesson/lesson-1": true };
  for (let i = 1; i <= 12; i++)
    progress.tourSeen["/app/lesson/lesson-" + i] = true;
  await page.addInitScript((progress) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
  }, progress);
}
test("large text persists at 360px and the lesson has no page overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/lesson-video?*", (route) =>
    route.fulfill({ json: {} }),
  );
  await init(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/app/lesson/lesson-1");
  await expect(page.locator(".l2-theory section p").first()).toHaveCSS(
    "font-size",
    "18px",
  );
  await expect(page.locator(".l2-theory h3").first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await page.getByLabel("Размер текста").selectOption("1.3");
  await page.reload();
  await expect(page.getByLabel("Размер текста")).toHaveValue("1.3");
  await expect(page.locator(".l2-theory section p").first()).toHaveCSS(
    "font-size",
    "23.4px",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "reports/learning-tasks/theory-mobile.png",
    fullPage: true,
  });
});
test("fit includes an imported Arduino rotated across the original origin", async ({
  page,
}) => {
  await init(page);
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "arduhub.projects.v1",
      JSON.stringify({
        version: 1,
        projects: [
          {
            id: "rotated",
            title: "Поворот",
            idea: "",
            createdAt: now,
            updatedAt: now,
            scene: {
              version: 1,
              board: "uno",
              components: [
                {
                  id: "uno",
                  type: "uno",
                  x: 20,
                  y: 60,
                  rotation: 180,
                  attrs: {},
                },
              ],
              wires: [],
            },
            code: "void setup(){}\nvoid loop(){}",
            thumbnailSvg: "",
          },
        ],
      }),
    );
  });
  await page.goto("/app/projects/rotated");
  await page.locator(".l2-canvas wokwi-arduino-uno").waitFor();
  await page.getByRole("button", { name: "Показать всё" }).click();
  const viewport = await page.locator(".l2-canvas-scroll").boundingBox(),
    part = await page.locator('[data-component="uno"]').boundingBox();
  expect(part!.x).toBeGreaterThanOrEqual(viewport!.x);
  expect(part!.y).toBeGreaterThanOrEqual(viewport!.y);
  expect(part!.x + part!.width).toBeLessThanOrEqual(
    viewport!.x + viewport!.width + 1,
  );
  expect(part!.y + part!.height).toBeLessThanOrEqual(
    viewport!.y + viewport!.height + 1,
  );
});
test("palette search, five collision-free parts, drag, fit and zoom", async ({
  page,
}) => {
  await init(page);
  await page.goto("/app/projects");
  await page.getByRole("button", { name: "Пустой проект +" }).click();
  await expect(
    page.getByText("Наставник видит: Свободный проект · 0 Деталей", {
      exact: true,
    }),
  ).toBeVisible();
  const palette = page.locator(".l2-palette");
  await expect(palette.locator(":scope > button")).toHaveCount(51);
  await page.getByLabel("Найти деталь").fill("серво");
  await expect(palette.locator(":scope > button")).toHaveCount(1);
  await page.getByLabel("Найти деталь").fill("резистор");
  for (let i = 0; i < 5; i++)
    await palette.getByTitle("Резистор", { exact: true }).click();
  const parts = await page.locator(".l2-canvas .l2-part").evaluateAll((nodes) =>
    nodes.map((n) => {
      const b = n.getBoundingClientRect();
      return { x: b.x, y: b.y, right: b.right, bottom: b.bottom };
    }),
  );
  expect(parts).toHaveLength(5);
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++)
      expect(
        parts[i].x < parts[j].right &&
          parts[i].right > parts[j].x &&
          parts[i].y < parts[j].bottom &&
          parts[i].bottom > parts[j].y,
      ).toBe(false);
  await palette
    .getByTitle("Резистор", { exact: true })
    .dragTo(page.locator(".l2-canvas"), { targetPosition: { x: 100, y: 100 } });
  await expect(page.locator(".l2-canvas .l2-part")).toHaveCount(6);
  await page.getByRole("button", { name: "Показать всё" }).click();
  await page.getByLabel("Масштаб", { exact: true }).fill("80");
  await expect(page.getByLabel("Масштаб", { exact: true })).toHaveValue("80");
});
test("video metadata and automatic switch on official player error", async ({
  page,
}) => {
  await init(page);
  await page.route("**/api/lesson-video?*", (route) =>
    route.fulfill({
      json: {
        videoId: "abcdefghijk",
        title: "Первый светодиод",
        channel: "Учебный канал",
        durationSec: 300,
        alternatives: [
          {
            videoId: "12345678901",
            title: "Запасной урок",
            channel: "Канал два",
          },
        ],
      },
    }),
  );
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<html></html>" }),
  );
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.YT={Player:function(element,options){window.testPlayerError=options.events.onError;this.destroy=()=>{};this.getCurrentTime=()=>0;this.getDuration=()=>300;this.getPlayerState=()=>0;}};window.onYouTubeIframeAPIReady();`,
    }),
  );
  await page.goto("/app/lesson/lesson-1");
  await expect(page.getByText("Видео с YouTube · Учебный канал")).toBeVisible();
  await page.waitForFunction(() => "testPlayerError" in window);
  await page.evaluate(() => {
    (
      window as typeof window & { testPlayerError: () => void }
    ).testPlayerError();
  });
  await expect(page.getByText("Запасной урок", { exact: true })).toBeVisible();
  await expect(page.getByText("Показываем другое видео")).toBeVisible();
});
test("streaming chat renders deltas, safety fallback and three review sections", async ({
  page,
}) => {
  await init(page);
  await page.goto("/app/mentor");
  const chat = page.locator(".cab-chat").first();
  await chat.getByRole("textbox").fill("как собрать розетку на 220 В");
  await chat.getByRole("button", { name: /Отправить/ }).click();
  await expect(
    chat.getByText(/Сетевое напряжение и мощные аккумуляторы опасны/),
  ).toBeVisible();
  expect(await chat.getByRole("textbox").inputValue()).toContain("220");
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
});
test("servo lesson runs real Servo firmware and reports a passing angle", async ({
  page,
}) => {
  test.setTimeout(60000);
  const progress = createProgress();
  progress.profile.level = 4;
  progress.lessons["lesson-9"].status = "done";
  progress.tourSeen = { "/app/lesson/lesson-10": true };
  const lesson = learningLessons[9];
  await page.addInitScript(
    ({ progress, lesson }) => {
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
      localStorage.setItem(
        "arduhub.drafts.v1",
        JSON.stringify({
          version: 1,
          curriculumVersion: 2,
          drafts: {
            "lesson-10": {
              scene: lesson.circuit.referenceScene,
              code: lesson.code.solution,
              step: 4,
              steps: {
                video: true,
                theory: true,
                circuit: true,
                code: true,
                run: false,
              },
            },
          },
        }),
      );
    },
    { progress, lesson },
  );
  await page.goto("/app/lesson/lesson-10");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByRole("heading", { name: "Урок пройден!" }),
  ).toBeVisible({ timeout: 30000 });
  await expect
    .poll(() =>
      page
        .locator(".l2-canvas wokwi-servo")
        .evaluate((e) => (e as HTMLElement & { angle: number }).angle),
    )
    .toBeGreaterThan(85);
});

// Cabinet regression scenarios use the explicit guest session.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
});
