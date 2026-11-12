import { test, expect } from "@playwright/test";

test("existing account registration asks to sign in without promising an email", async ({
  page,
}) => {
  await page.route("**/auth/v1/signup**", (route) => {
    expect(route.request().postDataJSON().email).toBe("qa@example.org");
    return route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        code: "user_already_exists",
        error_code: "user_already_exists",
        msg: "User already registered",
      }),
    });
  });
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Регистрация", exact: true })
    .first()
    .click();
  await page.getByLabel("Почта").fill("QA@Example.ORG");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Повтори пароль").fill("TestPassword123!");
  await page.getByLabel("Как к тебе обращаться").fill("Проверка");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Зарегистрироваться как ученик" })
    .click();
  await expect(page.locator("#auth-error")).toContainText(
    "Эта почта уже зарегистрирована",
  );
  await expect(page.getByText("Проверь почту:", { exact: false })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "С возвращением", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-auth-mode", "login");
});

test("registration does not claim an email was sent when Supabase rejects delivery", async ({
  page,
}) => {
  await page.route("**/auth/v1/signup**", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        code: "email_address_not_authorized",
        error_code: "email_address_not_authorized",
        msg: "Email address not authorized",
      }),
    }),
  );
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Регистрация", exact: true })
    .first()
    .click();
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Повтори пароль").fill("TestPassword123!");
  await page.getByLabel("Как к тебе обращаться").fill("Проверка");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Зарегистрироваться как ученик" })
    .click();
  await expect(page.locator("#auth-error")).toContainText(
    "Отправка писем пока не настроена",
  );
  await expect(page.getByText("Проверь почту:", { exact: false })).toHaveCount(
    0,
  );
});

test("password recovery reports delivery failure instead of success", async ({
  page,
}) => {
  await page.route("**/auth/v1/recover**", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({
        code: "email_address_not_authorized",
        error_code: "email_address_not_authorized",
        msg: "Email address not authorized",
      }),
    }),
  );
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Забыли пароль?" }).click();
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.locator("form .auth-primary").click();
  await expect(page.locator("#auth-error")).toContainText(
    "Не удалось отправить письмо",
  );
});
