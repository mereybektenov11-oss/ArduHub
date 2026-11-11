import { passLessonQuiz } from "./helpers/lessonQuiz";
import { stubExternalVideo } from "./helpers/externalVideo";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import { diagnosticDeck } from "../../src/content/cabinet.ru";
async function seed(page: Page, { showHomeTour = false } = {}) {
  const p = createProgress();
  p.profile.name = "Тестовый ученик";
  p.tourSeen = Object.fromEntries(
    [
      "/app",
      "/app/map",
      "/app/lesson/lesson-1",
      ...Array.from({ length: 12 }, (_, i) => `/app/lesson/lesson-${i + 1}`),
      "/app/practice",
      "/app/practice/blitz",
      "/app/practice/findbug",
      "/app/practice/match",
      "/app/projects",
      "/app/profile",
      "/app/shop",
      "/app/test",
      "/app/glossary",
      "/app/homework",
      "/app/lessons",
    ].map((route) => [route, route !== "/app" || !showHomeTour] as const),
  );
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem("arduhub.onboarding.v1:local", "1");
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 1 }),
    );
  }, p);
  await page.route("**/api/lesson-video?*", (route) =>
    route.fulfill({ json: {} }),
  );
}
// Feature journeys acknowledge real earned notices through their visible controls.
async function dismissRewardDialogs(page: Page) {
  await page.waitForTimeout(150);
  for (let i = 0; i < 12; i++) {
    const reward = page.getByRole("dialog", {
      name: /^(Новый уровень!|Стикер открыт|Сохрани прогресс)$/,
    });
    if (!(await reward.isVisible())) return;
    const close = reward.getByRole("button", {
      name: /^(Закрыть|Закрыть стикер)$/,
    });
    const current = await reward.elementHandle();
    await close.click();
    await expect
      .poll(() => current!.evaluate((element) => element.isConnected))
      .toBe(false);
    await page.waitForTimeout(150);
  }
  throw new Error("Reward queue did not drain");
}

test("lesson checkpoint: wiring alone never awards XP in v2", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
  await passLessonQuiz(page);
  await dismissRewardDialogs(page);
  const pin = (name: string) => page.getByRole("button", { name, exact: true });
  await pin("uno 13").click();
  await pin("led A").click();
  await pin("led C").click();
  await pin("uno GND.2").click();
  await page
    .getByRole("button", { name: "Проверить схему", exact: true })
    .click();
  await expect(
    page.locator(".l2-error").filter({ hasText: "Нет резистора" }),
  ).toBeVisible();
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: /^Подсказка: Осталось подсказок/ })
      .click();
  await expect(
    page
      .locator(".flow-task")
      .getByText(learningLessons[0].circuit.hints[2], { exact: true }),
  ).toBeVisible();
  const wrongWire = page.getByRole("button", {
    name: "Цвет провода: uno 13 → led A",
    exact: true,
  });
  await wrongWire.focus();
  await wrongWire.press("Enter");
  await page
    .getByRole("toolbar", { name: "Инструменты схемы" })
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await pin("uno 13").click();
  await pin("r 1").click();
  await pin("r 2").click();
  await pin("led A").click();
  await page
    .getByRole("button", { name: "Проверить схему", exact: true })
    .click();
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Код", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).xp,
    ),
  ).toBe(6);
  await page.reload();
  await page.getByRole("tab", { name: "Код", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Код", exact: true }),
  ).toBeVisible();
});

test("cabinet mobile accessibility", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stubExternalVideo(page);
  await seed(page);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of [
    "/app",
    "/app/map",
    "/app/lesson/lesson-1",
    "/app/practice",
  ]) {
    await page.goto(route);
    await page.waitForTimeout(300);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (route.startsWith("/app/lesson/"))
      await expect(page.locator(".dash-bottom")).toHaveCount(0);
    else await expect(page.locator(".dash-bottom")).toBeVisible();
    const result = await new AxeBuilder({ page }).analyze();
    expect(
      result.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  }
});
test("landing, diagnosis, map, lesson and reward", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await page.locator(".account").click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("link", { name: "Начать тест", exact: true }).click();
  for (const q of diagnosticDeck) {
    await page
      .locator(".cab-main")
      .getByRole("button", { name: q.options[q.correct] })
      .click();
    await page.getByRole("button", { name: /^Ответить/ }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Твой маршрут готов!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem("arduhub.progress.v1")!);
      return { xp: p.xp, level: p.profile.level };
    }),
  ).toEqual({ xp: 0, level: 1 });
  await page.getByRole("link", { name: /На остров электроники/ }).click();
  await dismissRewardDialogs(page);
  await page.locator('.island-level-list a[href="/app/map/0"]').click();
  await page
    .getByRole("button", { name: "Первый огонёк", exact: true })
    .click();
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
  await passLessonQuiz(page);
  await dismissRewardDialogs(page);
  await expect(
    page.getByRole("button", { name: "uno 13", exact: true }),
  ).toBeVisible();
});
test("diagnosis resumes at question four and banner disappears after completion", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/test");
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: diagnosticDeck[i].options[0] })
      .click();
    await page.getByRole("button", { name: /^Ответить/ }).click();
  }
  await page.reload();
  await expect(page.getByText("Задание 4 из 8", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Ответы сохранены. Продолжай с того же места."),
  ).toBeVisible();
  for (let i = 3; i < diagnosticDeck.length; i++) {
    await page
      .getByRole("button", {
        name: diagnosticDeck[i].options[diagnosticDeck[i].correct],
      })
      .click();
    await page.getByRole("button", { name: /^Ответить/ }).click();
  }
  await page.goto("/app");
  await expect(page.locator(".kids-diagnostic")).toHaveCount(0);
});
test("locked map node and screenshots", async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app/map");
  const locked = page.locator('[data-map-level="2"]');
  await expect(locked).toHaveAttribute("data-status", "locked");
  await expect(locked).toHaveAttribute("aria-disabled", "true");
  await locked.dispatchEvent("click");
  await expect(page).toHaveURL(/\/app\/map$/);
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: "reports/cabinet/map-desktop.png",
    fullPage: true,
  });
  await page.goto("/app");
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: "reports/cabinet/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/app/map");
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "reports/cabinet/map-mobile.png",
    fullPage: true,
  });
});
test("tour: five current desktop steps, remembers completion and replays", async ({
  page,
}) => {
  await seed(page, { showHomeTour: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/app");
  const tour = page.getByRole("dialog", { name: "Тур по кабинету" });
  await expect(tour).toBeVisible();
  await expect(tour.getByText("1 из 5", { exact: true })).toBeVisible();
  for (let i = 0; i < 4; i++)
    await tour.getByRole("button", { name: /^Далее/ }).click();
  await tour.getByRole("button", { name: /^Понятно/ }).click();
  await expect(tour).not.toBeVisible();
  await page.reload();
  await page.waitForTimeout(900);
  await expect(tour).not.toBeVisible();
  await page.getByRole("button", { name: "Справка и тур" }).click();
  await expect(tour).toBeVisible();
  await tour.getByRole("button", { name: "Пропустить", exact: true }).click();
});
test("glossary search and persisted collection", async ({ page }) => {
  await seed(page);
  await page.goto("/app/glossary");
  await page.getByRole("searchbox").fill("резистор");
  const cards = page.locator(".cab-term");
  await expect(cards).toHaveCount(3);
  await cards
    .filter({
      has: page.getByRole("heading", { name: "Резистор", exact: true }),
    })
    .getByRole("button", { name: "В коллекцию", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /Моя коллекция/ }).click();
  await expect(page.locator(".cab-term")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Резистор", exact: true }),
  ).toBeVisible();
});
test("mentor fallback, token balance and quick chat", async ({ page }) => {
  await page.route("**/api/mentor", (route) =>
    route.fulfill({ status: 503, json: { error: "mentor_unavailable" } }),
  );
  await seed(page);
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Наставник", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Наставник" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("50 токенов");
  await dialog.getByRole("textbox").fill("Зачем резистор?");
  await dialog.getByRole("button", { name: /Отправить/ }).click();
  await expect(dialog.getByRole("log")).toContainText(
    "Резистор ограничивает ток",
  );
  await expect(dialog).toContainText("50 токенов");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("arduhub.progress.v1")!).mentor.tokens,
    ),
  ).toBe(50);
});
test("blitz loses third life and queues mistakes", async ({ page }) => {
  await seed(page);
  await page.goto("/app/practice/blitz");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "5V", exact: true }).click();
    await page.getByRole("button", { name: "K", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Тренировка завершена" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("arduhub.progress.v1")!).reviewQueue
          .length,
    ),
  ).toBe(3);
});
test("all routes at 360, reduced motion and touch pin connections", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  await seed(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [
    "/app",
    "/app/map",
    "/app/map/0",
    "/app/test",
    "/app/lesson/lesson-1",
    "/app/practice",
    "/app/practice/blitz",
    "/app/practice/findbug",
    "/app/practice/match",
    "/app/profile",
    "/app/glossary",
    "/app/homework",
    "/app/lessons",
  ]) {
    await page.goto(route);
    if (route.startsWith("/app/lesson/"))
      await expect(page.locator(".dash-bottom")).toHaveCount(0);
    else await expect(page.locator(".dash-bottom")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Наставник", exact: true }).click();
  const mentorDialog = page.getByRole("dialog", { name: "Наставник" });
  await expect(mentorDialog).toBeVisible();
  await expect(mentorDialog.getByRole("textbox")).toBeVisible();
  await page.goto("/app/map");
  expect(
    await page
      .locator(".island-map-node.is-current .island-node-orb")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 360, height: 800 },
  });
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
  const touch = await context.newPage();
  await seed(touch);
  await touch.goto("/app/lesson/lesson-1");
  await touch.getByRole("button", { name: "Я посмотрел", exact: true }).tap();
  await touch.getByRole("button", { name: "К тесту →", exact: true }).tap();
  await passLessonQuiz(touch);
  await dismissRewardDialogs(touch);
  await touch.getByRole("button", { name: "uno 13", exact: true }).tap();
  await touch.getByRole("button", { name: "led A", exact: true }).tap();
  await expect(
    touch.getByRole("button", {
      name: "Цвет провода: uno 13 → led A",
      exact: true,
    }),
  ).toBeVisible();
  await context.close();
});
test("keyboard editor undo/redo and no duplicate/self wire", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Я посмотрел", exact: true }).click();
  await page.getByRole("button", { name: "К тесту →", exact: true }).click();
  await passLessonQuiz(page);
  await dismissRewardDialogs(page);
  const first = page.getByRole("button", { name: "uno 13", exact: true }),
    second = page.getByRole("button", { name: "led A", exact: true });
  await first.press("Enter");
  await first.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Соединение не создано" }),
  ).toBeVisible();
  await first.press("Enter");
  await second.press("Enter");
  await page.keyboard.press("Control+z");
  const wire = page.getByRole("button", {
    name: "Цвет провода: uno 13 → led A",
    exact: true,
  });
  await expect(wire).toHaveCount(0);
  await page.keyboard.press("Control+Shift+z");
  await expect(wire).toBeVisible();
});

// Cabinet regression scenarios use the explicit guest session.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
});
