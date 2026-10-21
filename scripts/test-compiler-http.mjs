import { readFile } from "node:fs/promises";
const url = process.env.COMPILER_TEST_URL ?? "http://127.0.0.1:8081";
const key = process.env.COMPILER_TEST_SECRET;
if (!key) throw Error("Set a dedicated test secret");
for (let i = 0; i < 20; i++) {
  try {
    if ((await fetch(url + "/health")).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
const example = JSON.parse(
  await readFile("src/content/sketches.json", "utf8"),
)[0].code;
const request = (code, secret = key) =>
  fetch(url + "/compile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ code, board: "uno" }),
    signal: AbortSignal.timeout(30000),
  });
const start = performance.now();
const first = await request(example);
const data = await first.json();
if (first.status !== 200 || !data.hex) throw Error("Blink failed");
if (performance.now() - start > 30000) throw Error("Cold compile too slow");
const cachedStart = performance.now();
if (!(await request(example)).ok || performance.now() - cachedStart > 1000)
  throw Error("Cache too slow");
if ((await request(example, "wrong")).status !== 401)
  throw Error("Secret check failed");
const bad = await request(
  "void setup(){\n pinMode(13,OUTPUT)\n}\nvoid loop(){}",
);
const errors = await bad.json();
if (bad.status !== 400 || !errors.diagnostics?.some((d) => d.line >= 2))
  throw Error("Line diagnostics missing");
console.log(
  "HTTP compiler: health, cold Blink, cache, authorization and syntax diagnostics passed",
);
