import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createProgress } from "../../src/domain/seed";

async function prepare(page: Page) {
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  const progress = createProgress();
  progress.profile.name = "Изобретатель";
  progress.tourSeen["/app/profile"] = true;
  await page.addInitScript((progress) => {
    if (!localStorage.getItem("arduhub.progress.v1"))
      localStorage.setItem("arduhub.progress.v1", JSON.stringify(progress));
    localStorage.setItem("arduhub.onboarding.v1:local", "1");
  }, progress);
}

for (const width of [360, 768, 1440]) {
  test(`profile at ${width}px has account navigation and truthful desktop status`, async ({
    page,
  }) => {
    await prepare(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app/profile");
    await expect(
      page.getByRole("heading", { name: "Аккаунт", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Основная навигация" }),
    ).toBeVisible();
    await expect(
      page.locator(".cab-icon, .cab-card, .kids-profile, .dash-sidebar"),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Скачать приложение" }),
    ).toHaveCount(0);
    await expect(
      page.locator(".profile-settings-form, .profile-metrics"),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `outputs/profile-delta/profile-${width}.png`,
      fullPage: true,
    });
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((v) => ["serious", "critical"].includes(v.impact!)),
    ).toEqual([]);
    for (const [label, route] of [
      ["Мой прогресс", "progress"],
      ["Настройки", "settings"],
      ["Для компьютера", "desktop"],
    ]) {
      await page
        .getByRole("navigation", { name: "Разделы профиля" })
        .getByRole("link", { name: label })
        .click();
      await expect(page).toHaveURL(new RegExp(`/app/profile/${route}$`));
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.locator(".cab-icon, .cab-card, .kids-profile"),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `outputs/profile-delta/${route}-${width}.png`,
        fullPage: true,
      });
      const result = await new AxeBuilder({ page }).analyze();
      expect(
        result.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact!),
        ),
      ).toEqual([]);
    }
  });
}

test("profile sections have separate pages, settings persist, and logout protects the cabinet", async ({
  page,
}) => {
  await prepare(page);
  await page.goto("/app/profile");
  const topnav = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(
    topnav.getByRole("link", { name: "Профиль", exact: true }),
  ).toHaveAttribute("data-variant", "secondary");
  const guestSave = page.getByRole("link", {
    name: "Сохранить прогресс",
    exact: true,
  });
  await expect(guestSave).toHaveAttribute("data-variant", "accent");
  await expect(guestSave).toHaveAttribute("href", "/register");
  const edit = page.getByRole("link", { name: "Редактировать профиль" });
  await expect(edit).toHaveAttribute("data-variant", "secondary");
  await edit.click();
  await expect(page).toHaveURL(/\/app\/profile\/settings$/);
  await expect(page.getByLabel("Имя", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByLabel("Часовой пояс").selectOption("UTC");
  const save = page.getByRole("button", { name: "Сохранить", exact: true });
  await expect(save).toHaveAttribute("data-variant", "primary");
  await expect(save).toHaveAttribute("type", "submit");
  await save.click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  await page.reload();
  await expect(page.getByLabel("Часовой пояс")).toHaveValue("UTC");
  const menu = page.getByRole("navigation", { name: "Разделы профиля" });
  await menu.getByRole("link", { name: "Мой прогресс" }).click();
  await expect(page).toHaveURL(/\/app\/profile\/progress$/);
  await expect(
    page.getByRole("heading", { name: "Мой прогресс", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".profile-settings-form")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Учиться в приложении" }),
  ).toHaveAttribute("data-variant", "secondary");
  await menu.getByRole("link", { name: "Для компьютера" }).click();
  await expect(page).toHaveURL(/\/app\/profile\/desktop$/);
  const download = page.getByRole("link", { name: "Скачать приложение" });
  await expect(download).toHaveAttribute(
    "href",
    /^https:\/\/github\.com\/.+\/releases\/download\/.+\.exe$/,
  );
  await expect(download).toHaveAttribute("data-variant", "primary");
  await expect(page.locator(".profile-desktop-copy")).toContainText(
    "SmartScreen",
  );
  await expect(
    menu.getByRole("link", { name: "Для компьютера" }),
  ).toHaveAttribute("aria-current", "page");
  const logout = page.getByRole("button", { name: "Выйти", exact: true });
  await expect(logout).toHaveAttribute("data-variant", "danger-soft");
  await logout.click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/app/profile/settings");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("successful registration opens profile and confirmation URL targets profile", async ({
  page,
}) => {
  await prepare(page);
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "qa@example.org",
    created_at: "2026-11-10T00:00:00Z",
    app_metadata: {},
    user_metadata: { display_name: "Мастер" },
  };
  await page.route("**/auth/v1/signup**", (route) => {
    expect(route.request().postDataJSON().email).toBe("qa@example.org");
    const redirect = new URL(
      new URL(route.request().url()).searchParams.get("redirect_to")!,
    );
    expect(redirect.pathname).toBe("/auth/callback");
    expect(redirect.searchParams.get("next")).toBe("profile");
    return route.fulfill({
      json: {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user,
      },
    });
  });
  await page.route("**/auth/v1/user**", (route) =>
    route.fulfill({ json: user }),
  );
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({
      status: route.request().url().includes("/profiles?") ? 400 : 200,
      json: route.request().url().includes("/profiles?")
        ? {
            id: user.id,
            display_name: "Мастер",
            timezone: "Asia/Qyzylorda",
            role: "student",
            sparks: 0,
            mentor_tokens: 0,
          }
        : [],
    }),
  );
  await page.goto("/register");
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Повтори пароль").fill("TestPassword123!");
  await page.getByLabel("Как к тебе обращаться").fill("Мастер");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Зарегистрироваться как ученик" })
    .click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(
    page.getByRole("heading", { name: "Аккаунт", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Мастер", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Как тебя зовут?" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Редактировать профиль" }).click();
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Мастер");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
