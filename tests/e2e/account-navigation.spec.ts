import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";
async function prepare(page: Page) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const p = createProgress();
  p.profile.name = "Мастер";
  await page.addInitScript(
    (p) => localStorage.setItem("arduhub.progress.v1", JSON.stringify(p)),
    p,
  );
}
test("navbar opens pricing and documentation with persistent navigation and reduced motion", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/app/profile");
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(
    nav.getByRole("link", { name: "Проекты", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("link", { name: "Справочник", exact: true }),
  ).toHaveCount(0);
  await nav.evaluate((el) => el.setAttribute("data-persistent-check", "yes"));
  await nav.getByRole("link", { name: "Тарифы", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/pricing$/);
  await expect(
    page.getByRole("heading", { name: "Бесплатно", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Что даёт ArduHub" }),
  ).toBeVisible();
  await expect(page.locator(".account-benefits article")).toHaveCount(4);
  const pro = page.locator('[data-plan="pro"]');
  await expect(pro.locator(".pricing-value")).toHaveText(/1\s790\s*₸/);
  await expect(pro.locator(".pricing-period")).toHaveText("/ месяц");
  for (const feature of [
    "Все уроки курса",
    "ИИ-наставник на токенах",
    "Безлимит схем",
    "Статистика ошибок",
  ])
    await expect(pro.getByText(feature, { exact: true })).toBeVisible();
  const proAction = pro.getByRole("button", {
    name: "Оплата пока недоступна",
  });
  await expect(proAction).toBeDisabled();
  await expect(proAction).toHaveAttribute("data-variant", "secondary");
  const schoolAction = page
    .locator('[data-plan="school"]')
    .getByRole("button", { name: "Пока недоступно" });
  await expect(schoolAction).toBeDisabled();
  await expect(schoolAction).toHaveAttribute("data-variant", "secondary");
  for (const action of [proAction, schoolAction]) {
    await action.click({ force: true });
    await action.focus();
    expect(await action.evaluate((el) => el === document.activeElement)).toBe(
      false,
    );
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app\/pricing$/);
  }
  const free = page
    .locator('[data-plan="free"]')
    .getByRole("link", { name: "Начать бесплатно" });
  await expect(free).toHaveAttribute("data-variant", "primary");
  await expect(free).toHaveAttribute("href", "/app/lessons");
  await expect(page.locator("#pricing-availability")).toContainText(
    "оплата пока недоступна",
  );
  expect(
    await pro.evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase()),
  ).toContain("inter");

  await expect(nav).toHaveAttribute("data-persistent-check", "yes");
  expect(
    await page
      .locator(".app-route-enter")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("app-route-appear");
  await nav.getByRole("link", { name: "Документация", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/docs$/);
  await expect(nav).toHaveAttribute("data-persistent-check", "yes");
  await expect(
    page.getByRole("link", { name: "Открыть первый урок" }),
  ).toHaveAttribute("data-variant", "primary");
  const menu = page.getByRole("navigation", { name: "Разделы документации" });
  await menu.getByRole("link", { name: "Работа в редакторе" }).click();
  await expect(
    page.getByRole("heading", { name: "Проверь схему", exact: true }),
  ).toBeVisible();
  await menu.getByRole("link", { name: "Компоненты", exact: true }).click();
  await page.getByLabel("Найти компонент").fill("резистор");
  await expect(
    page.getByRole("heading", { name: "Резистор", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Найти компонент").fill("нет-такого-компонента");
  await expect(page.getByRole("status")).toContainText("Нет совпадений");
  await menu.getByRole("link", { name: "Основы кода" }).click();
  await expect(page.locator("pre code")).toContainText("pinMode(13, OUTPUT)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".app-route-enter")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
for (const width of [360, 768, 1440])
  test(`pricing and docs at ${width}px fit and remain accessible`, async ({
    page,
  }) => {
    await prepare(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of [
      "/app/pricing",
      "/app/docs",
      "/app/docs/workspace",
      "/app/docs/components",
      "/app/docs/code",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator(".dash-sidebar, .cab-icon")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact!),
        ),
      ).toEqual([]);
      await page.screenshot({
        path: `outputs/profile-delta/${route.replaceAll("/", "-")}-${width}.png`,
        fullPage: true,
      });
    }
  });

test("profile intro blurs once per tab, while other tabs only animate content", async ({
  page,
}) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/app/profile");
  const shell = page.locator(".app-page-intro");
  const content = page.locator(".app-route-enter");
  await expect(
    shell.locator(
      ".profile-topnav, .profile-sidebar, .profile-main, .profile-footer",
    ),
  ).toHaveCount(4);
  const sample = async (time: number) =>
    shell.evaluate((el, time) => {
      const animation = el
        .getAnimations()
        .find((a) => a.id === "profile-intro")!;
      animation.pause();
      animation.currentTime = time;
      return {
        filter: getComputedStyle(el).filter,
        duration: animation.effect!.getTiming().duration,
      };
    }, time);
  const beginning = await sample(200);
  expect(beginning.duration).toBe(1500);
  expect(beginning.filter).toMatch(/blur\(/);
  await page.screenshot({ path: "outputs/profile-delta/entry-blur.png" });
  expect((await sample(900)).filter).toMatch(/blur\(/);
  expect((await sample(1500)).filter).toBe("none");
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  await nav.getByRole("link", { name: "Тарифы", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/pricing$/);
  await expect(shell).toHaveCSS("filter", "none");
  expect(
    await shell.evaluate((el) =>
      el.getAnimations().some((a) => a.id === "profile-intro"),
    ),
  ).toBe(false);
  await expect(content).toHaveCSS("filter", "none");
  await expect(content).toHaveCSS("animation-name", "app-route-appear");
  await nav.getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(shell).toHaveCSS("filter", "none");
  expect(
    await shell.evaluate((el) =>
      el.getAnimations().some((a) => a.id === "profile-intro"),
    ),
  ).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Аккаунт", exact: true }),
  ).toBeVisible();
  expect(
    await shell.evaluate((el) =>
      el.getAnimations().some((a) => a.id === "profile-intro"),
    ),
  ).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(content).toHaveCSS("animation-name", "none");
});

test("direct docs entry never blurs and reduced motion skips the first profile intro", async ({
  page,
}) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/app/docs");
  await expect(page.locator(".app-page-intro")).toHaveCSS("filter", "none");
  expect(
    await page
      .locator(".app-page-intro")
      .evaluate((el) =>
        el.getAnimations().some((a) => a.id === "profile-intro"),
      ),
  ).toBe(false);
  await expect(page.locator(".app-route-enter")).toHaveCSS(
    "animation-name",
    "app-route-appear",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("link", { name: "Профиль", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  expect(
    await page
      .locator(".app-page-intro")
      .evaluate((el) =>
        el.getAnimations().some((a) => a.id === "profile-intro"),
      ),
  ).toBe(false);
  await expect(page.locator(".app-route-enter")).toHaveCSS(
    "animation-name",
    "none",
  );
});
