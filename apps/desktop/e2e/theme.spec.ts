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

test("light theme: chosen in settings, kept after restart, readable everywhere", async () => {
  const userData = mkdtempSync(join(tmpdir(), "arduhub-theme-"));
  try {
    let s = await launchMocked(userData);
    let page = s.page;
    await signIn(page, "correct-horse");
    await page.getByRole("button", { name: /Настройки/ }).click();
    await page.getByLabel("Светлая", { exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
    ).toBe("rgb(244, 247, 253)");
    await contrast(page, "settings");
    await page.screenshot({ path: join(shots, "settings.png") });
    await s.app.close();

    // The choice survives a restart and applies before the menu appears.
    s = await launchMocked(userData);
    page = s.page;
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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

    // Back to dark: the switch is immediate.
    await page.getByRole("button", { name: /Настройки/ }).click();
    await page.getByLabel("Тёмная", { exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByLabel("Светлая", { exact: true }).check();
    await page.getByRole("button", { name: "Выйти из аккаунта" }).click();
    await expect(
      page.getByRole("heading", { name: "Вход в ArduHub" }),
    ).toBeVisible();
    await contrast(page, "login");
    await page.screenshot({ path: join(shots, "login.png") });
    expect(s.errors).toEqual([]);
    await s.app.close();
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
});
