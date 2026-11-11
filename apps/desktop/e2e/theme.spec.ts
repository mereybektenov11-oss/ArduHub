import { expect, test, type Page } from "@playwright/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launchMocked, signIn } from "./helpers";

const shots = resolve(__dirname, "../../../outputs/desktop-light");
const axeSource = readFileSync(
  createRequire(
    createRequire(join(__dirname, "../../../package.json")).resolve(
      "@axe-core/playwright",
    ),
  ).resolve("axe-core/axe.min.js"),
  "utf8",
);

// WCAG AA text contrast of the current screen, after animations settle.
async function contrast(page: Page, screen: string) {
  await page.waitForTimeout(900);
  await page.evaluate(axeSource);
  const r = (await page.evaluate(() =>
    (
      window as unknown as { axe: { run: (o: object) => Promise<unknown> } }
    ).axe.run({ runOnly: ["color-contrast"] }),
  )) as { violations: { nodes: { target: string[] }[] }[] };
  const nodes = r.violations.flatMap((v) => v.nodes.map((n) => n.target[0]));
  expect(nodes, screen).toEqual([]);
}

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("the app has a light theme only, readable on every screen", async () => {
  const userData = mkdtempSync(join(tmpdir(), "arduhub-theme-"));
  try {
    const s = await launchMocked(userData);
    const page = s.page;
    // Even with Windows in dark mode the app stays light.
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await bodyBackground(page)).toBe("rgb(244, 247, 253)");
    await contrast(page, "login");
    await page.screenshot({ path: join(shots, "login.png") });

    await signIn(page, "correct-horse");
    await expect(
      page.getByRole("heading", { name: /Привет, Алия!/ }),
    ).toBeVisible();
    await contrast(page, "menu");
    await page.screenshot({ path: join(shots, "menu.png") });

    await page.getByRole("button", { name: /Обучение/ }).click();
    await expect(
      page.getByRole("heading", { name: "Карта уроков" }),
    ).toBeVisible();
    await contrast(page, "map");
    await page.screenshot({ path: join(shots, "map.png") });
    await page.getByRole("button", { name: "В меню" }).click();

    // Settings no longer offer a theme choice.
    await page.getByRole("button", { name: /Настройки/ }).click();
    await expect(page.getByText("Тема", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Тёмная", { exact: true })).toHaveCount(0);
    expect(await bodyBackground(page)).toBe("rgb(244, 247, 253)");
    await contrast(page, "settings");
    await page.screenshot({ path: join(shots, "settings.png") });
    expect(s.errors).toEqual([]);
    await s.app.close();
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});
