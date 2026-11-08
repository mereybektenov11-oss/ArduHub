import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage follows the compact video structure and contains own video sources", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing-video")).toBeVisible();
  await expect(page.locator(".hero-component")).toHaveCount(0);
  await expect(page.locator(".dot-backdrop")).toBeVisible();
  await expect(page.locator(".video-frame video")).toHaveCount(4);
  await expect(page.locator(".video-feature")).toHaveCount(3);
  await expect(page.locator(".benefit-card")).toHaveCount(4);
  await expect(page.locator("#bank,#modes,.stats-section")).toHaveCount(0);
  await page.locator(".video-frame").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".video-frame video").first()).toHaveAttribute(
    "src",
    /\/videos\/landing\/.*\.mp4$/,
  );
});

test("videos play in view, pause offscreen and respect a manual pause", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const frame = page.locator(".video-frame").first();
  const video = frame.locator("video");
  await frame.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(false);
  await frame.getByRole("button", { name: "Приостановить видео" }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await frame.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await frame.getByRole("button", { name: "Воспроизвести видео" }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(false);
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
});

test("reduced motion retains posters and allows explicit playback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const frame = page.locator(".video-frame").first();
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.locator("video")).toHaveAttribute("poster", /\.webp$/);
  await expect
    .poll(() =>
      frame.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(true);
  await frame.getByRole("button", { name: "Воспроизвести видео" }).click();
  await expect
    .poll(() =>
      frame.locator("video").evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(false);
});

test("media failures leave a poster and a readable fallback", async ({
  page,
}) => {
  await page.route("**/videos/landing/*.mp4", (route) => route.abort());
  await page.goto("/");
  const frame = page.locator(".video-frame").first();
  await frame.scrollIntoViewIfNeeded();
  await expect(
    frame.getByText("Видео недоступно. Попробуй обновить страницу."),
  ).toBeVisible();
  await expect(frame.locator("video")).toHaveAttribute("poster", /\.webp$/);
});

for (const width of [360, 390, 768, 1440, 1920])
  test(`compact landing fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const link of await page
      .locator('.header a[href^="#"],.footer a[href^="#"]')
      .all()) {
      const href = await link.getAttribute("href");
      await expect(page.locator(href!)).toHaveCount(1);
    }
  });

test("FAQ and text remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".faq-answer:visible")).toHaveCount(6);
  await expect(page.locator(".video-frame video").first()).toHaveAttribute(
    "poster",
    /\.webp$/,
  );
  await context.close();
});

test("video landing has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
});
