import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));

export default defineConfig(({ mode }) => {
  // Reuse the site's public Supabase settings. Only the two public values are
  // read; server secrets in the same file never reach the app bundle.
  const env = loadEnv(mode, repoRoot, "NEXT_PUBLIC_SUPABASE_");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const dev = mode === "development";
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin}${dev ? " ws://127.0.0.1:5199" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  return {
    root: "src/renderer",
    base: "./",
    plugins: [
      react(),
      {
        name: "arduhub-csp",
        transformIndexHtml: (html) => html.replace("%CSP%", csp),
      },
    ],
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseKey),
    },
    resolve: {
      alias: {
        "@arduhub/curriculum": pkg("curriculum"),
        "@arduhub/arduino-core": pkg("arduino-core"),
      },
    },
    server: { host: "127.0.0.1", port: 5199, strictPort: true },
    build: {
      outDir: "../../dist/renderer",
      emptyOutDir: true,
    },
  };
});
