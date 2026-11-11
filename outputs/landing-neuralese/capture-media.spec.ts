import { test } from "@playwright/test";
import { createProgress } from "../../src/domain/seed";
import { completeEvidence } from "../../tests/helpers/progressEvidence";

test("record own product examples in isolated local guest sessions", async ({
  browser,
}) => {
  const progress = createProgress();
  progress.profile.name = "Пример";
  progress.tourSeen = {
    "/app/lesson/lesson-1": true,
    "/app/lessons": true,
    "/app": true,
  };
  const evidence = completeEvidence("lesson-1");
  evidence.stages.practice = false;
  evidence.practice.run = false;
  progress.lessons["lesson-1"] = {
    ...progress.lessons["lesson-1"],
    ...evidence,
    status: "current",
  };
  for (const kind of ["editor", "review", "lessons"]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "no-preference",
      recordVideo: {
        dir: "outputs/landing-neuralese/raw",
        size: { width: 1280, height: 800 },
      },
    });
    await context.addCookies([
      { name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" },
    ]);
    await context.addInitScript(
      (p) => localStorage.setItem("arduhub.progress.v1", JSON.stringify(p)),
      progress,
    );
    const page = await context.newPage();
    await page.route("**/api/lesson-video?*", (r) =>
      r.fulfill({ status: 200, json: {} }),
    );
    if (kind === "editor") {
      await page.goto(
        "http://127.0.0.1:3100/app/lesson/lesson-1?stage=practice",
      );
      await page.getByRole("toolbar", { name: "Инструменты схемы" }).waitFor();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: "outputs/landing-neuralese/editor-source.png",
      });
      const part = page.locator(".l2-part").first();
      const box = await part.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width / 2 + 55,
          box.y + box.height / 2 + 25,
          { steps: 45 },
        );
        await page.mouse.up();
      }
      await page.waitForTimeout(2200);
      const check = page.getByRole("button", { name: /Проверить/ }).first();
      if (await check.isVisible()) await check.click();
      await page.waitForTimeout(3000);
    } else if (kind === "review") {
      await page.goto("http://127.0.0.1:3100/");
      await page.addStyleTag({
        content:
          "header,footer,main > :not(#product-demo){display:none!important}#product-demo{padding:24px!important;content-visibility:visible!important}.product-demo-intro{display:none!important}#product-demo .shell{width:100%!important;max-width:none!important}.product-window{box-shadow:none!important}.reveal{opacity:1!important;transform:none!important;filter:none!important}",
      });
      await page.waitForTimeout(1200);
      const demo = page.locator("#product-demo");
      await demo.getByRole("button", { name: "Найти ошибку" }).click();
      await page.waitForTimeout(2800);
      await demo.getByRole("button", { name: "Исправить соединение" }).click();
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: "outputs/landing-neuralese/review-source.png",
      });
    } else {
      await page.goto("http://127.0.0.1:3100/app/lessons");
      await page.locator("h1").waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: "outputs/landing-neuralese/lessons-source.png",
      });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            const start = performance.now();
            const distance = Math.min(
              700,
              document.documentElement.scrollHeight - innerHeight,
            );
            function tick(now: number) {
              const t = Math.min((now - start) / 4500, 1);
              window.scrollTo({ top: t * distance, behavior: "instant" });
              if (t < 1) requestAnimationFrame(tick);
              else resolve();
            }
            requestAnimationFrame(tick);
          }),
      );
      await page.waitForTimeout(1800);
    }
    const video = page.video();
    await context.close();
    await video?.saveAs(`outputs/landing-neuralese/raw/${kind}.webm`);
  }
});
