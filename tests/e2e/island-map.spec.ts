import { test, expect } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  const progress = createProgress();
  progress.profile.name = "Лис";
  progress.tourSeen = { "/app/map": true };
  await page
    .context()
    .addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
  await page.addInitScript((p) => {
    localStorage.setItem("arduhub.progress.v1", JSON.stringify(p));
    localStorage.setItem(
      "arduhub.save-prompt.v1:local",
      JSON.stringify({ firstShownAt: Date.now(), shown: 2 }),
    );
  }, progress);
});
test("mobile map supports pinch and reset", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/app/map");
  const map = page.locator(".island-map-svg");
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  const point = (id: number, x: number) => ({
    pointerId: id,
    pointerType: "touch",
    clientX: box.x + x,
    clientY: box.y + box.height / 2,
  });
  await map.dispatchEvent("pointerdown", point(1, 80));
  await map.dispatchEvent("pointerdown", point(2, 160));
  await map.dispatchEvent("pointermove", point(2, 210));
  await map.dispatchEvent("pointerup", point(1, 80));
  await map.dispatchEvent("pointerup", point(2, 210));
  await expect(page.locator(".island-map-svg > g")).not.toHaveAttribute(
    "transform",
    "translate(0 0) scale(1)",
  );
  await page.getByRole("button", { name: "Вся карта" }).click();
  await expect(page.locator(".island-map-svg > g")).toHaveAttribute(
    "transform",
    "translate(0 0) scale(1)",
  );
});
test("map editor exports dragged image coordinates", async ({ page }) => {
  await page.goto("/dev/map-editor");
  const marker = page.locator(".map-editor circle").first();
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 35,
    box.y + box.height / 2 + 20,
    { steps: 5 },
  );
  await page.mouse.up();
  const exported = JSON.parse(await page.locator("textarea").inputValue());
  expect(exported[0].x).toBeGreaterThan(163);
  expect(exported).toHaveLength(5);
});
test("map keeps the whole natural image and stable nodes at each viewport", async ({
  page,
}) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/app/map");
    const map = page.locator("[data-map-viewport]");
    await expect(map).toBeVisible();
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();
    expect(
      Math.abs(bounds!.height - (bounds!.width * 720) / 1280),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator(".island-map-svg")).toHaveAttribute(
      "viewBox",
      "0 0 1280 720",
    );
    await expect(page.locator("[data-map-level]")).toHaveCount(5);
    await expect(page.locator(".island-map-node image")).toHaveCount(0);
    await expect(page.locator('[data-map-level="0"]')).toHaveAttribute(
      "data-status",
      "current",
    );
    await expect(page.locator('[data-map-level="1"]')).toHaveAttribute(
      "data-status",
      "locked",
    );
    await expect(page.locator(".island-level-list li")).toHaveCount(5);
    await page.getByRole("button", { name: "Приблизить карту" }).click();
    await page.getByRole("button", { name: "Вся карта" }).click();
    await expect(page.locator(".island-map-svg > g")).toHaveAttribute(
      "transform",
      "translate(0 0) scale(1)",
    );
    await page.screenshot({
      path: `reports/g3/map-${width}.png`,
      fullPage: true,
    });
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  }
});
