import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
