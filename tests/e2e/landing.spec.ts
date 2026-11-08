import { expect, test } from "@playwright/test";

test("primary landing actions open the real application", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator(".hero").getByRole("link", { name: "Начать бесплатно" }),
  ).toHaveAttribute("href", "/app");
  await expect(
    page
      .locator(".video-final")
      .getByRole("link", { name: "Начать бесплатно" }),
  ).toHaveAttribute("href", "/app");
  await expect(page.locator(".header .account")).toHaveAttribute(
    "href",
    "/sign-in",
  );
});

test("FAQ supports Enter, Space and arrow keys with only one open answer", async ({
  page,
}) => {
  await page.goto("/");
  const buttons = page.locator("#faq button");
  await buttons.nth(1).click();
  await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(buttons.nth(0)).toHaveAttribute("aria-expanded", "false");
  await buttons.nth(1).press("Space");
  await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "false");
  await buttons.nth(1).press("Enter");
  await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "true");
  await buttons.nth(1).press("ArrowDown");
  await expect(buttons.nth(2)).toBeFocused();
});

test("mobile navigation closes on Escape and returns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Открыть меню" });
  await trigger.click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("metadata and security headers remain available", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");
  expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page).toHaveTitle(/ArduHub/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Arduino/,
  );
  expect((await request.get("/privacy")).ok()).toBe(true);
  expect((await request.get("/robots.txt")).ok()).toBe(true);
});

test("circuit gallery remains independent of the new landing", async ({
  page,
}) => {
  await page.goto("/dev/circuits");
  const scene = page.locator(".circuit").first();
  await page.getByRole("button", { name: "Ошибка подключения" }).click();
  await expect(scene).toHaveClass(/phase-error/);
  await page.getByRole("button", { name: "Соединение исправлено" }).click();
  await expect(scene).toHaveClass(/phase-fixed/);
});
