import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { compileJob } from "../compiler-service/compile-job.mjs";
const sketches = [
  ...JSON.parse(await readFile("src/content/sketches.json", "utf8")),
  ...JSON.parse(await readFile("src/content/hardware-examples.json", "utf8")),
  ...JSON.parse(await readFile("src/content/course-sketches.json", "utf8")),
  ...JSON.parse(await readFile("src/content/project-sketches.json", "utf8")),
];
const cli = resolve("tools/arduino/arduino-cli.exe");
const config = resolve("tools/arduino/arduino-cli.yaml");
const fixtures = [];
let existing = [];
try {
  existing = JSON.parse(
    await readFile("src/services/compile/fixtures.json", "utf8"),
  );
} catch {}
await mkdir("tests/fixtures/firmware", { recursive: true });
for (const sketch of sketches) {
  const cached = existing.find(
    (f) => f.id === sketch.id && f.code === sketch.code,
  );
  const result =
    cached ?? (await compileJob(sketch.code, cli, ["--config-file", config]));
  if (!result.hex) throw Error(`${sketch.id}: ${JSON.stringify(result)}`);
  fixtures.push({ id: sketch.id, code: sketch.code, hex: result.hex });
  await writeFile(`tests/fixtures/firmware/${sketch.id}.hex`, result.hex);
  console.log(`${sketch.id}: ${result.hex.length} HEX characters`);
}
await writeFile(
  "src/services/compile/fixtures.json",
  JSON.stringify(fixtures, null, 2) + "\n",
);
