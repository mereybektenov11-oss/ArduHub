import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { matchDeck } from "../../src/content/cabinet.ru";
async function init(page: Page, sparks = 0) {
  const p = createProgress();
  p.sparks = sparks;
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
  await page.goto("/app/mentor");
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
  for (const pin of ["K", "12", "5V", "K", "12", "5V"])
    await page.getByRole("button", { name: pin, exact: true }).click();
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
  await page.goto("/app/mentor");
  await expect(
    page.getByLabel("Выбрать наставника").locator('option[value="oma"]'),
  ).toHaveAttribute("disabled", "");
  await page.keyboard.press("Escape");
  await page.goto("/app/shop");
  const item = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Ома", exact: true }) });
  await item.getByRole("button", { name: "Купить", exact: true }).click();
  await page.goto("/app/mentor");
  await page.getByLabel("Выбрать наставника").selectOption("oma");
  await expect(page.getByLabel("Выбрать наставника")).toHaveValue("oma");
  await page.getByLabel("Выбрать наставника").selectOption("oma");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("arduhub.progress.v1")!).sparks,
    ),
  ).toBe(20);
});
test("corrupt and unavailable storage do not crash", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("arduhub.progress.v1", "{bad"),
  );
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
  await expect(denied.getByRole("status")).toContainText(
    "Прогресс не сохранится",
  );
  await expect(
    denied.getByRole("heading", { name: "Найдём твою точку старта" }),
  ).toBeVisible();
  await context.close();
});
test("mobile tour skips hidden targets and help remains usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/app");
  const tour = page.getByRole("dialog", { name: "Тур по кабинету" });
  await expect(tour).toBeVisible();
  await expect(tour.getByText("1 из 5", { exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Пустой проект +" }).click();
  await page
    .locator(".l2-palette")
    .getByTitle("Кнопка", { exact: true })
    .click();
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
    .locator(".l2-tools")
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
