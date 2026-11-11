import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // Desktop app (Electron + Vite, not Next): the next/* shims accept and
    // ignore Next-only props on purpose, and next/image is replaced by <img>.
    files: ["apps/desktop/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "coverage/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "reports/**",
    ".lighthouseci/**",
    "apps/desktop/dist/**",
    "apps/desktop/release/**",
  ]),
]);
