import { readdir, readFile } from "node:fs/promises";
const errors = [];
async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) await scan(p);
    else if (/\.(css|tsx|ts)$/.test(p)) {
      const s = await readFile(p, "utf8");
      if (
        /text-\[[^\]]*(?:px|rem)/.test(s) ||
        /font-size:\s*(?!var\()[\d.]/.test(s) ||
        /\bfont:\s*(?!inherit)[^;}]*\d(?:px|rem)/.test(s)
      )
        errors.push(p);
    }
  }
}
for (const d of [
  "src/components/cabinet",
  "src/components/shell",
  "src/components/lesson",
  "src/components/mentor",
  "src/components/icons",
  "src/components/home",
  "src/components/profile",
  "src/components/shop",
  "src/app/app",
])
  await scan(d);
console.log(errors.length ? errors : "Typography tokens: OK");
if (errors.length) process.exitCode = 1;
