import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("glass registration advances with Enter, validates password and keeps values on back", async ({
  page,
}) => {
  await page.goto("/register");
  await expect(
    page.getByRole("link", { name: "ArduHub", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Начни создавать с нами" }),
  ).toBeVisible();
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByLabel("Почта").press("Enter");
  await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
  await page.getByLabel("Пароль", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.locator("#auth-error")).toHaveText("Минимум 8 символов");
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByLabel("Пароль", { exact: true }).press("Enter");
  await expect(page.getByLabel("Повтори пароль")).toBeVisible();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByLabel("Пароль", { exact: true })).toHaveValue(
    "TestPassword123!",
  );
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByLabel("Почта")).toHaveValue("qa@example.org");
});

test("registration rejects mismatched passwords before sending an account request", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/auth/v1/signup**", (route) => {
    requests++;
    return route.abort();
  });
  await page.goto("/register");
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Повтори пароль").fill("DifferentPassword123!");
  await page.getByLabel("Как к тебе обращаться").fill("Проверка");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Зарегистрироваться как ученик" })
    .click();
  await expect(page.locator("#auth-error")).toHaveText("Пароли не совпадают");
  expect(requests).toBe(0);
});

test("all signup steps remain accessible in dark theme with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/register");
  await page.getByRole("button", { name: "Переключить тему" }).click();
  for (let step = 0; step < 3; step++) {
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter((v) => ["serious", "critical"].includes(v.impact!)),
    ).toEqual([]);
    if (step === 0) {
      await page.getByLabel("Почта").fill("qa@example.org");
      await page
        .getByRole("button", { name: "Продолжить", exact: true })
        .click();
    }
    if (step === 1) {
      await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
      await page
        .getByRole("button", { name: "Продолжить", exact: true })
        .click();
    }
  }
});

// TextureButton variants on sign-in, every signup step and recovery, in both
// themes. Axe cannot read gradient backgrounds, so contrast is computed here:
// filled variants against every gradient stop of the inner surface; minimal
// (transparent) buttons against the real rendered pixels behind the text
// (glass card over the photo backdrop), taking the worst pixel.
const luminance = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (x: number[], y: number[]) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
const rgb = (value: string) =>
  [...value.matchAll(/rgba?\(([^)]+)\)/g)].map((m) =>
    m[1].split(/[\s,/]+/).map(Number),
  );

async function buttonContrast(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  const results: { name: string; variant: string; min: number }[] = [];
  const buttons = page.locator('[data-slot="texture-button"]:not(:disabled)');
  for (const button of await buttons.all()) {
    const { name, variant, text, surface } = await button.evaluate((b) => {
      const inner = getComputedStyle(b.firstElementChild!);
      return {
        name: b.getAttribute("aria-label") || b.textContent!.trim(),
        variant: b.getAttribute("data-variant")!,
        text: getComputedStyle(b).color,
        surface: inner.backgroundImage + " " + inner.backgroundColor,
      };
    });
    const textColor = rgb(text)[0];
    let backgrounds: number[][];
    if (variant === "minimal") {
      await button.evaluate((b) =>
        (b as HTMLElement).style.setProperty("color", "transparent"),
      );
      const png = (await button.screenshot()).toString("base64");
      await button.evaluate((b) =>
        (b as HTMLElement).style.removeProperty("color"),
      );
      backgrounds = await page.evaluate(async (data) => {
        const image = new Image();
        image.src = "data:image/png;base64," + data;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          image.width,
          image.height,
        ).data;
        const out: number[][] = [];
        for (let i = 0; i < pixels.length; i += 4)
          out.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
        return out;
      }, png);
    } else {
      // Filled variants; translucent stops are composited over black and white.
      backgrounds = rgb(surface)
        .filter(([, , , a = 1]) => a > 0)
        .flatMap(([r, g, b, a = 1]) =>
          [0, 255].map((under) =>
            [r, g, b].map((v) => v * a + under * (1 - a)),
          ),
        );
    }
    results.push({
      name,
      variant,
      min: Math.min(...backgrounds.map((bg) => ratio(textColor, bg))),
    });
  }
  return results;
}

for (const theme of ["light", "dark"] as const) {
  test(`auth buttons use TextureButton variants with readable text in ${theme} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const button = (name: string) =>
      page.getByRole("button", { name, exact: true });
    const checkContrast = async () => {
      const results = await buttonContrast(page);
      expect(results.length).toBeGreaterThan(0);
      for (const result of results)
        expect(
          result.min,
          `${result.name} (${result.variant})`,
        ).toBeGreaterThanOrEqual(4.5);
    };
    const openTheme = async (path: string) => {
      await page.goto(path);
      if (theme === "dark") await button("Переключить тему").click();
      await expect(page.locator(".auth-page")).toHaveClass(
        theme === "dark" ? /auth-dark/ : /^(?!.*auth-dark)/,
      );
    };

    await openTheme("/sign-in");
    await expect(button("Переключить тему")).toHaveAttribute(
      "data-variant",
      "icon",
    );
    await expect(button("Переключить тему")).toHaveAttribute(
      "data-size",
      "icon",
    );
    await expect(button("Войти")).toHaveAttribute("data-variant", "primary");
    await expect(button("Показать пароль")).toHaveAttribute(
      "data-variant",
      "icon",
    );
    await expect(button("Показать пароль")).toHaveAttribute(
      "data-size",
      "icon",
    );
    await expect(button("Забыли пароль?")).toHaveAttribute(
      "data-variant",
      "minimal",
    );
    await expect(button("Регистрация")).toHaveAttribute(
      "data-variant",
      "minimal",
    );
    await expect(
      page.getByRole("button", { name: "Начать без аккаунта" }),
    ).toHaveAttribute("data-variant", "secondary");
    await checkContrast();

    await button("Забыли пароль?").click();
    await expect(
      page.getByRole("heading", { name: "Восстановить пароль" }),
    ).toBeVisible();
    await expect(button("Отправить ссылку")).toHaveAttribute(
      "data-variant",
      "primary",
    );
    await expect(button("Войти")).toHaveAttribute("data-variant", "minimal");
    await expect(
      page.getByRole("button", { name: "Начать без аккаунта" }),
    ).toHaveAttribute("data-variant", "secondary");
    await checkContrast();

    await openTheme("/register");
    await expect(button("Продолжить")).toHaveAttribute(
      "data-variant",
      "primary",
    );
    await expect(button("Продолжить")).toHaveAttribute("data-size", "icon");
    await expect(
      page.getByRole("button", { name: "Уже есть аккаунт? Войти" }),
    ).toHaveAttribute("data-variant", "minimal");
    await checkContrast();
    await page.getByLabel("Почта").fill("qa@example.org");
    await button("Продолжить").click();
    await expect(button("Показать пароль")).toHaveAttribute(
      "data-variant",
      "icon",
    );
    await expect(button("Назад")).toHaveAttribute("data-variant", "minimal");
    await checkContrast();
    await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
    await button("Продолжить").click();
    await expect(
      page.getByRole("button", { name: "Зарегистрироваться как ученик" }),
    ).toHaveAttribute("data-variant", "primary");
    await expect(
      page.getByRole("button", { name: "Начать без аккаунта" }),
    ).toHaveAttribute("data-variant", "secondary");
    await checkContrast();
  });
}

test("unconfirmed login offers resend as a small secondary button with cooldown", async ({
  page,
}) => {
  let resends = 0;
  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        code: "email_not_confirmed",
        error_code: "email_not_confirmed",
        msg: "Email not confirmed",
      }),
    }),
  );
  await page.route("**/auth/v1/resend**", (route) => {
    resends++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto("/sign-in");
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByLabel("Пароль", { exact: true }).fill("TestPassword123!");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const resend = page.getByRole("button", {
    name: "Отправить письмо ещё раз",
  });
  await expect(resend).toHaveAttribute("data-variant", "secondary");
  await expect(resend).toHaveAttribute("data-size", "sm");
  await expect(resend).toHaveAttribute("type", "button");
  await resend.click();
  await expect(resend).toBeDisabled();
  await expect.poll(() => resends).toBe(1);
});
