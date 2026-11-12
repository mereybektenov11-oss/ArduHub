import { chromium } from "@playwright/test";
const out = process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
for (const w of [360, 1440]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
  await ctx.addCookies([{ name: "arduhub-guest", value: "1", domain: "127.0.0.1", path: "/" }]);
  const p = await ctx.newPage();
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("http://127.0.0.1:3100/app/profile");
  await p.waitForSelector("#profile-main h1");
  const o = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(w, "overflow", o);
  await p.screenshot({ path: `${out}/guest-profile-${w}.png` });
  await ctx.close();
}
await b.close();
