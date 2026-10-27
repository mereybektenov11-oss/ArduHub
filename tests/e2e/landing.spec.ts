import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("circuit gallery switches phases and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/dev/circuits");
  const scene = page.locator(".circuit").first();
  await page.getByRole("button", { name: "Ошибка подключения" }).click();
  await expect(scene).toHaveClass(/phase-error/);
  await page.getByRole("button", { name: "Соединение исправлено" }).click();
  await expect(scene).toHaveClass(/phase-fixed/);
  await page.getByRole("button", { name: "Рисуем провода" }).click();
  await expect(scene).toHaveClass(/phase-drawing/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveClass(/phase-fixed/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
test("hero fits desktop, sections exist, no critical accessibility violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Собрал схему.Заработает?",
  );
  const box = await page
    .getByRole("link", { name: "Начать бесплатно" })
    .first()
    .boundingBox();
  expect(box!.y + box!.height).toBeLessThan(900);
  await expect(page.locator("#topics article")).toHaveCount(6);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact || ""),
    ),
  ).toEqual([]);
});
for (const width of [360, 768, 1440, 1920])
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.screenshot({
      path: `reports/screenshots/${width}.png`,
      animations: "disabled",
    });
  });
test("bank filters, combined empty state, reset and topic links", async ({
  page,
}) => {
  await page.goto("/");
  const bank = page.locator("#bank");
  await bank.getByRole("button", { name: "Лёгкая", exact: true }).click();
  await expect(bank.locator(".scheme-item")).toHaveCount(5);
  await bank.getByRole("button", { name: "Светодиоды", exact: true }).click();
  await bank.getByRole("button", { name: "С ошибкой", exact: true }).click();
  await expect(bank.getByText("Ничего не найдено")).toBeVisible();
  await bank.getByRole("button", { name: "Сбросить" }).click();
  await expect(bank.locator(".scheme-item")).toHaveCount(12);
  await page
    .locator("#topics article")
    .filter({
      has: page.getByRole("heading", { name: "Датчики", exact: true }),
    })
    .getByRole("link", { name: "Банк схем" })
    .click();
  await expect(bank.locator(".scheme-item")).toHaveCount(3);
  await expect(
    bank.getByRole("button", { name: "Датчики", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("bank filters respond before deferred animation code loads", async ({
  page,
}) => {
  let delayLate = false;
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    if (delayLate) await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue().catch(() => {});
  });
  await page.goto("/");
  delayLate = true;
  const bank = page.locator("#bank");
  await bank.getByRole("button", { name: "Лёгкая", exact: true }).click();
  await expect(bank.locator(".scheme-item")).toHaveCount(5, { timeout: 700 });
});
test("FAQ has one open, Enter and Space toggle, arrows move focus", async ({
  page,
}) => {
  await page.goto("/");
  const buttons = page.locator("#faq button");
  await buttons.nth(1).click();
  await expect(buttons.nth(0)).toHaveAttribute("aria-expanded", "false");
  await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "true");
  await buttons.nth(1).press("Space");
  await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "false");
  await buttons.nth(1).press("Enter");
  await expect(buttons.nth(1)).toHaveAttribute("aria-expanded", "true");
  await buttons.nth(1).press("ArrowDown");
  await expect(buttons.nth(2)).toBeFocused();
});
test("steps respond to click, arrows, home and end", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#how-it-works");
  const tabs = page.getByRole("tab");
  await tabs.nth(2).click();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(2).press("ArrowDown");
  await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
  await tabs.nth(3).press("Home");
  await expect(tabs.nth(0)).toBeFocused();
  await tabs.nth(0).press("End");
  await expect(tabs.nth(4)).toBeFocused();
});
test("mobile menu traps focus and closes on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Открыть меню" });
  await trigger.click();
  await expect(page.locator("#mobile-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("#mobile-menu")).toHaveCount(0);
});
test("form rejects invalid email, sends once and succeeds with mocked backend", async ({
  page,
}) => {
  await page.goto("/");
  let count = 0;
  await page.route("**/api/waitlist", async (route) => {
    count++;
    await new Promise((r) => setTimeout(r, 200));
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.getByLabel("Твоя электронная почта").fill("abc");
  await page.getByRole("button", { name: "Подписаться" }).click();
  await expect(page.locator("#waitlist-error")).toHaveText(
    "Проверь адрес электронной почты",
  );
  expect(count).toBe(0);
  await page.getByLabel("Твоя электронная почта").fill("test@example.com");
  await page.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.getByText("Адрес сохранён")).toBeVisible();
  expect(count).toBe(1);
});
test("form preserves email on rate limit and offline failures", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/api/waitlist", (r) =>
    r.fulfill({ status: 429, json: { ok: false, error: "rate_limited" } }),
  );
  await page.getByLabel("Твоя электронная почта").fill("test@example.com");
  await page.getByRole("button", { name: "Подписаться" }).click();
  await expect(page.locator("#waitlist-error")).toHaveText(
    "Попробуйте через минуту",
  );
  await expect(page.getByLabel("Твоя электронная почта")).toHaveValue(
    "test@example.com",
  );
  await page.route("**/api/waitlist", (r) => r.abort());
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.locator("#waitlist-error")).toContainText(
    "Не удалось отправить",
  );
});
test("only working free plan opens the cabinet", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#pricing .plan")).toHaveCount(1);
  await expect(page.locator("#pricing .plan a")).toHaveAttribute(
    "href",
    "/app",
  );
  await expect(page.locator(".plan-school,.plan-pro")).toHaveCount(0);
});
test("blitz loses lives, increments streak and restarts", async ({ page }) => {
  await page.goto("/");
  const blitz = page.locator(".blitz-preview");
  await blitz.getByRole("button", { name: "К GND" }).click();
  await expect(blitz.getByText("Серия: 1")).toBeVisible();
  await blitz.getByRole("button", { name: "Следующий раунд" }).click();
  for (let i = 0; i < 3; i++) {
    await blitz.getByRole("button", { name: "К 5V" }).click();
    if (i < 2)
      await blitz.getByRole("button", { name: "Следующий раунд" }).click();
  }
  await blitz.getByRole("button", { name: "Начать заново" }).click();
  await expect(blitz.getByLabel("Жизни: 3")).toBeVisible();
});
test("reduced motion shows finished circuit and no running animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".hero .float-left .circuit")).toHaveClass(
    /phase-fixed/,
  );
  const runningAnimations = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .map((a) => ({
        name: (a as CSSAnimation).animationName,
        target: (
          (a.effect as KeyframeEffect)?.target as Element
        )?.outerHTML?.slice(0, 200),
      })),
  );
  expect(runningAnimations).toEqual([]);
});
test("all FAQ answers remain readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3100");
  await expect(page.locator(".faq-answer:visible")).toHaveCount(6);
  await expect(
    page.getByText("Для отправки формы нужен JavaScript."),
  ).toBeVisible();
  await context.close();
});
test("metadata, privacy, robots and security headers", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");
  expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response!.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /og.png/,
  );
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Политика",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "/dev/",
  );
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /dev/",
  );
});
test("scroll selects the matching learning step", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const index of [0, 2, 4]) {
    await page
      .locator(`.step-sentinel[data-step="${index}"]`)
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(page.getByRole("tab").nth(index)).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
});
test("scheme opens in a dialog and Escape restores focus", async ({ page }) => {
  await page.goto("/");
  const button = page.locator("#bank .scheme-item").first();
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(
    "Первый огонёк",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(button).toBeFocused();
});
test("lesson CTA opens lessons and native anchors respect the header", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .locator(".desktop-nav")
    .getByRole("link", { name: "Возможности", exact: true })
    .click();
  const heading = page.locator("#features h2");
  await expect(heading).toBeInViewport();
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(79);
  await page
    .locator("#topics article")
    .first()
    .getByRole("link", { name: "Открыть уроки" })
    .click();
  await expect(page).toHaveURL(/\/app\/lessons/);
});
test("unconfigured backend error is honest and keeps email", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/api/waitlist", (r) =>
    r.fulfill({ status: 500, json: { ok: false, error: "server_error" } }),
  );
  await page.getByLabel("Твоя электронная почта").fill("test@example.com");
  await page.getByRole("button", { name: "Подписаться" }).click();
  await expect(page.locator("#waitlist-error")).toContainText(
    "Не удалось сохранить адрес",
  );
  await expect(page.getByLabel("Твоя электронная почта")).toHaveValue(
    "test@example.com",
  );
});
