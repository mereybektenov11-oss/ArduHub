import { readFile, writeFile } from "node:fs/promises";
const html = await readFile(".next/server/app/index.html", "utf8");
const css = await readFile("src/app/globals.css", "utf8");
const colors = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*(#[\da-fA-F]+);/g)].map((match) => [
    match[1],
    match[2],
  ]),
);
let svg = html.match(
  /<svg class="circuit phase-fixed"[^>]*>[\s\S]*?<\/svg>/,
)?.[0];
if (!svg)
  throw new Error("Build the landing page before snapshotting CircuitScene.");
svg = svg
  .replace(
    "<svg ",
    '<svg xmlns="http://www.w3.org/2000/svg" width="450" height="260" ',
  )
  .replace(/var\(--([\w-]+)\)/g, (_, key) => {
    if (!colors[key]) throw new Error(`Unknown color: ${key}`);
    return colors[key];
  })
  .replace('class="led-color"', `class="led-color" color="${colors.success}"`);
await writeFile(
  "public/circuit-static.svg",
  `<!-- Generated from CircuitScene and project color tokens by scripts/snapshot-circuit.mjs -->\n${svg}\n`,
);
const firstWire = svg.indexOf('<path class="wire"');
if (firstWire < 0)
  throw new Error("CircuitScene no longer contains a wire layer.");
await writeFile(
  "public/circuit-base.svg",
  `<!-- Generated board and breadboard base; animated wires and LED are rendered separately. -->\n${svg.slice(0, firstWire)}</svg>\n`,
);
