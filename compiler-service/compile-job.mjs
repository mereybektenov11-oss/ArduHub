import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { validateCode, parseDiagnostics } from "./policy.mjs";
// Shared runner for the job container and explicit trusted-local development mode.
// No shell and no interpolated command arguments.
export async function compileJob(
  code,
  executable = "arduino-cli",
  extra = [],
  environment = process.env,
) {
  const error = validateCode(code);
  if (error) return { error, diagnostics: [] };
  const root = await mkdtemp(join(tmpdir(), "arduhub-"));
  try {
    const sketch = join(root, "sketch");
    await mkdir(sketch);
    await writeFile(join(sketch, "sketch.ino"), code);
    const result = await new Promise((resolve) => {
      const child = spawn(
        executable,
        [
          "compile",
          "--fqbn",
          "arduino:avr:uno",
          "--build-path",
          join(root, "build"),
          "--build-cache-path",
          join(root, "cache"),
          ...extra,
          sketch,
        ],
        {
          shell: false,
          windowsHide: true,
          detached: process.platform !== "win32",
          env: environment,
        },
      );
      let output = "",
        settled = false;
      const finish = (exit) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exit, output });
      };
      const timer = setTimeout(() => {
        if (process.platform === "win32" && child.pid) {
          const killer = spawn(
            "taskkill",
            ["/PID", String(child.pid), "/T", "/F"],
            { shell: false, windowsHide: true },
          );
          killer.once("error", () => {
            child.kill();
            finish(-1);
          });
          killer.once("close", () => finish(-1));
        } else {
          // Arduino CLI spawns avr-g++; kill the process group on timeout too.
          try {
            if (child.pid) process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
          finish(-1);
        }
      }, 20000);
      const collect = (d) => {
        output = (output + d.toString()).slice(-32000);
      };
      child.stdout.on("data", collect);
      child.stderr.on("data", collect);
      child.on("error", () => finish(-2));
      child.on("close", finish);
    });
    if (result.exit === -1) return { error: "compiler_timeout" };
    if (result.exit === -2) return { error: "compiler_unavailable" };
    if (result.exit !== 0)
      return {
        error: "compile_error",
        diagnostics: parseDiagnostics(result.output),
      };
    return {
      hex: await readFile(join(root, "build", "sketch.ino.hex"), "utf8"),
      warnings: parseDiagnostics(result.output),
    };
  } finally {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith("arduhub-")
    )
      throw Error("Unexpected compiler temporary directory");
    await rm(root, { recursive: true, force: true });
  }
}
if (process.argv.includes("--stdin")) {
  let code = "";
  for await (const chunk of process.stdin) {
    code += chunk;
    if (Buffer.byteLength(code) > 16384) {
      process.stdout.write(JSON.stringify({ error: "code_too_large" }));
      process.exit(0);
    }
  }
  process.stdout.write(JSON.stringify(await compileJob(code)));
}
