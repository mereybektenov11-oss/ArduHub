import { expect, type Page } from "@playwright/test";

/** Follow queued reward windows without collecting optional sparks. */
export async function dismissRewardDialogs(page: Page) {
  const deadline = Date.now() + 15_000;
  await page.waitForTimeout(200);
  while (Date.now() < deadline) {
    const open = page.locator("dialog.h-overlay-panel[open]");
    if (await open.count()) {
      await expect(open).toHaveCount(1);
      const title = await open.getAttribute("aria-label");
      if (title === "Стикер открыт") {
        await open
          .getByRole("button", { name: "Закрыть стикер", exact: true })
          .click();
      } else if (title === "Сохрани прогресс") {
        await open
          .getByRole("button", { name: "Закрыть", exact: true })
          .click();
      } else return;
      await page.waitForTimeout(180);
      continue;
    }
    if (!(await page.locator(".h-reward-host").count())) return;
    await page.waitForTimeout(150);
  }
  throw Error("Queued rewards did not finish");
}
