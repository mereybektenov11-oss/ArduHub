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
    await expect(page.getByLabel("Почта")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Продолжить", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
