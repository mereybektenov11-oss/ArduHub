import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { validateCode } from "./policy.mjs";
const local = process.env.LOCAL_COMPILER === "true";
const nativeCompiler = local ? await import("./local-compile.mjs") : null;
const cache = new Map();
let busy = false;
const key = process.env.COMPILER_API_KEY;
if (!key)
  throw Error("Set COMPILER_API_KEY before starting the compiler gateway");
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
  const error = validateCode(data.code);
  if (error)
    return send(error === "code_too_large" ? 413 : 400, {
      error,
      diagnostics: [],
    });
  const hash = createHash("sha256").update(data.code).digest("hex");
  if (cache.has(hash)) return send(200, cache.get(hash));
  if (busy) return send(503, { error: "compiler_unavailable" });
  busy = true;
  const name = `arduhub-job-${crypto.randomUUID()}`;
  try {
    const result = local
      ? await nativeCompiler.compileLocal(data.code)
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
            finish({ error: "compiler_unavailable" });
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
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(hash, result);
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
    busy = false;
  }
}).listen(Number(process.env.PORT ?? 8081), "127.0.0.1", () =>
  console.log(
    local
      ? "ArduHub local development compiler ready (loopback only)"
      : "ArduHub isolated compiler gateway ready",
  ),
);
