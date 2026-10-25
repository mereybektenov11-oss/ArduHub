import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
test("project mentor actions live in the editor panel and open centered chat", async ({
  page,
}) => {
  const p = createProgress();
  p.profile.name = "Искра";
  p.tourSeen = { "/app/projects": true };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, p);
  await page.goto("/app/projects");
  await page
    .getByRole("button", { name: "Создать проект", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/projects\/[\w-]+$/);
  const panel = page.locator(".l2-workbar");
  await expect(
    panel.getByRole("button", { name: "Спросить наставника", exact: true }),
  ).toBeVisible({ timeout: 2500 });
  await expect(
    panel.getByRole("button", { name: "Разбор проекта", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Спросить наставника", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cab-chat")).toBeVisible();
});
