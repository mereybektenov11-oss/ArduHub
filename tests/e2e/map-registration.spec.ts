import { createProgress } from "../../src/domain/seed";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

test("registration is directly available from desktop and mobile navigation", async ({
  page,
}) => {
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const desktop = page.locator(".desktop-nav");
    if (await desktop.isVisible()) {
      await desktop
        .getByRole("link", { name: "Регистрация", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Открыть меню", exact: true })
        .click();
      await page
        .locator(".mobile-menu")
        .getByRole("link", { name: "Регистрация", exact: true })
        .click();
    }
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByLabel("Как к тебе обращаться")).toBeVisible();
    await expect(
      page.getByText("Без письма с подтверждением.", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("island stays inside its column at desktop zoom and mobile widths", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "arduhub-guest", value: "1", url: baseURL! }]);
  const progress = createProgress();
  progress.profile.name = "Лис";
  progress.tourSeen = { "/app/map": true };
  await page.addInitScript(
    (p) => localStorage.setItem("arduhub.progress.v1", JSON.stringify(p)),
    progress,
  );
  await page.goto("/app/map");
  await expect(page.locator(".island-map-stage")).toBeVisible();
  for (const width of [1920, 1512, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const map = await page.locator(".island-map-stage").boundingBox();
    const main = await page.locator("#cab-main").boundingBox();
    expect(map!.x + map!.width).toBeLessThanOrEqual(main!.x + main!.width + 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    if (await page.locator(".dash-rail").isVisible()) {
      const rail = await page.locator(".dash-rail").boundingBox();
      expect(
        map!.x + map!.width <= rail!.x + 1 ||
          map!.y + map!.height <= rail!.y + 1,
      ).toBeTruthy();
    }
  }
});

test("new account opens immediately without email and survives a new browser context", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.E2E_LIVE_SIGNUP !== "true",
    "Explicit live signup verification only",
  );
  const email = `arduhub-qa-${randomUUID()}@example.org`;
  const password = `QA-${randomUUID()}!`;
  await page.goto("/register");
  await expect(
    page.getByRole("button", { name: "Регистрация", exact: true }).first(),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Как к тебе обращаться").fill("Проверка входа");
  await page.getByLabel("Почта").fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByLabel("Повтори пароль").fill(password);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Зарегистрироваться как ученик" })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Проверь почту:", { exact: false })).toHaveCount(
    0,
  );
  const state = await page.context().storageState();
  const authCookies = state.cookies.filter((c) => c.name.startsWith("sb-"));
  expect(authCookies.length).toBeGreaterThan(0);
  expect(
    authCookies.every((c) => c.expires > Date.now() / 1000 + 86400),
  ).toBeTruthy();
  const reopened = await browser.newContext({ storageState: state });
  try {
    const other = await reopened.newPage();
    await other.goto(baseURL + "/app/profile");
    await expect(other).toHaveURL(/\/app\/profile$/);
    await expect(
      other.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
  } finally {
    await reopened.close();
  }
});
