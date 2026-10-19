import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const base = process.env.APP_TEST_URL ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ channel: "chrome" });
const report = {};
try {
  for (const route of ["/sign-in", "/app"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    if (route === "/app")
      await context.addCookies([
        { name: "arduhub-guest", value: "1", url: base },
      ]);
    const page = await context.newPage();
    const sizes = new Map();
    const pending = [];
    page.on("response", (r) => {
      if (/\.js(?:\?|$)/.test(r.url()))
        pending.push(
          r
            .body()
            .then((b) => sizes.set(r.url(), gzipSync(b).length))
            .catch(() => {}),
        );
    });
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    await page.waitForTimeout(1600);
    const skip = page.getByRole("button", { name: "Пропустить", exact: true });
    if (await skip.isVisible()) await skip.click();
    await Promise.all(pending);
    const bytes = [...sizes.values()].reduce((a, b) => a + b, 0);
    report[route] = {
      jsGzipBytes: bytes,
      jsGzipKiB: Number((bytes / 1024).toFixed(2)),
      scripts: sizes.size,
    };
    await page.screenshot({
      path:
        "reports/dashboard/" + (route === "/app" ? "desktop" : "auth") + ".png",
      fullPage: true,
    });
    await context.close();
  }
  await mkdir("reports/dashboard", { recursive: true });
  await writeFile(
    "reports/dashboard/bundle.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
if (report["/sign-in"].jsGzipBytes > 120 * 1024) process.exitCode = 1;
