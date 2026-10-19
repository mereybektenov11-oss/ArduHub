import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
test("configured account: import guest progress and reopen it in another browser", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.E2E_AUTH_EMAIL ||
      !process.env.E2E_AUTH_PASSWORD,
    "Requires a configured Supabase project and a dedicated confirmed test account.",
  );
  const p = createProgress();
  p.lessons["lesson-1"] = { status: "done", attempts: 1, bestErrors: 0 };
  p.tourSeen = { "/app": true };
  await page.addInitScript(
    (p) => localStorage.setItem("arduhub.progress.v1", JSON.stringify(p)),
    p,
  );
  await page.goto("/sign-in");
  await page.getByLabel("Почта").fill(process.env.E2E_AUTH_EMAIL!);
  await page
    .getByLabel("Пароль", { exact: true })
    .fill(process.env.E2E_AUTH_PASSWORD!);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Перенести прогресс гостя?" })
    .getByRole("button", { name: "Перенести", exact: true })
    .click();
  await expect(page.locator(".dash-node.done").first()).toBeVisible();
  await page.waitForTimeout(2000);
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await other.goto("http://127.0.0.1:3100/sign-in");
    await other.getByLabel("Почта").fill(process.env.E2E_AUTH_EMAIL!);
    await other
      .getByLabel("Пароль", { exact: true })
      .fill(process.env.E2E_AUTH_PASSWORD!);
    await other.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(other.locator(".dash-node.done").first()).toBeVisible();
    await other.goto("http://127.0.0.1:3100/app/profile");
    await other.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(other).toHaveURL(/sign-in/);
  } finally {
    await second.close();
  }
});
