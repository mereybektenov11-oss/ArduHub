import { expect, test } from "@playwright/test";

test("hero stays readable with missing decorative images", async ({ page }) => {
  await page.route("**/images/landing/cobalt/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".landing-cobalt")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.locator(".hero").getByRole("link", { name: "Начать бесплатно" }),
  ).toBeVisible();
});

test("floating components stop for reduced motion and outside viewport", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const scene = page.locator(".hero-background");
  await expect(scene).toHaveAttribute("data-active", "true");
  const floating = page.locator(".hero-component-motion").first();
  await expect
    .poll(() =>
      floating.evaluate((e) => getComputedStyle(e).animationPlayState),
    )
    .toBe("running");
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-active", "false");
  await expect
    .poll(() =>
      floating.evaluate((e) => getComputedStyle(e).animationPlayState),
    )
    .toBe("paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => floating.evaluate((e) => getComputedStyle(e).animationName))
    .toBe("none");
});

for (const width of [360, 390, 768, 1440, 1920]) {
  test(`hero copy and decoration do not overlap at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const content = await page.locator(".hero-content").boundingBox();
    expect(content).not.toBeNull();
    for (const image of await page
      .locator(".hero-component img:visible")
      .all()) {
      const box = await image.boundingBox();
      if (!box || !content) continue;
      const overlap =
        box.x < content.x + content.width &&
        box.x + box.width > content.x &&
        box.y < content.y + content.height &&
        box.y + box.height > content.y;
      expect(overlap).toBe(false);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("product example can switch between an error and a corrected circuit", async ({
  page,
}) => {
  await page.goto("/");
  const demo = page.locator("#product-demo");
  await demo.getByRole("button", { name: "Найти ошибку" }).click();
  await expect(demo.locator(".circuit")).toHaveClass(/phase-error/);
  await demo.getByRole("button", { name: "Исправить соединение" }).click();
  await expect(demo.locator(".circuit")).toHaveClass(/phase-fixed/);
});

test("headline and navigation survive disabled JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.locator(".hero").getByRole("link", { name: "Начать бесплатно" }),
  ).toHaveAttribute("href", "/app");
  await context.close();
});

test("landing theme does not leak into cabinet or sign-in", async ({
  page,
}) => {
  for (const route of ["/app", "/sign-in"]) {
    await page.goto(route);
    await expect(page.locator(".landing-cobalt")).toHaveCount(0);
    expect(
      await page
        .locator("body")
        .evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--landing-primary").trim(),
        ),
    ).toBe("");
  }
});
