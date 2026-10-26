import { test, expect } from "@playwright/test";

test("icon gallery distinguishes live, extinguished and reduced-motion flames", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/dev/icons");
  await expect(
    page.locator('[data-icon="streak"][data-state="active"]').first(),
  ).toBeVisible();
  const activeAnimation = await page
    .locator('[data-icon="streak"][data-state="active"]')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(activeAnimation).not.toBe("none");
  const noneAnimation = await page
    .locator('[data-icon="streak"][data-state="none"]')
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(noneAnimation).toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await page
    .locator(".ardu-icon, .ardu-icon *")
    .evaluateAll((elements) =>
      elements.map((el) => getComputedStyle(el).animationName),
    );
  expect(animations.every((animation) => animation === "none")).toBe(true);
});
