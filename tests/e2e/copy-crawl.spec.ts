import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../helpers/progressEvidence";

// Learning moved to the desktop app; the site keeps the profile area.
const routes = [
  "/app/profile",
  "/app/profile/progress",
  "/app/profile/settings",
  "/app/profile/desktop",
  "/app/pricing",
  "/app/docs",
  "/app/docs/workspace",
  "/app/docs/components",
  "/app/docs/code",
];
const forbidden =
  /гост[а-яё]*|демо[а-яё-]*|демонстрац[а-яё]*|скоро(?![а-яё])|заглушк[а-яё]*|учебная\s+модель|симуляци[а-яё]*|кэш[а-яё]*|\bJSON\b/iu;
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

test("all profile pages have clean visible copy and no permanent account banner", async ({
  page,
}) => {
  await seed(page, { named: true });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator(".profile-shell")).toBeVisible();
    await expect(page.locator("#profile-main h1").first()).toBeVisible();
    expect(await page.locator("body").innerText(), route).not.toMatch(
      forbidden,
    );
    await expect(page.locator(".dash-guest")).toHaveCount(0);
  }
});
