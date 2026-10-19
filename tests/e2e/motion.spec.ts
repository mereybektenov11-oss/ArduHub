import { test, expect } from "@playwright/test";
import { motionTokens } from "../../src/lib/motion";

test.use({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});

test("Reveal interpolates opacity, displacement and blur, then releases will-change", async ({
  page,
}) => {
  await page.goto("/dev/motion");
  const reveal = page.locator(".reveal");
  await expect(reveal).toHaveCSS("opacity", "0");
  await reveal.scrollIntoViewIfNeeded();
  await expect(reveal).toHaveAttribute("data-in-view", "true");
  await page.waitForTimeout(150);
  const middle = await reveal.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      opacity: Number(style.opacity),
      duration: parseFloat(style.transitionDuration),
      y: new DOMMatrixReadOnly(style.transform).m42,
      blur: style.filter,
    };
  });
  expect(middle.opacity).toBeGreaterThan(0);
  expect(middle.opacity).toBeLessThan(1);
  expect(middle.duration).toBeGreaterThanOrEqual(0.7);
  expect(middle.y).toBeGreaterThan(0);
  expect(middle.y).toBeLessThan(motionTokens.reveal.y);
  expect(middle.blur).not.toBe("blur(0px)");
  await expect(reveal).toHaveCSS("opacity", "1");
  await expect(reveal).toHaveCSS("filter", "blur(0px)");
  await expect(reveal).toHaveCSS("will-change", "auto");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(reveal).toHaveCSS("opacity", "1");
});

test("four Stagger items start 110ms apart", async ({ page }) => {
  await page.goto("/dev/motion");
  await expect(page.locator(".stagger")).toHaveAttribute(
    "data-motion-ready",
    "true",
  );
  await expect(page.locator(".stagger-item").last()).toHaveCSS("opacity", "0");
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>(".stagger-item").forEach((el) => {
      el.addEventListener("transitionstart", (event) => {
        if (event.propertyName === "opacity")
          el.dataset.started = String(performance.now());
      });
    });
  });
  const items = page.locator(".stagger-item");
  await page.locator(".stagger").scrollIntoViewIfNeeded();
  await expect(items.last()).toHaveAttribute("data-started", /\d/);
  const times = await items.evaluateAll((elements) =>
    elements.map((el) => ({
      start: Number((el as HTMLElement).dataset.started),
      delay: parseFloat(getComputedStyle(el).transitionDelay),
    })),
  );
  for (let i = 1; i < times.length; i++) {
    const delay = (times[i].delay - times[i - 1].delay) * 1000;
    expect(delay).toBeGreaterThanOrEqual(90);
    expect(delay).toBeLessThanOrEqual(120);
    // Browser frame quantisation can add one frame to an observed event gap.
    expect(times[i].start - times[i - 1].start).toBeGreaterThan(85);
    expect(times[i].start - times[i - 1].start).toBeLessThan(135);
  }
  await expect(items.last()).toHaveCSS("opacity", "1");
});

test("reduced motion immediately shows every item, including when switched during motion", async ({
  page,
}) => {
  await page.goto("/dev/motion");
  await page.locator(".stagger").scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const el of await page.locator(".reveal, .stagger-item").all()) {
    await expect(el).toHaveCSS("opacity", "1");
    await expect(el).toHaveCSS("transform", "none");
    await expect(el).toHaveCSS("filter", "none");
    await expect(el).toHaveCSS("will-change", "auto");
  }
  await page.reload();
  await expect(page.locator(".stagger-item").last()).toHaveCSS("opacity", "1");
});

test("motion content stays visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/dev/motion");
  for (const el of await page.locator(".reveal, .stagger-item").all()) {
    await expect(el).toHaveCSS("opacity", "1");
  }
  await context.close();
});
