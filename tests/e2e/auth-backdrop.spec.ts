import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [360, 1440]) {
  for (const route of ["sign-in", "register"]) {
    test(`${route} keeps the form centered over a full background at ${width}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${route}`);
      await expect(page.locator(".auth-backdrop")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await expect(page.locator(".auth-backdrop img")).toHaveCount(3);
      await expect
        .poll(() =>
          page
            .locator(".auth-backdrop img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await expect(
        page.locator(".auth-subtitle, .auth-workshop, .auth-workshop-caption"),
      ).toHaveCount(0);
      const layout = await page.evaluate(() => {
        const card = document
          .querySelector(".auth-card")!
          .getBoundingClientRect();
        const bg = document
          .querySelector(".auth-backdrop")!
          .getBoundingClientRect();
        return {
          centered: Math.abs(card.left + card.width / 2 - innerWidth / 2) < 2,
          full: bg.width === innerWidth && bg.height === innerHeight,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(layout).toEqual({ centered: true, full: true, overflow: false });
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact!),
        ),
      ).toEqual([]);
    });
  }
}

test("background crossfades between three scenes without replacing form data", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await expect(page.locator(".auth-backdrop")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByLabel("Почта").fill("learner@example.org");
  for (const [time, active] of [
    [0, 0],
    [6000, 1],
    [12000, 2],
  ] as const) {
    const opacity = await page.locator(".auth-backdrop img").evaluateAll(
      (images, time) =>
        images.map((img) => {
          const animation = img.getAnimations()[0];
          animation.pause();
          animation.currentTime = time;
          return Number(getComputedStyle(img).opacity);
        }),
      time,
    );
    expect(opacity[active]).toBe(1);
    expect(opacity.filter((value) => value === 0)).toHaveLength(2);
    await expect(page.getByLabel("Почта")).toHaveValue("learner@example.org");
  }
  await expect(page.locator(".auth-backdrop img").first()).toHaveCSS(
    "animation-duration",
    "15s",
  );
});

test("reduced motion shows a static workshop and dark theme stays accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/register");
  await expect(page.locator(".auth-backdrop")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const state = await page.locator(".auth-backdrop img").evaluateAll((images) =>
    images.map((img) => ({
      animation: getComputedStyle(img).animationName,
      opacity: getComputedStyle(img).opacity,
    })),
  );
  expect(state).toEqual([
    { animation: "none", opacity: "1" },
    { animation: "none", opacity: "0" },
    { animation: "none", opacity: "0" },
  ]);
  await page.getByRole("button", { name: "Переключить тему" }).click();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((v) => ["serious", "critical"].includes(v.impact!)),
  ).toEqual([]);
});
