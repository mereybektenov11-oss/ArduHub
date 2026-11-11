import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const repoRoot = here("../..");
const siteSrc = here("../../src");
const shim = (name: string) => here(`src/renderer/shims/${name}`);

// Static files the reused lesson code requests by absolute path, like on the
// site: lesson firmware (/hex), the icon sprite (/icons) and cabinet art
// (/cabinet). Copied into the build; served from the sources in development.
const staticDirs: Record<string, string> = {
  hex: here("../../packages/curriculum/hex"),
  icons: here("../../public/icons"),
  cabinet: here("../../public/cabinet"),
};
const mime: Record<string, string> = {
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
};

function staticAssets(): Plugin {
  return {
    name: "arduhub-static",
    configureServer(server) {
      for (const [prefix, dir] of Object.entries(staticDirs))
        server.middlewares.use(`/${prefix}`, (req, res, next) => {
          const name = (req.url ?? "").replace(/^\//, "").split("?")[0];
          const file = join(dir, name);
          if (!/^[\w.-]+$/.test(name) || !existsSync(file)) return next();
          res.setHeader(
            "Content-Type",
            mime[name.slice(name.lastIndexOf("."))] ?? "text/plain",
          );
          res.end(readFileSync(file));
        });
    },
    writeBundle(options) {
      for (const [prefix, dir] of Object.entries(staticDirs))
        cpSync(dir, join(options.dir!, prefix), { recursive: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Reuse the site's public Supabase settings. Only the two public values are
  // read; server secrets in the same file never reach the app bundle.
  const env = loadEnv(mode, repoRoot, "NEXT_PUBLIC_SUPABASE_");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  // Site that serves the AI mentor; a local site can be used for testing.
  const siteApi = process.env.ARDUHUB_SITE_API ?? "";
  const siteOrigin = new URL(siteApi || "https://arduhub.vercel.app").origin;
  const dev = mode === "development";
  const csp = [
    "default-src 'self'",
    // YouTube player API for the lesson video step.
    "script-src 'self' https://www.youtube.com https://s.ytimg.com",
    "worker-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: https://i.ytimg.com",
    "media-src 'self'",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    `connect-src 'self' ${supabaseOrigin} ${siteOrigin}${dev ? " ws://127.0.0.1:5199" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  return {
    root: "src/renderer",
    base: "/",
    publicDir: false,
    plugins: [
      react(),
      staticAssets(),
      {
        name: "arduhub-csp",
        transformIndexHtml: (html) => html.replace("%CSP%", csp),
      },
    ],
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseKey),
      __SITE_API__: JSON.stringify(siteApi),
      // The site's lesson code reads these public values directly.
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(supabaseKey),
      "process.env.NODE_ENV": JSON.stringify(
        dev ? "development" : "production",
      ),
    },
    resolve: {
      // One React for the app and the reused site components.
      dedupe: ["react", "react-dom", "@supabase/supabase-js"],
      alias: [
        {
          find: "@arduhub/curriculum",
          replacement: here("../../packages/curriculum/src"),
        },
        {
          find: "@arduhub/arduino-core",
          replacement: here("../../packages/arduino-core/src"),
        },
        // Site modules replaced for the desktop app.
        {
          find: /^@\/lib\/supabase\/client$/,
          replacement: shim("supabaseClient.ts"),
        },
        // The app's synthesized sounds replace the site's for lessons too.
        {
          find: /^@\/lib\/sfx$/,
          replacement: here("src/renderer/sound/sfx.ts"),
        },
        { find: /^next\/navigation$/, replacement: shim("navigation.ts") },
        { find: /^next\/link$/, replacement: shim("link.tsx") },
        { find: /^next\/dynamic$/, replacement: shim("dynamic.tsx") },
        { find: /^next\/image$/, replacement: shim("image.tsx") },
        // Reused lesson components of the site (D2). Before the site is
        // shortened (S1) they must move into a shared package, not be deleted.
        { find: /^@\//, replacement: `${siteSrc}/` },
      ],
    },
    worker: { format: "es" },
    server: {
      host: "127.0.0.1",
      port: 5199,
      strictPort: true,
      fs: { allow: [repoRoot, "D:/CodexWorkspaces/ArduHub_Software"] },
    },
    build: {
      outDir: "../../dist/renderer",
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
    },
  };
});
