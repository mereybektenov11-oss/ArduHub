import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { progressEvidence } from "../helpers/progressEvidence";

test.beforeEach(async ({ page }) => {
  const p = createProgress();
  p.profile.name = "Лис";
  p.tourSeen = { "/app": true };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((progress) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
    localStorage.setItem("arduhub.menu", JSON.stringify(["УЧЁБА", "ПРОЕКТЫ"]));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
  }, p);
});

test("home gives one next action, three first-screen blocks and two rail cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Привет, Лис!" }),
  ).toBeVisible();
  await expect(page.locator(".kids-home [data-home-block]")).toHaveCount(3);
  await expect(
    page
      .locator(".kids-continue")
      .getByRole("link", { name: "Продолжить", exact: true }),
  ).toHaveCount(1);
  await expect(page.locator(".flow-current-label")).toHaveCount(1);
  await expect(page.locator(".dash-node.current")).toBeInViewport();
  await expect(
    page.locator(".dash-node-title").getByText("Продолжить", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".dash-rail > .cab-card")).toHaveCount(2);
  await expect(page.locator(".kids-streak-day")).toHaveCount(7);
  await expect(page.locator(".kids-streak-day.is-active")).toHaveCount(0);
  await expect(page.locator(".kids-level-ring")).toBeVisible();
  await page.screenshot({ path: "reports/g2/home-1440.png" });
  await expect(
    page.locator(".group-label").filter({ has: page.locator("button") }),
  ).toHaveCount(0);
  await expect(
    page.locator(".dash-sidebar").getByRole("link", { name: "Мои проекты" }),
  ).toBeVisible();
  const details = page.locator(".kids-path-chapter");
  await expect(details.first()).toHaveAttribute("open", "");
  await expect(details.nth(1)).not.toHaveAttribute("open", "");
  const diagnostic = page.locator(".kids-diagnostic");
  expect((await diagnostic.boundingBox())!.y).toBeGreaterThanOrEqual(900);
  await diagnostic.getByRole("button", { name: "Закрыть" }).click();
  await page.reload();
  await expect(diagnostic).toHaveCount(0);
});

for (const width of [390, 900, 1199]) {
  test(`home is usable at ${width}px without duplicate rail or overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/app");
    await expect(page.locator(".dash-rail")).toBeHidden();
    if (width === 390)
      await page.screenshot({
        path: "reports/g2/home-390.png",
        fullPage: true,
      });
    const search = page
      .getByRole("button", { name: "Поиск", exact: true })
      .filter({ visible: true });
    await expect(search).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await search.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}

test("finishing chapter one opens chapter two and keeps the single current node", async ({
  page,
}) => {
  const p = createProgress();
  p.profile.name = "Лис";
  p.tourSeen = { "/app": true };
  for (let number = 1; number <= 6; number++) {
    const id = `lesson-${number}`;
    p.lessons[id] = {
      ...p.lessons[id],
      ...progressEvidence(id),
      status: "done",
    };
  }
  await page.addInitScript((progress) => {
    localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
    localStorage.setItem("arduhub.diagnostic-invite.local", "dismissed");
  }, p);
  await page.goto("/app");
  const prompt = page.getByRole("dialog", { name: "Сохрани прогресс" });
  if (await prompt.isVisible())
    await prompt.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".kids-continue h2")).toContainText(
    "Продолжи: Урок 7",
  );
  await expect(page.locator(".kids-path-chapter").first()).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator(".kids-path-chapter").nth(1)).toHaveAttribute(
    "open",
    "",
  );
  await expect(
    page.locator(".kids-path-chapter").first().locator("summary"),
  ).toContainText("6 из 6");
  await expect(page.locator(".dash-node.current")).toHaveCount(1);
  await expect(page.locator(".flow-current-label")).toBeVisible();
});
