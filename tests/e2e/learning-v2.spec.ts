import { achievementDeck } from "../../src/content/achievements.ru";
import { passLessonQuiz } from "./helpers/lessonQuiz";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { exampleScene } from "../../src/domain/lessons/content";
import sketches from "../../src/content/sketches.json" with { type: "json" };
async function init(page: Page) {
  const p = createProgress();
  p.profile.name = "Искра";
  // These feature fixtures represent a learner who has acknowledged reward notices.
  p.achievements = {
    unlocked: [],
    claimed: [],
    notified: achievementDeck.map((item) => item.id),
  };
  p.tourSeen = {
    "/app/lesson/lesson-1": true,
    "/app": true,
    "/app/map": true,
    "/app/practice": true,
  };
  for (let i = 1; i <= 12; i++) p.tourSeen["/app/lesson/lesson-" + i] = true;
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
  }, p);
}
async function build(page: Page) {
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
  await passLessonQuiz(page);
  const pin = (name: string) => page.getByRole("button", { name, exact: true });
  for (const [a, b] of [
    ["uno 13", "r 1"],
    ["r 2", "led A"],
    ["led C", "uno GND.2"],
  ]) {
    await pin(a).click();
    await pin(b).click();
  }
  await page
    .getByRole("button", { name: "Проверить схему", exact: true })
    .click();
}
test("v2 complete first lesson, gates, real worker blink, reward once and resume", async ({
  page,
}) => {
  test.setTimeout(60000);
  await init(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/app/lesson/lesson-1");
  await expect(
    page.getByRole("button", { name: "Практика", exact: true }),
  ).toBeDisabled();
  await build(page);
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Код", exact: true }),
  ).toContainText("___");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(6);
  const editor = page.getByRole("textbox", { name: "Код", exact: true });
  await editor.fill(sketches[0].code);
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByRole("heading", { name: "Урок пройден!" }),
  ).toBeVisible({ timeout: 30000 });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(36);
  await page.reload();
  await expect(page.locator(".flow-practice")).toBeVisible();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByText("Программа запущена.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Запустить/ })).toBeEnabled({
    timeout: 30000,
  });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(36);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "reports/learning-v2/lesson-desktop.png",
    fullPage: true,
  });
});
test("project idea executes, stop clears LED, saves, renames, exports/imports and deletes", async ({
  page,
}) => {
  test.setTimeout(60000);
  await init(page);
  await page.goto("/app/projects");
  await page.getByRole("button", { name: "Идеи", exact: true }).click();
  await page
    .locator(".l2-project-grid .cab-card")
    .first()
    .getByRole("button", { name: "Начать →", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/projects\/.+/);
  await page.getByLabel("Название", { exact: true }).fill("Мой маяк");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(
    page.getByText("Программа работает", { exact: false }),
  ).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator(".l2-canvas wokwi-led").first()).toHaveJSProperty(
    "value",
    true,
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /^Стоп/ }).click();
  await expect(page.locator(".l2-canvas wokwi-led").first()).toHaveJSProperty(
    "value",
    false,
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Мой маяк" })).toBeVisible();
  await page.locator(".project-actions > summary").click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Скачать проект", exact: true })
    .click();
  const download = await downloadEvent;
  await download.saveAs("reports/learning-v2/project.arduhub.json");
  await page.getByRole("link", { name: /Все проекты/ }).click();
  await page.locator(".project-actions > summary").first().click();
  await page
    .locator("input[type=file]")
    .setInputFiles("reports/learning-v2/project.arduhub.json");
  await expect(page.locator(".l2-project-grid .cab-card")).toHaveCount(2);
  await page
    .locator(".l2-project-grid .cab-card")
    .first()
    .getByRole("link", { name: /Открыть/ })
    .click();
  await page.locator(".project-actions > summary").click();
  await page
    .getByRole("button", { name: "Удалить", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/projects$/);
  await expect(page.locator(".l2-project-grid .cab-card")).toHaveCount(1);
});
test("serial, missing compiler preserves code and mentor has three honest sections", async ({
  page,
}) => {
  await init(page);
  const now = new Date().toISOString();
  const project = {
    id: "serial-test",
    title: "Serial test",
    idea: "",
    createdAt: now,
    updatedAt: now,
    scene: exampleScene("serial"),
    code: sketches[3].code,
    thumbnailSvg: "",
  };
  await page.addInitScript((project) => {
    if (!localStorage.getItem("arduhub.projects.v1"))
      localStorage.setItem(
        "arduhub.projects.v1",
        JSON.stringify({ version: 1, projects: [project] }),
      );
  }, project);
  await page.goto("/app/projects/serial-test");
  await page.getByRole("tab", { name: "Монитор порта" }).click();
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(page.getByRole("log", { name: "Монитор порта" })).toContainText(
    "Hello ArduHub",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /^Стоп/ }).click();
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await page.route("**/api/compile", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "compiler_unavailable" }),
    }),
  );
  await page
    .getByRole("textbox", { name: "Код", exact: true })
    .fill("#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}");
  await page.getByRole("button", { name: /^Запустить/ }).click();
  await expect(page.locator(".l2-error[role=alert]")).toContainText(
    "Не получилось запустить, попробуй ещё раз через минуту",
  );
  await page.reload();
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Код", exact: true }),
  ).toContainText("void setup() {}");
  await page.route("**/api/mentor", (r) =>
    r.fulfill({ status: 503, json: { error: "mentor_unavailable" } }),
  );
  await page
    .getByRole("button", { name: "Разбор проекта", exact: true })
    .click();
  for (const text of ["Что работает", "Что рискованно", "Следующий шаг"])
    await expect(
      page
        .locator(".l2-project-review")
        .getByRole("heading", { name: text, exact: true }),
    ).toBeVisible();
});
test("mobile workspace and all palette elements pass serious accessibility checks", async ({
  page,
}) => {
  test.setTimeout(60000);
  await init(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
  await passLessonQuiz(page);
  for (const route of ["/app/lesson/lesson-1", "/app/projects"]) {
    await page.goto(route);
    await page.waitForTimeout(500);
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
  }
  await page.getByRole("button", { name: "Создать проект" }).click();
  await expect(page.locator(".l2-palette > button")).toHaveCount(51);
  // Creation navigates before the lazy workspace mounts. Wait for the palette
  // before enumerating its categories, then use stable group indices.
  for (const group of await page.locator(".kids-palette-group").all()) {
    if ((await group.getAttribute("open")) === null)
      await group.locator("summary").click();
    await expect(group).toHaveAttribute("open", "");
  }
  await expect(page.locator(".l2-palette wokwi-arduino-uno")).toHaveCount(1);
  for (let i = 0; i < 51; i++) {
    await page
      .locator(".l2-palette > button")
      .nth(i)
      .locator("span[role=img]")
      .scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          page
            .locator(".l2-palette > button")
            .nth(i)
            .locator("span[role=img] > span")
            .evaluate((e) => e.children.length),
        { message: `Palette component ${i} loads when its preview is visible` },
      )
      .toBe(1);
  }
  await page.waitForTimeout(1000);
  expect(await page.locator("[data-load-error]").count()).toBe(0);
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
    path: "reports/learning-v2/project-mobile.png",
    fullPage: true,
  });
});

// Cabinet regression scenarios use the explicit guest session.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
});
