import { spawnSync } from "node:child_process";
// Uses the shared Playwright production server configuration and records actual cabinet UI events.
// Run after pnpm build; do not run alongside another browser/Lighthouse verification.
const result = spawnSync(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  [
    "exec",
    "playwright",
    "test",
    "tests/e2e/g4-new-learner.spec.ts",
    "--grep",
    "cabinet event performance",
    "--workers=1",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, G4_PROFILE: "1" },
    shell: process.platform === "win32",
  },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
