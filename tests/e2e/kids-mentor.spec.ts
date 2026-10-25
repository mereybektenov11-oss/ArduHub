import { test, expect, type Page } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../helpers/progressEvidence";

async function prepare(page: Page, hints = true) {
  const progress = createProgress();
  progress.profile.name = "Искра";
  progress.settings = { ...progress.settings!, mentorHints: hints };
  progress.tourSeen = Object.fromEntries(
    [
      "/app",
      "/app/map",
      "/app/practice",
      "/app/projects",
      "/app/ideas",
      "/app/leaderboard",
      "/app/shop",
      "/app/profile",
      "/app/lesson/lesson-1",
    ].map((path) => [path, true]),
  );
  const evidence = completeEvidence("lesson-1");
  evidence.stages.practice = false;
  evidence.practice = { circuit: false, code: false, run: false };
  progress.lessons["lesson-1"] = {
    ...progress.lessons["lesson-1"],
    ...evidence,
    status: "current",
  };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
  }, progress);
  await page.route("**/api/lesson-video?*", (route) =>
    route.fulfill({ status: 200, json: {} }),
  );
}

test("general pages have no floating mentor and reject mentor-open events", async ({
  page,
}) => {
  await prepare(page);
  for (const path of [
    "/app",
    "/app/map",
    "/app/practice",
    "/app/projects",
    "/app/ideas",
    "/app/leaderboard",
    "/app/shop",
    "/app/profile",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.locator('[data-testid="mentor-fab"], .polish-mentor-fab'),
    ).toHaveCount(0);
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent("arduhub:mentor-open", { detail: {} }),
      ),
    );
    await expect(page.locator(".cab-chat")).toHaveCount(0);
  }
});

test("two failed practice checks show one dismissible nudge; direct entry opens centered chat", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/app/lesson/lesson-1?stage=practice");
  const check = page.getByRole("button", {
    name: "Проверить схему",
    exact: true,
  });
  await expect(check).toBeVisible();
  await page.clock.install();
  await check.click();
  await expect(page.locator(".kids-mentor-nudge")).toHaveCount(0);
  await check.click();
  await page.clock.runFor(1000);
  await expect(page.locator(".kids-mentor-nudge")).toBeVisible();
  await page
    .getByRole("button", { name: "Закрыть подсказку", exact: true })
    .click();
  await check.click();
  await check.click();
  await page.clock.runFor(181_000);
  await expect(page.locator(".kids-mentor-nudge")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Спросить наставника", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cab-chat")).toBeVisible();
});

test("disabled hints suppress both nudge timers but retain direct mentor access", async ({
  page,
}) => {
  await prepare(page, false);
  await page.goto("/app/lesson/lesson-1?stage=practice");
  const check = page.getByRole("button", {
    name: "Проверить схему",
    exact: true,
  });
  await expect(check).toBeVisible();
  await page.clock.install();
  await check.click();
  await check.click();
  await page.clock.runFor(181_000);
  await expect(page.locator(".kids-mentor-nudge")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Спросить наставника", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".cab-chat")).toBeVisible();
});
