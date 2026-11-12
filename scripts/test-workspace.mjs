import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

// pnpm recursive tasks reject a junction-backed node_modules on Windows.
// Invoke the same installed Vitest CLI in each workspace instead.
const require = createRequire(import.meta.url);
const cli = resolve(
  dirname(require.resolve("vitest/package.json")),
  "vitest.mjs",
);
for (const cwd of [
  ".",
  "packages/curriculum",
  "packages/arduino-core",
  "apps/desktop",
]) {
  const result = spawnSync(process.execPath, [cli, "run"], {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
