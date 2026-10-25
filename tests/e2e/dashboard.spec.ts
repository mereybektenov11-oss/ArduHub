import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
import { dayInZone } from "../../src/domain/missions";
import { passLessonQuiz } from "./helpers/lessonQuiz";
import { progressEvidence } from "../helpers/progressEvidence";
async function guest(
  page: Page,
  mutate?: (p: ReturnType<typeof createProgress>) => void,
) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const p = createProgress();
  p.profile.name = "Тестер";
  p.tourSeen = {
    "/app": true,
    "/app/map": true,
    "/app/practice": true,
    "/app/lesson/lesson-1": true,
  };
  mutate?.(p);
  await page.addInitScript((p) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
  }, p);
}
test("unauthorized access redirects, guest can enter", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/sign-in/);
  await expect(
    page.getByRole("heading", { name: "Добро пожаловать" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Google Скоро" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Продолжить как гость" }).click();
  await expect(
    page.getByRole("heading", { name: /Привет, .+!/ }),
  ).toBeVisible();
});
test("registration validates passwords and nickname before requests", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page
    .getByRole("button", { name: "Регистрация", exact: true })
    .first()
    .click();
  await page.getByLabel("Как к тебе обращаться").fill("Лис");
  await page.getByLabel("Почта").fill("demo@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("password1");
  await page.getByLabel("Повтори пароль").fill("password2");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Зарегистрироваться как ученик" })
    .click();
  await expect(page.locator("#auth-error")).toHaveText("Пароли не совпадают");
  await page.getByRole("radio", { name: /Учитель/ }).check();
  await expect(
    page.getByRole("button", { name: "Зарегистрироваться как учитель" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Показать пароль" }).click();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
});
test("grouped menu stays expanded and path shows 3 of 6", async ({ page }) => {
  await guest(page, (p) => {
    p.profile.level = 1;
    for (let i = 1; i <= 3; i++) {
      const id = "lesson-" + i;
      p.lessons[id] = {
        ...p.lessons[id],
        ...progressEvidence(id),
        status: "done",
      };
    }
    p.lessons["lesson-4"].status = "current";
  });
  await page.goto("/app");
  const prompt = page.getByRole("dialog", { name: "Сохрани прогресс" });
  if (await prompt.isVisible())
    await prompt.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.locator(".dash-segments")).toHaveAttribute(
    "aria-valuenow",
    "3",
  );
  await expect(
    page.getByRole("button", { name: /Два светодиода.*Продолжить/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(".dash-sidebar")
      .getByRole("heading", { name: "УЧЁБА", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".dash-sidebar").getByRole("button", { name: /ПРОЕКТЫ/ }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    localStorage.setItem("arduhub.menu", JSON.stringify(["ПРОЕКТЫ"])),
  );
  await page.reload();
  await expect(
    page.locator(".dash-sidebar").getByRole("link", { name: "Мои проекты" }),
  ).toBeVisible();
  await page.locator(".dash-node.locked").first().click();
  await expect(page.locator(".flow-node-popover")).toContainText(
    "Пройди предыдущий урок, чтобы открыть этот",
  );
  await expect(page).toHaveURL(/\/app$/);
});
test("search keyboard finds resistor and restores focus", async ({ page }) => {
  await guest(page);
  await page.goto("/app");
  const trigger = page
    .locator(".dash-sidebar")
    .getByRole("button", { name: /Поиск/ });
  await trigger.focus();
  await page.keyboard.press("Control+k");
  const input = page.getByRole("combobox");
  await expect(input).toBeFocused();
  await input.fill("резистор");
  await expect(page.getByRole("option").first()).toContainText(/Резистор/i);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("combobox").fill("резистор");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/glossary|lesson/);
});
test("daily missions grant once and quiz grants once", async ({ page }) => {
  await guest(page, (p) => {
    p.daily = {
      day: dayInZone(),
      lessonIds: ["lesson-1"],
      xp: 50,
      perfect: true,
      claimed: false,
      quiz: false,
    };
  });
  await page.goto("/app/missions");
  await page.getByRole("button", { name: "Забрать награду" }).click();
  await expect(
    page.getByRole("button", { name: "Награда получена" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Награда получена" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Чтобы ограничить ток" }).click();
  await expect(page.getByRole("status")).toContainText("Верно");
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arduhub.progress.v1")!),
  );
  expect(p.sparks).toBe(10);
  expect(p.mentor.tokens).toBe(55);
  expect(p.xp).toBe(5);
});
test("shop applies freeze and cannot buy it twice", async ({ page }) => {
  await guest(page, (p) => {
    p.sparks = 100;
  });
  await page.goto("/app/shop");
  const item = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Заморозка серии" }) });
  await item.getByRole("button", { name: "Купить", exact: true }).click();
  await expect(item.getByRole("button", { name: "Куплено" })).toBeDisabled();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Заморозка серии" }),
  ).toBeVisible();
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("arduhub.progress.v1")!),
  );
  expect(p.sparks).toBe(60);
  expect(p.boosts.freeze).toBe(1);
});
test("insufficient balance disables purchase", async ({ page }) => {
  await guest(page, (p) => {
    p.sparks = 30;
  });
  await page.goto("/app/shop");
  const item = page
    .locator(".dash-shop-item")
    .filter({ has: page.getByRole("heading", { name: "Заморозка серии" }) });
  await expect(
    item.getByRole("button", { name: "Не хватает 10 искр" }),
  ).toBeDisabled();
});
test("profile saves nickname and shows all six skill bars", async ({
  page,
}) => {
  await guest(page);
  await page.goto("/app/profile");
  await page.getByLabel("Как к тебе обращаться").fill("Мастер");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Мастер", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cab-skills [role=progressbar]")).toHaveCount(6);
  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/sign-in/);
  await page.goto("/app");
  await expect(page).toHaveURL(/sign-in/);
});
test("lesson focus has no sidebar and expected behavior on work steps", async ({
  page,
}) => {
  await guest(page);
  await page.route("**/api/lesson-video*", (route) =>
    route.fulfill({ status: 404, json: { error: "not_found" } }),
  );
  await page.goto("/app/lesson/lesson-1");
  await expect(page.locator(".dash-sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "К пути", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Продолжить без видео" }).click();
  await passLessonQuiz(page);
  await expect(
    page.getByRole("heading", { name: "Ожидаемое поведение" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Спросить ИИ", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Наставник", exact: true }),
  ).toBeVisible();
});
test("mobile menu exposes every group without page overflow", async ({
  page,
}) => {
  await guest(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/app");
  await expect(page.locator(".dash-bottom").getByRole("link")).toHaveCount(4);
  await page
    .locator(".dash-bottom")
    .getByRole("button", { name: "Ещё" })
    .click();
  const dialog = page.getByRole("dialog");
  for (const name of ["Лидеры", "Магазин", "Профиль"])
    await expect(dialog.getByRole("link", { name, exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "reports/dashboard/mobile-menu.png",
    fullPage: true,
  });
});
for (const route of [
  "/app",
  "/app/lessons",
  "/app/lesson/lesson-1",
  "/app/projects",
  "/app/practice",
  "/app/missions",
  "/app/shop",
  "/app/profile",
])
  test("typography " + route, async ({ page }) => {
    await guest(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const result = await page.evaluate(() => {
      const found: { size: number; tag: string; className: string }[] = [];
      const walker = document.createTreeWalker(
        document.querySelector(".cabinet")!,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        const el = node.parentElement!;
        if (!el.checkVisibility()) continue;
        const css = getComputedStyle(el);
        found.push({
          size: parseFloat(css.fontSize),
          tag: el.tagName,
          className: el.className?.toString() ?? "",
        });
      }
      return {
        sizes: [...new Set(found.map((v) => v.size))],
        small: found.filter(
          (v) => v.size < 13 && !v.className.includes("group-label"),
        ),
        large: found.filter((v) => v.size > 28),
      };
    });
    expect(result.small).toEqual([]);
    expect(result.large).toEqual([]);
    expect(
      result.sizes.length,
      JSON.stringify(result.sizes),
    ).toBeLessThanOrEqual(7);
    expect(
      parseFloat(
        await page
          .locator("h1")
          .first()
          .evaluate((el) => getComputedStyle(el).fontSize),
      ),
    ).toBeLessThanOrEqual(28);
  });
for (const route of [
  "/sign-in",
  "/app",
  "/app/shop",
  "/app/missions",
  "/app/profile",
])
  test("accessibility " + route, async ({ page }) => {
    if (route !== "/sign-in") await guest(page);
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(1400);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    await page.screenshot({
      path: "reports/dashboard/" + route.replaceAll("/", "-") + ".png",
      fullPage: true,
    });
  });
