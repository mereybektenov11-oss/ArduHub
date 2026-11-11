import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../helpers/progressEvidence";

const routes = [
  "/app",
  "/app/map",
  "/app/practice",
  "/app/projects",
  "/app/ideas",
  "/app/leaderboard",
  "/app/shop",
  "/app/profile",
  "/app/lesson/lesson-1",
];
const forbidden =
  /гост[а-яё]*|демо[а-яё-]*|демонстрац[а-яё]*|скоро(?![а-яё])|в\s+разработке|заглушк[а-яё]*|учебная\s+модель|симуляци[а-яё]*|кэш[а-яё]*|\bJSON\b/iu;
async function seed(
  page: Page,
  options: { named?: boolean; completed?: boolean } = {},
) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const progress = createProgress();
  if (options.named) progress.profile.name = "Искра";
  progress.tourSeen = Object.fromEntries(routes.map((route) => [route, true]));
  if (options.completed) {
    progress.lessons["lesson-1"] = {
      ...progress.lessons["lesson-1"],
      ...completeEvidence("lesson-1"),
      status: "done",
      rewarded: true,
    };
    progress.achievements = {
      unlocked: ["first-light"],
      notified: ["first-light"],
      claimed: [],
    };
  }
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
  }, progress);
}

test("all cabinet pages have clean visible copy and no permanent account banner", async ({
  page,
}) => {
  await seed(page, { named: true });
  for (const route of routes) {
    await page.goto(route);
    // /app/profile uses the separate profile shell, not the dashboard shell.
    const shell = route === "/app/profile" ? ".profile-shell" : ".dash-shell";
    const main = route === "/app/profile" ? "#profile-main" : ".cab-main";
    await expect(page.locator(shell)).toBeVisible();
    await expect(page.locator(`${main} h1`).first()).toBeVisible();
    expect(await page.locator("body").innerText(), route).not.toMatch(
      forbidden,
    );
    await expect(page.locator(".dash-guest")).toHaveCount(0);
  }
});

test("first visit asks for a nickname and six avatars, then retains the chosen profile", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/app");
  const dialog = page.getByRole("dialog", { name: "Как тебя зовут?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Аватар / })).toHaveCount(6);
  await dialog.getByLabel("Твой ник").fill("РобоЛис");
  await dialog.getByRole("button", { name: "Аватар 4", exact: true }).click();
  await dialog.getByRole("button", { name: "Начать", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".dash-sidebar-foot")).toContainText("РобоЛис");
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Как тебя зовут?" }),
  ).toHaveCount(0);
  await expect(page.locator(".dash-sidebar-foot")).toContainText("РобоЛис");
});

test("save invitation is dismissible and does not return on reload; profile retains the action", async ({
  page,
}) => {
  await seed(page, { named: true, completed: true });
  await page.goto("/app");
  const dialog = page.getByRole("dialog", {
    name: "Сохрани прогресс",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.reload();
  await expect(page.locator(".dash-shell")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.goto("/app/profile");
  const save = page.getByRole("link", {
    name: "Сохранить прогресс",
    exact: true,
  });
  await expect(save).toBeVisible();
  await expect(save).toHaveAttribute("data-variant", "accent");
  await save.click();
  await expect(page).toHaveURL(/\/register$/);
});
