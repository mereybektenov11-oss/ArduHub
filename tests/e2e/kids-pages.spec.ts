import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
async function seed(page: Page, mistakes = 0) {
  const p = createProgress();
  p.profile.name = "Искра";
  p.tourSeen = Object.fromEntries(
    [
      "/app/practice",
      "/app/projects",
      "/app/ideas",
      "/app/leaderboard",
      "/app/profile",
      "/app/shop",
    ].map((route) => [route, true]),
  );
  p.reviewQueue = Array.from({ length: mistakes }, (_, i) => ({
    termOrLessonId: "lesson-1",
    errorCode: "led_reversed",
    addedAt: `2026-10-25T10:00:0${i}Z`,
  }));
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((progress) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
  }, p);
}
for (const count of [0, 2])
  test(`practice has two tabs and review only for ${count} pending mistakes`, async ({
    page,
  }) => {
    await seed(page, count);
    await page.goto("/app/practice");
    await expect(page.locator(".polish-practice-tabs a")).toHaveCount(2);
    await expect(page.locator(".kids-games a")).toHaveCount(3);
    await expect(page.locator(".cab-topic-picks")).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: `Повторить ошибки (${count})`,
        exact: true,
      }),
    ).toHaveCount(count ? 1 : 0);
    if (count) {
      await page.locator(".kids-review-card a").click();
      await expect(page.locator(".cab-forgotten")).toHaveCount(2);
    }
    await page.getByRole("link", { name: "Словарь", exact: true }).click();
    await expect(
      page.locator(".polish-practice-tabs a[aria-current='page']"),
    ).toHaveText("Словарь");
  });
test("projects stay empty until creation; ideas carry previews, parts and stars", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/projects");
  await expect(page.locator(".kids-project-empty")).toBeVisible();
  await expect(page.locator(".l2-project-grid > section")).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toBeHidden();
  await expect(
    page
      .locator(".kids-project-empty")
      .getByRole("button", { name: "Создать проект", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("arduhub.projects.v1") || '{"projects":[]}',
        ).projects,
    ),
  ).toEqual([]);
  await page.goto("/app/ideas");
  await expect(page.locator(".l2-project-preview")).toHaveCount(8);
  await expect(page.locator(".kids-difficulty > span")).toHaveCount(24);
  await expect(page.locator(".kids-required-parts").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Начать →", exact: true }),
  ).toHaveCount(8);
});
test("profile preferences persist together and mentor selection is reachable", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/profile");
  const sound = page.getByRole("switch", { name: "Звуки", exact: true });
  const hints = page.getByRole("switch", {
    name: "Подсказки наставника",
    exact: true,
  });
  await expect(sound).toBeChecked();
  await sound.uncheck();
  await hints.uncheck();
  await page.getByLabel("Размер текста", { exact: true }).selectOption("1.15");
  await page.reload();
  await expect(sound).not.toBeChecked();
  await expect(hints).not.toBeChecked();
  await expect(page.getByLabel("Размер текста", { exact: true })).toHaveValue(
    "1.15",
  );
  await expect(
    page.getByRole("link", { name: "Сохранить прогресс", exact: true }),
  ).toHaveAttribute("href", "/register");
  await page.locator(".kids-mentor-picker summary").click();
  await expect(page.locator(".kids-mentor-choices")).toBeVisible();
  await expect(page.getByTestId("mentor-fab")).toHaveCount(0);
});
test("shop switches three actual groups and empty leaderboard invents no rank", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app/shop");
  await expect(page.locator(".kids-sparks")).toContainText("0");
  const tabs = page.getByRole("group", { name: "Магазин", exact: true });
  await expect(tabs.getByRole("button")).toHaveCount(3);
  await tabs.getByRole("button", { name: "Бусты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Набор подсказок", exact: true }),
  ).toBeVisible();
  await tabs.getByRole("button", { name: "Рамки", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Янтарная рамка", exact: true }),
  ).toBeVisible();
  await page.goto("/app/leaderboard");
  await expect(page.getByText("Стань первым!", { exact: true })).toBeVisible();
  await expect(page.locator(".kids-own-rank")).toHaveCount(0);
});
