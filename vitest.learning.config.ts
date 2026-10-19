import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/learning*.test.ts"],
    env: { LEARNING_COVERAGE: "1" },
    coverage: {
      provider: "v8",
      include: [
        "src/domain/scene/netlist.ts",
        "src/domain/scene/migrate.ts",
        "src/domain/scene/check.ts",
        "src/domain/sim/checks.ts",
        "src/services/compile/explain.ts",
      ],
      reportsDirectory: "coverage/learning-v2",
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
