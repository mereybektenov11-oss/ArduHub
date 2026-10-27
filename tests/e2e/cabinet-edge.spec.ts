import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { diagnosticDeck, matchDeck } from "../../src/content/cabinet.ru";
import { dismissRewardDialogs } from "./helpers/rewardDialogs";
async function init(
  page: Page,
  sparks = 0,
  { showHomeTour = false }: { showHomeTour?: boolean } = {},
) {
  const p = createProgress();
  p.sparks = sparks;
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
}
test("desktop axe and screenshots", async ({ page }) => {
  test.setTimeout(60000);
  await init(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of [
    "/app",
    "/app/map",
    "/app/lesson/lesson-1",
    "/app/practice",
  ]) {
    await page.goto(route);
    await page.waitForTimeout(1000);
    const result = await new AxeBuilder({ page }).exclude("iframe").analyze();
    expect(
      result.violations.filter((v) =>
        ["critical", "serious"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  }
  await page.screenshot({
    path: "reports/cabinet/practice-desktop.png",
    fullPage: true,
  });
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Наставник", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Наставник" })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "reports/cabinet/mentor-desktop.png",
    fullPage: true,
  });
});
test("game timer pauses while hidden", async ({ page }) => {
  await init(page);
  await page.clock.install();
  await page.goto("/app/practice/blitz");
  await expect(page.getByText("60 сек.", { exact: true })).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByText("58 сек.", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(5000);
  await expect(page.getByText("58 сек.", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(1100);
  await expect(page.getByText("57 сек.", { exact: true })).toBeVisible();
});
test("findbug and matching games can be completed", async ({ page }) => {
  await init(page);
  await page.goto("/app/practice/findbug");
  for (let question = 0; question < 6; question++) {
    const item = diagnosticDeck[5 + (question % 3)];
    const pin = item.options[item.correct];
    await page
      .locator(".cab-pin-diagram")
      .getByRole("button", { name: pin, exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Тренировка завершена" }),
  ).toBeVisible();
  await page.goto("/app/practice/match");
  for (const [component, description] of matchDeck) {
    await page.getByRole("button", { name: component, exact: true }).click();
    await page.getByRole("button", { name: description, exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Тренировка завершена" }),
  ).toBeVisible();
});
test("mentor unlock exact sparks, no duplicate charge", async ({ page }) => {
  await init(page, 80);
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Наставник", exact: true }).click();
  const mentorDialog = page.getByRole("dialog", { name: "Наставник" });
  await expect(mentorDialog).toBeVisible();
  await expect(
    mentorDialog
      .getByLabel("Выбрать наставника")
      .locator('option[value="oma"]'),
  ).toHaveAttribute("disabled", "");
  await page.keyboard.press("Escape");
  await page.goto("/app/shop");
  const item = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Ома", exact: true }) });
  await item.getByRole("button", { name: "Купить", exact: true }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Купить за 60 искр?",
  });
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Купить", exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  const purchased = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arduhub.progress.v1")!),
  );
  expect(purchased.sparks).toBe(20);
  expect(purchased.inventory).toContain("oma");
  expect(purchased.mentor.unlockedIds).toContain("oma");
  await dismissRewardDialogs(page);

  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Наставник", exact: true }).click();
  const unlockedDialog = page.getByRole("dialog", { name: "Наставник" });
  const mentorSelect = unlockedDialog.getByLabel("Выбрать наставника");
  await expect(mentorSelect.locator('option[value="oma"]')).not.toHaveAttribute(
    "disabled",
  );
  await mentorSelect.selectOption("oma");
  await expect(mentorSelect).toHaveValue("oma");
  await mentorSelect.selectOption("oma");
  const afterSelection = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arduhub.progress.v1")!),
  );
  expect(afterSelection.sparks).toBe(20);
  expect(afterSelection.mentor.selectedId).toBe("oma");
});
test("corrupt and unavailable storage do not crash", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("arduhub.onboarding.v1:local", "1");
    localStorage.setItem("arduhub.progress.v1", "{bad");
  });
  await page.goto("/app");
  await expect(
    page.locator('.cab-storage-warning[role="alert"]'),
  ).toContainText("Сохранение повреждено");
  await page
    .getByRole("button", { name: "Сбросить прогресс", exact: true })
    .click();
  await expect(page.locator('.cab-storage-warning[role="alert"]')).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).version,
    ),
  ).toBe(1);
  const context = await browser.newContext();
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
  const denied = await context.newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get: () => {
        throw new DOMException("unavailable");
      },
    });
  });
  await denied.goto("/app/test");
  await expect(
    denied.locator('.cab-storage-warning[role="status"]'),
  ).toContainText("Прогресс не сохранится");
  await expect(
    denied.getByRole("heading", { name: "Найдём твою точку старта" }),
  ).toBeVisible();
  await context.close();
});
test("mobile tour skips hidden targets and help remains usable", async ({
  page,
}) => {
  await init(page, 0, { showHomeTour: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app");
  const tour = page.getByRole("dialog", { name: "Тур по кабинету" });
  await expect(tour).toBeVisible();
  await expect(tour.getByText("1 из 2", { exact: true })).toBeVisible();
  await tour.getByRole("button", { name: "Пропустить", exact: true }).click();
  await page.getByRole("button", { name: "Справка и тур" }).click();
  await expect(tour).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tour).not.toBeVisible();
});
test("UI gallery modal returns focus and shelf scrolls by wheel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dev/cabinet-ui");
  const trigger = page.getByRole("button", {
    name: "Открыть диалог",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const shelf = page.locator(".cab-shelf");
  await shelf.hover();
  await page.mouse.wheel(0, 240);
  await expect
    .poll(() => shelf.evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(0);
});
test("project palette adds, moves and removes a component", async ({
  page,
}) => {
  await init(page);
  await page.goto("/app/projects");
  await page
    .getByRole("button", { name: "Создать проект", exact: true })
    .click();
  await dismissRewardDialogs(page);
  const basicCategory = page
    .locator(".kids-palette-group")
    .filter({ hasText: "Основные" });
  await basicCategory.getByTitle("Кнопка", { exact: true }).click();
  const added = page.locator('[data-component^="button-"]');
  await expect(added).toHaveCount(1);
  const body = added.getByRole("button", { name: /^Кнопка button/ });
  await body.click();
  const before = await added.evaluate((e) =>
    parseFloat((e as HTMLElement).style.left),
  );
  await body.press("ArrowLeft");
  await expect
    .poll(() =>
      added.evaluate((e) => parseFloat((e as HTMLElement).style.left)),
    )
    .toBeLessThan(before);
  await page
    .getByRole("toolbar", { name: "Инструменты схемы" })
    .getByRole("button", { name: "Удалить", exact: true })
    .click();
  await expect(added).toHaveCount(0);
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(added).toHaveCount(1);
});

test("help on a lesson opens the available tour targets", async ({ page }) => {
  await init(page);
  await page.goto("/app/lesson/lesson-1");
  await page.getByRole("button", { name: "Справка и тур" }).click();
  const tour = page.getByRole("dialog", { name: "Тур по кабинету" });
  await expect(tour).toBeVisible();
  await expect(tour.getByText("1 из 3", { exact: true })).toBeVisible();
  await tour.getByRole("button", { name: "Пропустить", exact: true }).click();
  await expect(tour).not.toBeVisible();
});

// Cabinet regression scenarios use the explicit guest session.
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
  ]);
});
