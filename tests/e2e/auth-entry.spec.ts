import { test, expect } from "@playwright/test";

for (const width of [360, 1440]) {
  test(`sign-in entry opens authentication even with a saved guest session at ${width}`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page
      .context()
      .addCookies([{ name: "arduhub-guest", value: "1", url: baseURL! }]);
    await page.goto("/");
    if (width === 360)
      await page
        .getByRole("button", { name: "Открыть меню", exact: true })
        .click();
    const entry = page
      .getByRole("link", { name: "Войти", exact: true })
      .filter({ visible: true })
      .first();
    await expect(entry).toHaveAttribute("href", "/sign-in");
    await entry.click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page.getByRole("heading", { name: "С возвращением", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Регистрация", exact: true }).first(),
    ).toBeVisible();
  });
}
