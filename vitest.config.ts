import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    env: {
      LEARNING_COVERAGE: process.argv.some((arg) =>
        arg.startsWith("--coverage"),
      )
        ? "1"
        : "0",
    },
    coverage: {
      provider: "v8",
      include: [
        "src/lib/validators.ts",
        "src/lib/rateLimit.ts",
        "src/lib/db.ts",
        "src/lib/submitWaitlist.ts",
        "src/app/api/waitlist/route.ts",
        "packages/arduino-core/src/checker/check.ts",
        "src/domain/progress/streak.ts",
        "src/domain/progress/xp.ts",
        "src/domain/progress/storage.ts",
      ],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
