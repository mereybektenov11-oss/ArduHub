import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { createProgress } from "../../src/domain/seed";

// Neuralese design acceptance checks (docs/specs/neuralese-design.md).
// Measures computed styles and the fonts Chrome actually renders.

const OUT = "outputs/neuralese-design";

async function guest(page: Page) {
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

/** Fonts Chrome really used for the text of the first node matching selector. */
async function platformFonts(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeId } = await cdp.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  if (!nodeId) return null;
  const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  await cdp.detach();
  return fonts.map((f) => `${f.familyName}:${f.glyphCount}`).join(", ");
}

async function styleOf(page: Page, selector: string, props: string[]) {
  return page.evaluate(
    ([selector, props]) => {
      const el = document.querySelector(selector as string);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const out: Record<string, string> = {
        h: String(Math.round(r.height)),
      };
      for (const p of props as string[]) out[p] = cs.getPropertyValue(p);
      return out;
    },
    [selector, props] as const,
  );
}

async function overflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
}

const report: Record<string, unknown> = {};

test.afterAll(async () => {
  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
});

for (const width of [1440, 390]) {
  test(`landing ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settle(page);
    const h1 = await styleOf(page, ".hero h1", [
      "font-family",
      "font-weight",
      "letter-spacing",
      "font-size",
      "color",
    ]);
    const h1Fonts = await platformFonts(page, ".hero h1");
    const body = await styleOf(page, ".hero-description", [
      "font-family",
      "color",
    ]);
    const bodyFonts = await platformFonts(page, ".hero-description");
    const navLink = await styleOf(page, "header a[href^='#'], header nav a", [
      "font-family",
    ]);
    const navFonts = await platformFonts(page, "header nav a, header a");
    const cta = await styleOf(
      page,
      ".hero-buttons [data-slot='texture-button']",
      [
        "background-color",
        "background-image",
        "border-radius",
        "color",
        "font-family",
      ],
    );
    const ctaInner = await styleOf(
      page,
      ".hero-buttons [data-slot='texture-button'] > span",
      [
        "background-color",
        "background-image",
        "border-radius",
        "color",
        "padding",
      ],
    );
    const ctaFonts = await platformFonts(
      page,
      ".hero-buttons [data-slot='texture-button'] > span",
    );
    const bg = await styleOf(page, ".landing-video", ["background-color"]);
    const htmlBg = await page.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    );
    const cards = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          ".landing-video :is(.video-feature-media, .benefit-card, .learning-benefit, .faq details, .video-final, [class*='card'])",
        ),
      )
        .slice(0, 30)
        .map((el) => {
          const cs = getComputedStyle(el);
          return `${el.className} | r=${cs.borderRadius} bg=${cs.backgroundColor} border=${cs.borderTopWidth} ${cs.borderTopColor} shadow=${cs.boxShadow.slice(0, 80)}`;
        }),
    );
    const darkSurfaces = await page.evaluate(() => {
      const res: string[] = [];
      for (const el of Array.from(
        document.querySelectorAll(".landing-video *"),
      )) {
        const cs = getComputedStyle(el);
        const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).map((x) => x.trim());
        if (Number(a) < 0.5) continue;
        const lum = 0.2126 * +r + 0.7152 * +g + 0.0722 * +b;
        const rect = el.getBoundingClientRect();
        if (lum < 60 && rect.width > 60 && rect.height > 30)
          res.push(
            `${el.tagName}.${String(el.className).slice(0, 60)} ${cs.backgroundColor} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          );
      }
      return res;
    });
    const upper = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".landing-video *"))
        .filter((el) => getComputedStyle(el).textTransform === "uppercase")
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`)
        .slice(0, 20),
    );
    report[`landing-${width}`] = {
      h1,
      h1Fonts,
      body,
      bodyFonts,
      navLink,
      navFonts,
      cta,
      ctaInner,
      ctaFonts,
      bg,
      htmlBg,
      cards,
      darkSurfaces,
      upper,
      overflow: await overflow(page),
    };
    await mkdir(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}/landing-${width}.png` });
    await page.screenshot({
      path: `${OUT}/landing-${width}-full.png`,
      fullPage: true,
    });
    expect(h1?.["font-family"]).toMatch(/ebGaramond|EB Garamond/i);
    expect(h1?.["font-weight"]).toBe("500");
    expect(parseFloat(h1?.["letter-spacing"] ?? "0")).toBeLessThan(0);
    expect(h1Fonts).toMatch(/EB Garamond/i);
    expect(bodyFonts).toMatch(/Geist|Inter/);
    expect(ctaInner?.["border-radius"]).toBe("9999px");
    expect(Number(cta?.h)).toBeGreaterThanOrEqual(40);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

for (const route of ["/sign-in", "/register"]) {
  for (const width of [1440, 390]) {
    test(`auth ${route} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route);
      await settle(page);
      const card = await styleOf(page, ".auth-card", [
        "border-radius",
        "border-top-color",
        "box-shadow",
        "background-color",
        "background-image",
      ]);
      const h1 = await styleOf(page, ".auth-page h1", [
        "font-family",
        "font-weight",
        "letter-spacing",
      ]);
      const h1Fonts = await platformFonts(page, ".auth-page h1");
      const input = await styleOf(
        page,
        ".auth-page input:not([type=checkbox]):not([type=radio])",
        ["border-radius", "background-color", "color", "padding"],
      );
      const inputWrap = await styleOf(page, ".signup-glass-input", [
        "border-radius",
        "background-color",
      ]);
      const primary = await styleOf(
        page,
        ".auth-card [data-slot='texture-button'][data-variant='primary']",
        ["border-radius", "background-color", "background-image", "color"],
      );
      const primaryInner = await styleOf(
        page,
        ".auth-card [data-slot='texture-button'][data-variant='primary'] > span",
        [
          "border-radius",
          "background-color",
          "background-image",
          "color",
          "font-family",
        ],
      );
      const bodyFonts = await platformFonts(
        page,
        ".auth-card p, .auth-card label",
      );
      const pageBg = await styleOf(page, ".auth-page", [
        "background-color",
        "font-family",
      ]);
      const buttons = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(".auth-page button, .auth-page a"),
        ).map((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return `${el.tagName}[${el.getAttribute("data-variant") ?? ""}] "${(el.textContent ?? "").trim().slice(0, 24)}" r=${cs.borderRadius} bg=${cs.backgroundColor} h=${Math.round(r.height)}`;
        }),
      );
      report[`auth${route}-${width}`] = {
        card,
        h1,
        h1Fonts,
        input,
        inputWrap,
        primary,
        primaryInner,
        bodyFonts,
        pageBg,
        buttons,
        overflow: await overflow(page),
      };
      await page.screenshot({
        path: `${OUT}/auth${route.replace("/", "-")}-${width}.png`,
        fullPage: true,
      });
      expect(card?.["border-radius"]).toBe("28px");
      expect(h1Fonts).toMatch(/EB Garamond/i);
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }
}

for (const width of [1440, 390]) {
  test(`profile ${width}`, async ({ page }) => {
    await guest(page);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/app/profile");
    await expect(
      page.getByRole("heading", { name: "Аккаунт", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await settle(page);
    await page.waitForTimeout(1500);
    const h1 = await styleOf(page, ".profile-shell h1", [
      "font-family",
      "font-weight",
      "letter-spacing",
    ]);
    const h1Fonts = await platformFonts(page, ".profile-shell h1");
    const bodyFonts = await platformFonts(page, ".profile-subtitle");
    const shell = await styleOf(page, ".profile-shell", [
      "background-color",
      "background-image",
      "font-family",
    ]);
    const htmlBg = await page.evaluate(() => [
      getComputedStyle(document.documentElement).backgroundColor,
      getComputedStyle(document.body).backgroundColor,
    ]);
    const radii = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".profile-shell *"))
        .map((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return { el, cs, r };
        })
        .filter(
          ({ cs, r }) =>
            cs.borderRadius !== "0px" && r.width > 120 && r.height > 60,
        )
        .map(
          ({ el, cs }) =>
            `${el.tagName}.${String(el.className).slice(0, 50)} r=${cs.borderRadius} bg=${cs.backgroundColor} border=${cs.borderTopWidth} ${cs.borderTopColor} shadow=${cs.boxShadow.slice(0, 90)}`,
        ),
    );
    const buttons = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          ".profile-shell [data-slot='texture-button']",
        ),
      ).map((el) => {
        const cs = getComputedStyle(el);
        const inner = el.querySelector(":scope > span");
        const ics = inner ? getComputedStyle(inner) : cs;
        const r = el.getBoundingClientRect();
        return `${el.getAttribute("data-variant")} "${(el.textContent ?? "").trim().slice(0, 24)}" r=${ics.borderRadius} bg=${ics.backgroundColor} ${ics.backgroundImage.slice(0, 60)} color=${ics.color} h=${Math.round(r.height)}`;
      }),
    );
    report[`profile-${width}`] = {
      h1,
      h1Fonts,
      bodyFonts,
      shell,
      htmlBg,
      radii,
      buttons,
      overflow: await overflow(page),
    };
    await page.screenshot({
      path: `${OUT}/profile-${width}.png`,
      fullPage: true,
    });
    expect(h1Fonts).toMatch(/EB Garamond/i);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

for (const route of ["/", "/sign-in", "/register", "/app/profile"]) {
  test(`no horizontal scroll at 320 on ${route}`, async ({ page }) => {
    await guest(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await settle(page);
    await page.waitForTimeout(1200);
    const o = await overflow(page);
    report[`overflow-320-${route}`] = o;
    await page.screenshot({
      path: `${OUT}/${route === "/" ? "landing" : route.replace(/\//g, "-").slice(1)}-320.png`,
    });
    expect(o).toBeLessThanOrEqual(0);
  });
}

test("register error text uses #D92D20 and focused input gets primary ring", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/register");
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Пароль", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  const err = page.locator("#auth-error");
  await expect(err).toHaveText("Минимум 8 символов");
  const color = await err.evaluate((el) => getComputedStyle(el).color);
  await page.getByLabel("Пароль", { exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const ring = await page
    .getByLabel("Пароль", { exact: true })
    .evaluate((el) => {
      const wrap = el.closest(".signup-glass-input") ?? el;
      const cs = getComputedStyle(wrap);
      const ics = getComputedStyle(el);
      return {
        wrapBorder: cs.borderTopColor,
        wrapShadow: cs.boxShadow,
        inputOutline: `${ics.outlineStyle} ${ics.outlineColor}`,
      };
    });
  report["register-error"] = { color, ring };
  await page.screenshot({ path: `${OUT}/auth-register-error-1440.png` });
  expect(color).toBe("rgb(217, 45, 32)");
});

test("sign-in server error text uses #D92D20", async ({ page }) => {
  await page.route("**/auth/v1/token**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "Invalid login credentials",
        code: "invalid_credentials",
      }),
    }),
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/sign-in");
  await page.getByLabel("Почта").fill("qa@example.org");
  await page.getByLabel("Пароль", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: /Войти/ }).click();
  const err = page.locator("#auth-error, .auth-error").first();
  await expect(err).toBeVisible();
  const color = await err.evaluate((el) => getComputedStyle(el).color);
  report["sign-in-error"] = { color, text: await err.textContent() };
  await page.screenshot({ path: `${OUT}/auth-sign-in-error-390.png` });
  expect(color).toBe("rgb(217, 45, 32)");
});

for (const sub of ["settings", "progress", "desktop"]) {
  for (const width of [1440, 390]) {
    test(`profile/${sub} ${width}`, async ({ page }) => {
      await guest(page);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/app/profile/${sub}`);
      await page.waitForSelector(".profile-shell h1");
      await settle(page);
      await page.waitForTimeout(1200);
      const h1Fonts = await platformFonts(page, ".profile-shell h1");
      const cards = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".profile-main *"))
          .map((el) => ({
            el,
            cs: getComputedStyle(el),
            r: el.getBoundingClientRect(),
          }))
          .filter(
            ({ cs, r }) =>
              cs.borderRadius !== "0px" && r.width > 140 && r.height > 70,
          )
          .map(
            ({ el, cs }) =>
              `${el.tagName}.${String(el.className).slice(0, 50)} r=${cs.borderRadius} bg=${cs.backgroundColor} border=${cs.borderTopWidth} ${cs.borderTopColor} shadow=${cs.boxShadow.slice(0, 100)}`,
          ),
      );
      const inputs = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            ".profile-main :is(input, select, textarea)",
          ),
        ).map((el) => {
          const cs = getComputedStyle(el);
          return `${el.tagName}[${el.getAttribute("type") ?? ""}] r=${cs.borderRadius} bg=${cs.backgroundColor} pad=${cs.padding}`;
        }),
      );
      report[`profile-${sub}-${width}`] = {
        h1Fonts,
        cards,
        inputs,
        overflow: await overflow(page),
      };
      await page.screenshot({
        path: `${OUT}/profile-${sub}-${width}.png`,
        fullPage: true,
      });
      expect(await overflow(page)).toBeLessThanOrEqual(0);
    });
  }
}

for (const route of ["/app/pricing", "/app/docs"]) {
  test(`${route} 1440 cards`, async ({ page }) => {
    await guest(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await settle(page);
    await page.waitForTimeout(1200);
    const cards = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".profile-shell *"))
        .map((el) => ({
          el,
          cs: getComputedStyle(el),
          r: el.getBoundingClientRect(),
        }))
        .filter(
          ({ cs, r }) =>
            cs.borderRadius !== "0px" && r.width > 140 && r.height > 120,
        )
        .map(
          ({ el, cs }) =>
            `${el.tagName}.${String(el.className).slice(0, 50)} r=${cs.borderRadius} bg=${cs.backgroundColor} border=${cs.borderTopWidth} ${cs.borderTopColor}`,
        ),
    );
    report[`${route}-1440`] = { cards, overflow: await overflow(page) };
    await page.screenshot({
      path: `${OUT}${route.replace("/app", "")}-1440.png`,
      fullPage: true,
    });
  });
}
