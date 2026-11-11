import { defineConfig } from "@playwright/test";

// Runs the built Electron app: `pnpm run build` first.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
});
