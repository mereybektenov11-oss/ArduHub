import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const viewport of [
  { width: 862, height: 327 },
  { width: 390, height: 480 },
  { width: 1440, height: 900 },
]) {
  for (const route of ["register", "sign-in"]) {
    test(`${route} keeps its beginning visible through all steps at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/${route}`);
      if (route === "sign-in") {
        await expect(page.getByLabel("Почта")).toBeVisible();
        await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Продолжить", exact: true }),
        ).toHaveCount(0);
      }
      const steps = route === "register" ? 3 : 2;
      for (let step = 0; step < steps; step++) {
        const field =
          step === 0
            ? page.getByLabel("Почта")
            : step === 1
              ? page.getByLabel("Пароль", { exact: true })
              : page.getByLabel("Повтори пароль");
        await field.fill(step === 0 ? "qa@example.org" : "TestPassword123!");
        await field.focus();
        await expect
          .poll(() =>
            page.evaluate(() => {
              const brand = document
                .querySelector(".signup-brand")!
                .getBoundingClientRect();
              const title = document
                .querySelector("h1")!
                .getBoundingClientRect();
              const card = document
                .querySelector(".auth-card")!
                .getBoundingClientRect();
              return (
                brand.top >= 0 &&
                title.top >= 0 &&
                title.bottom <= innerHeight &&
                card.top >= 0 &&
                card.bottom <= innerHeight + 1 &&
                scrollY === 0
              );
            }),
          )
          .toBe(true);
        await page
          .locator(".signup-scroll")
          .evaluate((el) => (el.scrollTop = el.scrollHeight));
        expect(
          await page
            .locator(".signup-brand")
            .evaluate((el) => el.getBoundingClientRect().top),
        ).toBeGreaterThanOrEqual(0);
        expect(
          await page
            .locator("h1")
            .evaluate((el) => el.getBoundingClientRect().top),
        ).toBeGreaterThanOrEqual(0);
        if (route === "register" && step < steps - 1)
          await page
            .getByRole("button", { name: "Продолжить", exact: true })
            .click();
      }
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact!),
        ),
      ).toEqual([]);
    });
  }
}

test("glass login submits real credentials and preserves recovery and mode switching", async ({
  page,
}) => {
  await page.route("**/auth/v1/token**", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      email: "qa@example.org",
      password: "TestPassword123!",
    });
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "invalid_credentials",
        msg: "Invalid login credentials",
      }),
    });
  });
  await page.goto("/sign-in");
  await page.getByLabel("Почта").fill("QA@Example.ORG");
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.locator("#auth-error")).toContainText(
    "Неверная почта или пароль",
  );
  await page.getByRole("button", { name: "Забыли пароль?" }).click();
  await expect(
    page.getByRole("heading", { name: "Восстановить пароль" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByRole("button", { name: "Регистрация", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Начни создавать с нами" }),
  ).toBeVisible();
});
