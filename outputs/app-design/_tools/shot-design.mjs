// Screenshots every mockup and checks text contrast of the token pairs.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
const require = createRequire(join(root, "package.json"));
const { chromium } = require(require.resolve("playwright", { paths: [require.resolve("@playwright/test")] }));
const out = join(root, "outputs", "app-design");
const tokens = JSON.parse(readFileSync(join(out, "tokens.json"), "utf8"));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ["--color-text", "--color-bg"], ["--color-text", "--color-surface"], ["--color-text", "--color-surface-2"],
  ["--color-muted", "--color-bg"], ["--color-muted", "--color-surface"], ["--color-muted", "--color-surface-2"],
  ["--color-on-primary", "--color-primary"], ["--color-primary", "--color-surface"], ["--color-locked", "--color-surface-2"],
];
const rows = [];
for (const [c, t] of Object.entries(tokens))
  for (const [fg, bg] of pairs) rows.push({ concept: c, fg, bg, ratio: +ratio(t[fg], t[bg]).toFixed(2) });
writeFileSync(join(out, "contrast.json"), JSON.stringify(rows, null, 2));
const bad = rows.filter((r) => r.ratio < 4.5);
console.log("contrast pairs", rows.length, "below 4.5:", JSON.stringify(bad));

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("requestfailed", (r) => errors.push("failed " + r.url()));
for (const c of Object.keys(tokens))
  for (const s of ["menu", "map", "lesson", "lab"]) {
    await page.goto(pathToFileURL(join(out, c, `${s}.html`)).href);
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => [...document.querySelectorAll(".card,h1,h2,h3,p")].filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > 1441 || e.getBoundingClientRect().bottom > 901).map((e) => e.tagName + ":" + e.textContent.slice(0, 30)));
    if (overflow.length) console.log("overflow", c, s, overflow);
    await page.screenshot({ path: join(out, c, `${s}.png`) });
  }
await page.goto(pathToFileURL(join(out, "index.html")).href);
await page.setViewportSize({ width: 1600, height: 1000 });
await page.screenshot({ path: join(out, "index.png"), fullPage: true });
await browser.close();
console.log("errors:", errors.length ? errors : "none");
