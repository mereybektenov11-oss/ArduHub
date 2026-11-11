import { test, expect, type Page } from "@playwright/test";

// Walks out from the button centre with elementFromPoint to measure the real
// pointer target (visual box plus the ::before hit-area extension).
async function hitBoxes(page: Page) {
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="texture-button"]:is([data-size="sm"], [data-size="icon"])',
      ),
    )
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => {
        el.scrollIntoView({ block: "center", inline: "center" });
        const box = el.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const own = (x: number, y: number) => {
          const hit = document.elementFromPoint(x, y);
          return !!hit && (hit === el || el.contains(hit));
        };
        const reach = (dx: number, dy: number) => {
          let d = 0;
          while (d < 30 && own(cx + dx * (d + 0.5), cy + dy * (d + 0.5)))
            d += 0.5;
          return d;
        };
        return {
          label: el.getAttribute("aria-label") || el.textContent!.trim(),
          visualHeight: box.height,
          hitWidth: reach(-1, 0) + reach(1, 0),
          hitHeight: reach(0, -1) + reach(0, 1),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      }),
  );
}

for (const width of [360, 1440])
  test(`small and icon buttons have a 44px hit area at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/register");
    await page.getByLabel("Почта").fill("qa@example.org");
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await expect(page.getByLabel("Пароль", { exact: true })).toBeVisible();
    const register = await hitBoxes(page);
    await page.goto("/sign-in");
    await expect(
      page.getByRole("button", { name: "Забыли пароль?" }),
    ).toBeVisible();
    const signIn = await hitBoxes(page);
    const all = [...register, ...signIn];
    // theme, eye, next, back, footer link; theme, eye, forgot, footer link
    expect(all.length).toBeGreaterThanOrEqual(9);
    for (const item of all) {
      expect(item.visualHeight, item.label).toBeLessThan(44);
      expect(item.hitWidth, item.label).toBeGreaterThanOrEqual(44);
      expect(item.hitHeight, item.label).toBeGreaterThanOrEqual(44);
      expect(item.overflow, item.label).toBeLessThanOrEqual(0);
    }
  });

test("disabled asChild link stays focusable but never navigates", async ({
  page,
}) => {
  await page.goto("/dev/texture-buttons");
  const link = page
    .getByRole("link", { name: "asChild disabled link" })
    .first();
  await expect(link).toHaveAttribute("aria-disabled", "true");
  await expect(link).toHaveAttribute("href", "/register");
  expect(await link.evaluate((el) => el.hasAttribute("disabled"))).toBe(false);
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press("Enter");
  await link.click({ force: true });
  await link.dispatchEvent("click");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/dev\/texture-buttons$/);
});
