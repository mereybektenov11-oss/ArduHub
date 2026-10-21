import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { motionTokens } from "../../src/lib/motion";

test.use({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});

test("hero layers drift, remain readable and are static with reduced motion", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const cards = page.locator(".hero-drift");
  await expect(cards).toHaveCount(6);
  const before = await cards.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).transform),
  );
  await page.waitForTimeout(10_000);
  const after = await cards.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).transform),
  );
  before.forEach((value, i) => expect(after[i]).not.toBe(value));
  for (let sample = 0; sample < 5; sample++) {
    const results = await new AxeBuilder({ page }).include(".hero").analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  }
  await page.screenshot({
    path: "reports/screenshots/hero-motion-desktop.png",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".hero-background")
      .evaluate(
        (el) =>
          el
            .getAnimations({ subtree: true })
            .filter((a) => a.playState === "running").length,
      ),
  ).toBe(0);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator(".hero-drift:visible")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "reports/screenshots/hero-motion-mobile.png" });
});

test("feature cards reveal together, wires draw only on entry, then mini demos finish", async ({
  page,
}) => {
  await page.goto("/");
  const grid = page.locator(".features-grid");
  const cards = grid.locator(":scope > .stagger-item");
  const wire = grid.locator(".editor-preview .wire").first();
  await expect(cards.first()).toHaveCSS("opacity", "0");
  await expect(wire).toHaveCSS("stroke-dashoffset", "1px");
  await grid.scrollIntoViewIfNeeded();
  await expect(grid).toHaveAttribute("data-in-view", "true");
  await page.waitForTimeout(150);
  const opacities = await cards.evaluateAll((els) =>
    els.map((el) => Number(getComputedStyle(el).opacity)),
  );
  expect(opacities.every((opacity) => opacity < 1)).toBe(true);
  const wireOffset = await wire.evaluate((el) =>
    parseFloat(getComputedStyle(el).strokeDashoffset),
  );
  expect(wireOffset).toBeGreaterThan(0);
  expect(wireOffset).toBeLessThan(1);
  await page.waitForTimeout(motionTokens.duration.reveal * 1000 + 400);
  for (const card of await cards.all())
    await expect(card).toHaveCSS("opacity", "1");
  await expect(wire).toHaveCSS("stroke-dashoffset", "0px");
  await expect(grid.locator(".mentor-bubble")).toHaveCSS("opacity", "1");
  await expect(
    grid.locator(".repeat-preview .animated-number > span[aria-hidden]"),
  ).toHaveText("3");
  await page.screenshot({ path: "reports/screenshots/features-motion.png" });
});

test("stat counter takes 1.6 seconds and step transitions do not leave a blank stage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto("/");
  const count = page.locator(
    '.stat strong[aria-label="60"] .animated-number > span[aria-hidden]',
  );
  await expect(count).toHaveText("0");
  await page.locator(".stats").scrollIntoViewIfNeeded();
  await expect(count).toHaveAttribute("data-counting", "true");
  const elapsed = await count.evaluate(
    (node) =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        function sample() {
          if (node.textContent === "60") resolve(performance.now() - start);
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
  );
  expect(elapsed).toBeGreaterThan(1400);
  expect(elapsed).toBeLessThan(1800);
  await expect(count).toHaveText("60");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  await page.getByRole("tab").nth(1).click();
  const blankTime = await page.locator(".step-stage").evaluate(
    (stage) =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        let emptyAt = 0,
          max = 0;
        function sample(now: number) {
          const visible = Array.from(
            stage.querySelectorAll(".step-transition"),
          ).some((el) => Number(getComputedStyle(el).opacity) > 0.01);
          if (!visible && !emptyAt) emptyAt = now;
          if (visible && emptyAt) {
            max = Math.max(max, now - emptyAt);
            emptyAt = 0;
          }
          if (now - start < 1100) requestAnimationFrame(sample);
          else resolve(emptyAt ? Math.max(max, now - emptyAt) : max);
        }
        requestAnimationFrame(sample);
      }),
  );
  expect(blankTime).toBeLessThan(150);
});

test("bank cards move between positions, filter pill moves and dialog closes with focus", async ({
  page,
}) => {
  await page.goto("/");
  const grid = page.locator(".scheme-grid");
  await grid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1900);
  // A retained card after the first row has to move when hard cards leave.
  const card = page
    .locator(".scheme-item")
    .filter({ hasText: "Кнопка" })
    .first();
  const label = await card.locator("h3").textContent();
  const easy = page
    .locator("#bank")
    .getByRole("button", { name: "Лёгкая", exact: true });
  await easy.scrollIntoViewIfNeeded();
  const before = await card.boundingBox();
  await easy.evaluate((button, title) => {
    button.addEventListener(
      "click",
      () => {
        // Sample in the page's clock, independent of test-runner round trips.
        setTimeout(() => {
          const card = Array.from(
            document.querySelectorAll<HTMLButtonElement>(".scheme-item"),
          ).find((el) => el.querySelector("h3")?.textContent === title)!;
          const box = card.getBoundingClientRect();
          card.dataset.sampleX = String(box.x);
          card.dataset.sampleY = String(box.y);
        }, 150);
      },
      { once: true },
    );
  }, label);
  await easy.click();
  const retained = page
    .locator(".scheme-item")
    .filter({ has: page.getByRole("heading", { name: label!, exact: true }) });
  await expect(retained).toHaveCount(1);
  await expect(retained).toHaveAttribute("data-sample-x", /\d/);
  const middle = await retained.evaluate((el) => ({
    x: Number(el.dataset.sampleX),
    y: Number(el.dataset.sampleY),
  }));
  await page.waitForTimeout(600);
  const end = await retained.boundingBox();
  expect(
    Math.abs(middle!.x - end!.x) + Math.abs(middle!.y - end!.y),
  ).toBeGreaterThan(1);
  expect(
    Math.abs(before!.x - end!.x) + Math.abs(before!.y - end!.y),
  ).toBeGreaterThan(5);
  await page
    .locator("#bank")
    .getByRole("button", { name: "Средняя", exact: true })
    .click();
  const pill = page
    .locator("#bank")
    .getByRole("button", { name: "Средняя", exact: true })
    .locator(".filter-pill");
  await expect(pill).toBeVisible();
  await page.waitForTimeout(100);
  expect(await pill.evaluate((el) => getComputedStyle(el).transform)).not.toBe(
    "none",
  );
  await page.waitForTimeout(600);
  const trigger = page.locator(".scheme-item").first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await page.waitForTimeout(150);
  expect(
    await dialog.evaluate((el) => Number(getComputedStyle(el).opacity)),
  ).toBeLessThan(1);
  await expect(dialog).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("topics lift for mouse and keyboard, FAQ expands and collapses continuously", async ({
  page,
}) => {
  await page.goto("/");
  const topic = page.locator("#topics article").first();
  await topic.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  await topic.hover();
  await page.waitForTimeout(400);
  expect(
    await topic.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42,
    ),
  ).toBeLessThanOrEqual(-8);
  const hoverAccessibility = await new AxeBuilder({ page })
    .include("#topics")
    .analyze();
  expect(
    hoverAccessibility.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  expect(
    await topic.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42,
    ),
  ).toBe(0);
  await topic.getByRole("link").first().focus();
  await page.waitForTimeout(400);
  expect(
    await topic.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42,
    ),
  ).toBeLessThanOrEqual(-8);
  const buttons = page.locator("#faq button");
  await buttons.nth(1).scrollIntoViewIfNeeded();
  await buttons.nth(1).click();
  const answer = page.locator(".faq-answer").nth(1);
  await page.waitForTimeout(150);
  const middle = (await answer.boundingBox())!.height;
  await page.waitForTimeout(450);
  const final = (await answer.boundingBox())!.height;
  expect(middle).toBeGreaterThan(0);
  expect(middle).toBeLessThan(final);
  await buttons.nth(2).click();
  await page.waitForTimeout(100);
  const closing = (await answer.boundingBox())!.height;
  expect(closing).toBeGreaterThan(0);
  expect(closing).toBeLessThan(final);
  await page.waitForTimeout(400);
  expect((await answer.boundingBox())!.height).toBe(0);
});

test("touch has no hover lift; reduced motion keeps filters, steps and FAQ instant", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100/");
  const touchTopic = page.locator("#topics article").first();
  await touchTopic.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await touchTopic.hover();
  await expect(touchTopic).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .locator("#bank")
    .getByRole("button", { name: "Лёгкая", exact: true })
    .click();
  await expect(page.locator(".scheme-item")).toHaveCount(5);
  const topic = page.locator("#topics article").first();
  await topic.scrollIntoViewIfNeeded();
  await expect(topic).toHaveCSS("transform", "none");
  await page.locator("#faq button").nth(2).click();
  expect(
    (await page.locator(".faq-answer").nth(2).boundingBox())!.height,
  ).toBeGreaterThan(0);
  expect(
    (await page.locator(".faq-answer").first().boundingBox())!.height,
  ).toBe(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("tab").nth(3).click();
  await expect(page.locator("#step-panel .mini-kind-3")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
  ).toBe(0);
  await context.close();
});

test("finished sections remain accessible and fit desktop and mobile", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ["features", "bank", "topics", "faq"]) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      const results = await new AxeBuilder({ page })
        .include(`#${id}`)
        .analyze();
      expect(
        results.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact || ""),
        ),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await section.screenshot({
        path: `reports/screenshots/${id}-final-${width}.png`,
      });
    }
  }
});
