import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "capture-media.spec.ts",
  timeout: 120000,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", channel: "chrome", headless: true },
});
