// Development run: Vite dev server for the page, Electron for the window.
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const tsc = require.resolve("typescript/bin/tsc");
const built = spawnSync(process.execPath, [tsc, "-p", "tsconfig.main.json"], {
  stdio: "inherit",
});
if (built.status !== 0) process.exit(built.status ?? 1);

const server = await createServer({
  configFile: "vite.config.mts",
  mode: "development",
});
await server.listen();
const url = server.resolvedUrls?.local[0];
const electron = spawn(require("electron"), ["."], {
  stdio: "inherit",
  env: { ...process.env, ARDUHUB_DEV_SERVER_URL: url },
});
electron.on("exit", async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
