import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { normalizeCode } from "./normalize-code.mjs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compileJob } from "./compile-job.mjs";
import { validateLocalCode } from "./local-compile.mjs";
import { validateCode } from "./policy.mjs";
const local = process.env.LOCAL_COMPILER === "true";
const container = process.env.COMPILER_CONTAINER === "true";
if (local && container)
  throw Error("Native local mode cannot be enabled in the public container");
const nativeCompiler = local ? await import("./local-compile.mjs") : null;
const cache = new Map();
function remember(hash, result) {
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  cache.set(hash, result);
}
let active = 0;
const maximum = local ? 1 : 2;
const cacheDir =
  process.env.COMPILER_CACHE_DIR || join(tmpdir(), "arduhub-hex-cache");
const key = process.env.COMPILER_SECRET || process.env.COMPILER_API_KEY;
if (!key)
  throw Error("Set COMPILER_SECRET before starting the compiler service");
function authorized(value) {
  const a = Buffer.from(value ?? ""),
    b = Buffer.from(`Bearer ${key}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  if (req.method === "GET" && req.url === "/health")
    return send(200, {
      ok: true,
      active,
      maximum,
      mode: local ? "trusted-local" : container ? "container" : "docker-jobs",
    });
  if (req.method !== "POST" || req.url !== "/compile")
    return send(404, { error: "not_found" });
  if (!authorized(req.headers.authorization))
    return send(401, { error: "unauthorized" });
  let raw = "";
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 20000)
        return send(413, { error: "code_too_large" });
    }
  } catch {
    return send(400, { error: "bad_request" });
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return send(400, { error: "bad_request" });
  }
  if (!data || data.board !== "uno") return send(400, { error: "bad_request" });
  const error = validateCode(data.code) || validateLocalCode(data.code);
  if (error)
    return send(error === "code_too_large" ? 413 : 400, {
      error,
      diagnostics: [],
    });
  const hash = createHash("sha256")
    .update(normalizeCode(data.code))
    .digest("hex");
  if (cache.has(hash)) return send(200, cache.get(hash));
  try {
    const stored = JSON.parse(
      await readFile(join(cacheDir, hash + ".json"), "utf8"),
    );
    if (
      typeof stored.hex === "string" &&
      stored.hex.length < 200000 &&
      /^[:0-9a-f\r\n]+$/i.test(stored.hex)
    ) {
      remember(hash, stored);
      return send(200, stored);
    }
  } catch {}
  if (active >= maximum) return send(429, { error: "compiler_busy" });
  active++;
  const name = `arduhub-job-${crypto.randomUUID()}`;
  try {
    const result = local
      ? await nativeCompiler.compileLocal(data.code)
      : container
        ? await compileJob(
            data.code,
            "arduino-cli",
            [
              "--jobs",
              "1",
              "--build-property",
              "compiler.cpp.extra_flags=-ftemplate-depth=64 -fconstexpr-depth=64",
            ],
            Object.fromEntries(
              Object.entries(process.env).filter(([n]) =>
                /^(PATH|HOME|TMPDIR|ARDUINO_DIRECTORIES_DATA|ARDUINO_DIRECTORIES_DOWNLOADS|ARDUINO_DIRECTORIES_USER)$/.test(
                  n,
                ),
              ),
            ),
          )
        : await new Promise((resolve) => {
            // Every request gets its own networkless, read-only, resource-limited container.
            const child = spawn(
              "docker",
              [
                "run",
                "--rm",
                "-i",
                "--name",
                name,
                "--network",
                "none",
                "--read-only",
                "--cap-drop",
                "ALL",
                "--security-opt",
                "no-new-privileges",
                "--cpus",
                "1",
                "--memory",
                "256m",
                "--pids-limit",
                "64",
                "--tmpfs",
                "/tmp:rw,nosuid,nodev,size=96m",
                "arduhub-compiler:1",
              ],
              { shell: false, windowsHide: true },
            );
            let out = "",
              done = false;
            const finish = (v) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              resolve(v);
            };
            const timer = setTimeout(() => {
              child.kill();
              const cleanup = spawn("docker", ["rm", "-f", name], {
                windowsHide: true,
              });
              cleanup.on("error", () => {});
              finish({ error: "compiler_timeout" });
            }, 22000);
            child.stdout.on("data", (d) => {
              out = (out + d).slice(-200000);
            });
            child.stderr.resume();
            child.on("error", () => finish({ error: "compiler_unavailable" }));
            child.on("close", () => {
              try {
                finish(JSON.parse(out));
              } catch {
                finish({ error: "compiler_unavailable" });
              }
            });
            child.stdin.on("error", () => {});
            child.stdin.end(data.code);
          });
    if (result.hex) {
      remember(hash, result);
      try {
        await mkdir(cacheDir, { recursive: true });
        if ((await readdir(cacheDir)).length < 500)
          await writeFile(
            join(cacheDir, hash + ".json"),
            JSON.stringify(result),
            { flag: "wx" },
          );
      } catch {}
    }
    send(
      result.hex
        ? 200
        : result.error === "compile_error" ||
            result.error === "forbidden_header"
          ? 400
          : result.error === "code_too_large"
            ? 413
            : 503,
      result,
    );
  } catch {
    send(503, { error: "compiler_unavailable" });
  } finally {
    active--;
  }
}).listen(
  Number(process.env.PORT ?? 8081),
  container ? "0.0.0.0" : "127.0.0.1",
  () =>
    console.log(
      local
        ? "ArduHub local development compiler ready (loopback only)"
        : container
          ? "ArduHub container compiler service ready"
          : "ArduHub Docker-job compiler gateway ready",
    ),
);
