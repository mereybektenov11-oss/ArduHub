import { expect, test } from "@playwright/test";

for (const width of [360, 768, 1440])
  test(`enlarged landing text remains readable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("homepage theme does not leak into cabinet or sign-in", async ({
  page,
}) => {
  for (const route of ["/app", "/sign-in"]) {
    await page.goto(route);
    await expect(page.locator(".landing-video")).toHaveCount(0);
    expect(
      await page
        .locator("body")
        .evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--lv-primary").trim(),
        ),
    ).toBe("");
  }
});
