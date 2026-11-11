import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launchMocked, signIn } from "./helpers";

const shots = resolve(__dirname, "../../../outputs/desktop-motion");

// Counts sound sources started by the Web Audio engine.
async function countAudio(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __sources: number };
    w.__sources = 0;
    for (const proto of [
      OscillatorNode.prototype,
      AudioBufferSourceNode.prototype,
    ]) {
      const start = proto.start;
      proto.start = function (...args: Parameters<typeof start>) {
        w.__sources++;
        return start.apply(this, args);
      };
    }
  });
}
const sources = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sources: number }).__sources);

// Frame intervals while a screen transition runs.
async function frames(page: Page, action: () => Promise<void>) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[] };
    w.__frames = [];
    let last = performance.now();
    const end = last + 900;
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (t < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await action();
  await page.waitForTimeout(1000);
  const list = await page.evaluate(
    () => (window as unknown as { __frames: number[] }).__frames,
  );
  const sorted = [...list].sort((a, b) => a - b);
  return {
    frames: list.length,
    p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
    max: +sorted[sorted.length - 1].toFixed(1),
  };
}

// Interface text must use Boxicons, not emoji or symbol glyphs.
const glyphs = /[×←-⯿☀-➿■-◿\u{1F000}-\u{1FFFF}]/u;
async function noGlyphs(page: Page, screen: string) {
  const text = await page.locator("body").innerText();
  expect(text.match(glyphs)?.[0] ?? null, screen).toBeNull();
}

let userData = "";
test.beforeAll(() => {
  userData = mkdtempSync(join(tmpdir(), "arduhub-motion-"));
});
test.afterAll(() => rmSync(userData, { recursive: true, force: true }));

test("sounds play after a gesture, follow the setting; motion is smooth and can be turned off", async () => {
  const s = await launchMocked(userData);
  try {
    const { page } = s;
    await countAudio(page);

    await noGlyphs(page, "login");
    // Empty form: the deny sound plays after the click gesture.
    await page.getByRole("button", { name: "Войти" }).click();
    await expect.poll(() => sources(page)).toBeGreaterThan(0);
    await signIn(page, "correct-horse");
    await expect(
      page.getByRole("heading", { name: /Привет, Алия!/ }),
    ).toBeVisible();

    // Screens and tiles animate in.
    const anim = await page
      .locator(".screen")
      .evaluate((e) => getComputedStyle(e).animationName);
    expect(anim).toBe("screen-in");
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(shots, "menu.png") });
    await noGlyphs(page, "menu");

    const transition = await frames(page, () =>
      page.getByRole("button", { name: /Обучение/ }).click(),
    );
    console.log("menu → map frames", JSON.stringify(transition));
    await expect(
      page.getByRole("heading", { name: "Карта уроков" }),
    ).toBeVisible();
    await page.waitForTimeout(600);
    await noGlyphs(page, "map");
    await page.screenshot({ path: join(shots, "map.png") });
    await page.getByRole("button", { name: "В меню" }).click();

    // Settings: sound off silences, «Меньше анимации» stops animations.
    await page.getByRole("button", { name: /Настройки/ }).click();
    const before = await sources(page);
    await page.getByLabel("Звуковые эффекты").uncheck();
    await page.getByRole("button", { name: /В меню/ }).click();
    await page.getByRole("button", { name: /Настройки/ }).click();
    expect(await sources(page)).toBe(before);
    await page.getByLabel("Звуковые эффекты").check();
    await page.getByRole("button", { name: /Проверить звук/ }).click();
    await expect.poll(() => sources(page)).toBeGreaterThan(before);
    await page.screenshot({ path: join(shots, "settings.png") });
    await noGlyphs(page, "settings");

    await page.getByLabel("Меньше анимации").check();
    await page.getByRole("button", { name: /В меню/ }).click();
    const reduced = await page
      .locator(".screen")
      .evaluate((e) => getComputedStyle(e).animationName);
    expect(reduced).toBe("none");
    const pulse = await page
      .locator(".node.current")
      .first()
      .evaluate((e) => getComputedStyle(e, "::after").animationName);
    expect(pulse).toBe("none");
    expect(s.errors).toEqual([]);
  } finally {
    await s.app.close();
  }
});
