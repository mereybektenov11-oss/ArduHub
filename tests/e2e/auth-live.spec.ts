import { test, expect } from "@playwright/test";

test("live login loads the account, survives reopening, and logout protects the cabinet", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(
    !process.env.E2E_AUTH_EMAIL || !process.env.E2E_AUTH_PASSWORD,
    "Dedicated live QA account required",
  );
  test.setTimeout(60000);
  const enter = async (target: typeof page, password: string) => {
    if (await target.getByLabel("Почта").count()) {
      await target.getByLabel("Почта").fill(process.env.E2E_AUTH_EMAIL!);
    }
    await target.getByLabel("Пароль", { exact: true }).fill(password);
    await target.getByRole("button", { name: "Войти", exact: true }).click();
  };
  await page.goto("/sign-in");
  await enter(page, "DefinitelyWrongPassword-123!");
  await expect(page.locator("#auth-error")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
  const receipts = page.waitForResponse(
    (r) =>
      r.url().includes("/rest/v1/user_achievements") &&
      r.request().method() === "GET",
  );
  await enter(page, process.env.E2E_AUTH_PASSWORD!);
  await expect(page).toHaveURL(/\/app$/);
  expect((await receipts).status()).toBe(200);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("arduhub.active-user")),
    )
    .toBeTruthy();
  const context = await browser.newContext({
    storageState: await page.context().storageState(),
  });
  try {
    const reopened = await context.newPage();
    await reopened.goto(baseURL + "/app/profile");
    await expect(reopened).toHaveURL(/\/app\/profile$/);
    await expect(
      reopened.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
    await reopened.reload();
    await expect(
      reopened.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
    await reopened.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(reopened).toHaveURL(/\/sign-in$/);
    await reopened.goto(baseURL + "/app/profile");
    await expect(reopened).toHaveURL(/\/sign-in$/);
    await enter(reopened, process.env.E2E_AUTH_PASSWORD!);
    await expect(reopened).toHaveURL(/\/app$/);
  } finally {
    await context.close();
  }
});
