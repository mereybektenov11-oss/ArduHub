import { pathToFileURL } from "node:url";

export const blink = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`;
export const syntaxError = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  int broken = ;
}
void loop() {}`;

export function compileEndpoint(value) {
  const url = new URL(value);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error(
      "Use an HTTP(S) service URL without credentials or query parameters",
    );
  url.pathname = url.pathname.replace(/\/$/, "");
  if (!url.pathname.endsWith("/compile"))
    url.pathname = url.pathname.replace(/\/$/, "") + "/compile";
  return url;
}

export async function smoke(url, secret, fetcher = fetch) {
  if (!secret)
    throw Error(
      "Set COMPILER_SECRET (preferred) or pass the secret as the second argument",
    );
  const endpoint = compileEndpoint(url);
  const healthUrl = new URL(endpoint);
  healthUrl.pathname = healthUrl.pathname.replace(/\/compile$/, "/health");
  const health = await fetcher(healthUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!health.ok || !(await health.json()).ok)
    throw Error("Health check failed");
  async function compile(code, key = secret) {
    const start = performance.now();
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ board: "uno", code }),
      signal: AbortSignal.timeout(30000),
    });
    return {
      status: response.status,
      data: await response.json(),
      ms: Math.round(performance.now() - start),
    };
  }
  const good = await compile(blink);
  if (
    good.status !== 200 ||
    typeof good.data.hex !== "string" ||
    !/^:[0-9A-F]+/i.test(good.data.hex)
  )
    throw Error(`Blink failed (HTTP ${good.status})`);
  const bad = await compile(syntaxError);
  if (
    bad.status !== 400 ||
    bad.data.error !== "compile_error" ||
    !bad.data.diagnostics?.some((d) => d.line === 3)
  )
    throw Error(
      `Syntax diagnosis failed (HTTP ${bad.status}; expected line 3)`,
    );
  const unauthorized = await compile(blink, secret + "-incorrect");
  if (unauthorized.status !== 401)
    throw Error(`Authorization check failed (HTTP ${unauthorized.status})`);
  const cached = await compile(blink);
  if (cached.status !== 200 || cached.data.hex !== good.data.hex)
    throw Error("Cache check failed");
  return {
    blinkMs: good.ms,
    cachedMs: cached.ms,
    checks: ["health", "Blink HEX", "syntax line 3", "401", "cached HEX"],
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await smoke(
      process.argv[2],
      process.env.COMPILER_SECRET || process.argv[3],
    );
    console.log(
      `PASS: ${result.checks.join(", ")}; Blink ${result.blinkMs} ms; cache ${result.cachedMs} ms`,
    );
  } catch (error) {
    // Never print request headers, URLs, upstream output or secrets.
    console.error(
      error instanceof Error &&
        !["TypeError", "TimeoutError", "AbortError"].includes(error.name)
        ? error.message
        : "Compiler request failed or timed out",
    );
    process.exitCode = 1;
  }
}
