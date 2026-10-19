import { readdir, readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8").catch(() => ""))
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
);
const names = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "YOUTUBE_API_KEY",
  "SUPABASE_SECRET_KEY",
];
let leaks = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = dir + "/" + entry.name;
    if (entry.isDirectory()) await walk(p);
    else if (/\.(js|json|html)$/.test(p)) {
      const text = await readFile(p, "utf8");
      if (
        names.some((n) => text.includes(n) || (env[n] && text.includes(env[n])))
      ) {
        console.error("Secret reference in client output:", p);
        leaks++;
      }
    }
  }
}
await walk(".next/static");
console.log(
  leaks ? "Client secret check FAILED" : "Client secret check passed",
);
if (leaks) process.exitCode = 1;
