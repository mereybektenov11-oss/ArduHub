import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("benefit cards expand on hover and keyboard focus with themed content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#learning");
  const cards = page.locator(".benefit-card");
  const toggles = page.locator(".benefit-toggle");
  await expect(page.locator('.benefit-card[data-expanded="true"]')).toHaveCount(
    0,
  );
  for (const summary of await page.locator(".benefit-summary").all()) {
    expect(
      await summary.evaluate(
        (element) => element.scrollHeight <= element.clientHeight,
      ),
    ).toBe(true);
  }
  await cards.nth(1).hover();
  await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(async () => {
      const expanded = await cards.nth(1).boundingBox();
      const collapsed = await cards.nth(0).boundingBox();
      return expanded!.width - collapsed!.width;
    })
    .toBeGreaterThan(100);
  await expect(cards.nth(1).locator(".benefit-side-art")).toHaveCount(0);
  await expect(cards.nth(1).locator(".benefit-more")).toHaveAttribute(
    "aria-hidden",
    "false",
  );
  await toggles.nth(1).focus();
  await page.keyboard.press("ArrowRight");
  await expect(toggles.nth(2)).toBeFocused();
  await expect(toggles.nth(2)).toHaveAttribute("aria-expanded", "true");
  await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "false");
  await page.locator(".video-intro h2").last().hover();
  await toggles.nth(2).blur();
  await expect(page.locator('.benefit-card[data-expanded="true"]')).toHaveCount(
    0,
  );
});

test("benefit cards support touch and reduced motion without clipping", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/#learning");
  const cards = page.locator(".benefit-card");
  await expect(page.locator('.benefit-card[data-expanded="true"]')).toHaveCount(
    0,
  );
  await cards.nth(3).locator(".benefit-toggle").tap();
  await expect(cards.nth(3).locator(".benefit-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(cards.nth(3)).toHaveCSS("transition-duration", "0s");
  const bounds = await cards.nth(3).evaluate((card) => {
    const box = card.getBoundingClientRect();
    const copy = card.querySelector(".benefit-copy")!.getBoundingClientRect();
    return {
      fits: copy.bottom <= box.bottom && copy.top >= box.top,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(bounds).toEqual({ fits: true, overflow: false });
  await cards.nth(3).locator(".benefit-toggle").tap();
  await expect(page.locator('.benefit-card[data-expanded="true"]')).toHaveCount(
    0,
  );
  await context.close();
});

test("homepage follows the compact video structure and contains own video sources", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing-video")).toBeVisible();
  await expect(page.locator(".hero-component")).toHaveCount(0);
  await expect(page.locator(".code-backdrop")).toBeVisible();
  // Migrated CTAs use TextureButton variants instead of the iridescent glass.
  for (const selector of [
    ".hero a[data-slot='texture-button']",
    ".header .account",
    "#access a[data-slot='texture-button']",
    ".faq-item button",
  ]) {
    expect(
      await page
        .locator(selector)
        .first()
        .evaluate((element) =>
          getComputedStyle(element).backgroundImage.includes("radial-gradient"),
        ),
    ).toBe(false);
  }
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

test("landing CTAs and header controls use TextureButton variants", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const scope of [".hero", "#access"]) {
    const cta = page.locator(scope).getByRole("link", {
      name: "Начать бесплатно",
    });
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveAttribute("data-slot", "texture-button");
    await expect(cta).toHaveAttribute("data-variant", "glass");
    await expect(cta).toHaveAttribute("data-size", "lg");
    await expect(cta).toHaveAttribute("href", "/app");
    await expect(cta).toContainText("↗");
  }
  const account = page.locator(".header .account");
  await expect(account).toBeVisible();
  await expect(account).toHaveAttribute("data-variant", "secondary");
  await expect(account).toHaveAttribute("href", "/sign-in");
  await expect(account).toHaveText(/В кабинет/);
  await expect(page.locator(".menu-toggle")).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(account).toBeHidden();
  const toggle = page.getByRole("button", { name: "Открыть меню" });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("data-variant", "icon");
  await expect(toggle).toHaveAttribute("data-size", "icon");
  await expect(toggle).toHaveAttribute("type", "button");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const close = page.getByRole("button", { name: "Закрыть меню" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "В кабинет" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(menu).toBeVisible();
  await close.click();
  await expect(menu).toHaveCount(0);
});

test("videos play in view and pause offscreen or in a hidden tab", async ({
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
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
});

test("reduced motion retains static posters without overlay controls", async ({
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
  await expect(page.locator(".video-toggle,.code-motion-toggle")).toHaveCount(
    0,
  );
});

test("changing reduced motion stops and resumes automatic playback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const frame = page.locator(".video-frame").first();
  const video = frame.locator("video");
  await frame.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
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

for (const width of [360, 768, 1440])
  test(`TextureButton landing has no serious axe violations at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[data-slot='texture-button']")).toHaveCount(4);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  });
