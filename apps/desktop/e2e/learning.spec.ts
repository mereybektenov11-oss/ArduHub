import { expect, test } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createProgress } from "../../../src/domain/seed";
import { achievementDeck } from "../../../src/content/achievements.ru";
import { passLessonQuiz } from "../../../tests/e2e/helpers/lessonQuiz";
import sketches from "@arduhub/curriculum/sketches.json" with { type: "json" };
import type { Page } from "@playwright/test";
import { launchMocked, signIn } from "./helpers";

// Text contrast of the themed screen (WCAG AA), reported per step. axe-core
// is injected directly: AxeBuilder needs new pages, which Electron lacks.
const axeSource = readFileSync(
  createRequire(
    createRequire(join(__dirname, "../../../package.json")).resolve(
      "@axe-core/playwright",
    ),
  ).resolve("axe-core/axe.min.js"),
  "utf8",
);
type AxeResult = {
  violations: {
    help: string;
    nodes: { target: string[]; any: { message: string }[] }[];
  }[];
};
async function contrast(page: Page, step: string, found: string[]) {
  await page.evaluate(axeSource);
  const r = (await page.evaluate(() =>
    (
      window as unknown as { axe: { run: (o: object) => Promise<unknown> } }
    ).axe.run({
      runOnly: ["color-contrast"],
    }),
  )) as AxeResult;
  for (const v of r.violations)
    for (const n of v.nodes)
      found.push(
        `${step}: ${n.target.join(" ")} — ${n.any[0]?.message ?? v.help}`,
      );
  // Visible text must use Boxicons, not emoji or symbol glyphs.
  const text = await page.locator("body").innerText();
  for (const m of text.matchAll(glyphs)) {
    // An arrow between two words is wiring notation in task text
    // («13 → резистор»), not an icon.
    const around = text.slice(Math.max(0, m.index - 2), m.index + 3);
    if (m[0] === "→" && /^\S → \S$/u.test(around)) continue;
    found.push(
      `${step}: glyph «${m[0]}» in “${text.slice(Math.max(0, m.index - 25), m.index + 10).replace(/\s+/g, " ")}”`,
    );
  }
}
const glyphs = /[×←-⯿☀-➿■-◿\u{1F000}-\u{1FFFF}]️?/gu;

const shots = resolve(__dirname, "../../../outputs/desktop-d2");
const shotsLight = resolve(__dirname, "../../../outputs/desktop-light");

// Same learner fixture as the site's learning-v2 E2E: notices and tours seen.
function learner() {
  const p = createProgress();
  p.profile.name = "Алия";
  p.achievements = {
    unlocked: [],
    claimed: [],
    notified: achievementDeck.map((item) => item.id),
  };
  p.tourSeen = { "/app": true, "/app/map": true, "/app/practice": true };
  for (let i = 1; i <= 12; i++) p.tourSeen["/app/lesson/lesson-" + i] = true;
  return p;
}

const themeLabel = { dark: "Тёмная", light: "Светлая" } as const;

for (const theme of ["dark", "light"] as const)
  test(`lesson 1 end to end in the app (${theme} theme): video, test, circuit, code, real worker run`, async () => {
    test.setTimeout(120_000);
    const dir = theme === "dark" ? shots : shotsLight;
    const userData = mkdtempSync(join(tmpdir(), `arduhub-d2-${theme}-`));
    const s = await launchMocked(userData, { progress: learner() });
    try {
      const { page } = s;
      await signIn(page, "correct-horse");
      await page.getByRole("button", { name: /Настройки/ }).click();
      await page.getByLabel(themeLabel[theme], { exact: true }).check();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.getByRole("button", { name: /В меню/ }).click();
      await page.getByRole("button", { name: /Обучение/ }).click();
      await expect(
        page.getByRole("heading", { name: "Карта уроков" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Урок 2:/ }),
      ).toBeDisabled();
      await page.screenshot({ path: join(dir, "map.png") });
      const low: string[] = [];
      await contrast(page, "map", low);

      await page.getByRole("button", { name: /Урок 1: Первый огонёк/ }).click();
      await expect(
        page.getByRole("button", { name: "Практика", exact: true }),
      ).toBeDisabled();
      await page.screenshot({ path: join(dir, "lesson-video.png") });
      await contrast(page, "video", low);
      // Pixel face only for the lesson's main title; the rest is the text
      // face (SF Pro when installed, otherwise Inter).
      const lessonFonts = await page.evaluate(() => ({
        title: getComputedStyle(document.querySelector(".cabinet h1")!)
          .fontFamily,
        header: getComputedStyle(document.querySelector(".flow-course-title")!)
          .fontFamily,
        body: getComputedStyle(document.querySelector(".cabinet p")!)
          .fontFamily,
      }));
      expect(lessonFonts.title).toContain("Monocraft");
      expect(lessonFonts.header).not.toContain("Monocraft");
      expect(lessonFonts.header).toMatch(/^"SF Pro Text"/);
      expect(lessonFonts.body).toMatch(/^"SF Pro Text"/);
      await page
        .getByRole("button", { name: "Я посмотрел", exact: true })
        .click();
      await page.getByRole("button", { name: "К тесту", exact: true }).click();
      await page.screenshot({ path: join(dir, "lesson-test.png") });
      await contrast(page, "test", low);
      await passLessonQuiz(page);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(dir, "lesson-practice.png") });
      await contrast(page, "practice", low);

      const pin = (name: string) =>
        page.getByRole("button", { name, exact: true });
      for (const [a, b] of [
        ["uno 13", "r 1"],
        ["r 2", "led A"],
        ["led C", "uno GND.2"],
      ]) {
        await pin(a).click();
        await pin(b).click();
      }
      await page
        .getByRole("button", { name: "Проверить схему", exact: true })
        .click();
      await page.screenshot({ path: join(dir, "lesson-circuit.png") });
      await page.getByRole("tab", { name: "Код", exact: true }).click();
      const editor = page.getByRole("textbox", { name: "Код", exact: true });
      await expect(editor).toContainText("___");
      await editor.fill(sketches[0].code);
      await page.getByRole("tab", { name: "Код", exact: true }).click();
      await page.screenshot({ path: join(dir, "lesson-code.png") });
      await contrast(page, "code", low);
      await page.getByRole("button", { name: /^Запустить/ }).click();
      await expect(
        page.getByRole("heading", { name: "Урок пройден!" }),
      ).toBeVisible({
        timeout: 30_000,
      });
      await page.screenshot({ path: join(dir, "lesson-done.png") });
      await contrast(page, "done", low);
      expect(low).toEqual([]);

      // Back to the map and the menu: the app's own screens keep their theme
      // after the site lesson styles were loaded.
      await page.getByText("К пути", { exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Карта уроков" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "В меню" }).click();
      await expect(
        page.getByRole("heading", { name: /Привет, Алия!/ }),
      ).toBeVisible();
      const font = await page
        .getByRole("heading", { name: /Привет, Алия!/ })
        .evaluate((h) => getComputedStyle(h).fontFamily);
      expect(font).toContain("Monocraft");
      const tileFont = await page
        .getByRole("heading", { name: "Обучение" })
        .evaluate((h) => getComputedStyle(h).fontFamily);
      expect(tileFont).toMatch(/^"SF Pro Text"/);
      expect(tileFont).not.toContain("Monocraft");
      await page.screenshot({ path: join(dir, "menu-after-lesson.png") });

      // Progress reached the account through the site's own RPC.
      expect(s.requests).toContain("POST /rest/v1/rpc/save_progress");
      expect(s.errors).toEqual([]);
    } finally {
      await s.app.close();
      rmSync(userData, { recursive: true, force: true });
    }
  });
