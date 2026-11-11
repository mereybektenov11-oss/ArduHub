import { compilerStatusRu as c } from "@arduhub/curriculum/compiler";

export async function probeCompiler(
  config: { url?: string; key?: string },
  fetcher: typeof fetch = fetch,
) {
  const start = performance.now();
  const result = (ok: boolean, message: string) => ({
    ok,
    message,
    ms: Math.round(performance.now() - start),
  });
  if (!config.url || !config.key) return result(false, c.missing);
  try {
    const url = new URL(config.url);
    url.pathname = url.pathname.replace(/\/$/, "");
    if (!url.pathname.endsWith("/compile"))
      url.pathname = url.pathname.replace(/\/$/, "") + "/compile";
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        board: "uno",
        code: "void setup(){pinMode(LED_BUILTIN,OUTPUT);}\nvoid loop(){digitalWrite(LED_BUILTIN,HIGH);delay(500);digitalWrite(LED_BUILTIN,LOW);delay(500);}",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 401 || response.status === 403)
      return result(false, c.unauthorized);
    if (response.status === 429) return result(false, c.busy);
    const body = await response.json();
    if (
      body.error === "compiler_timeout" ||
      [408, 504].includes(response.status)
    )
      return result(false, c.timeout);
    if (
      response.ok &&
      typeof body.hex === "string" &&
      /^:[0-9a-f]+/i.test(body.hex)
    )
      return result(true, c.ready);
    return result(
      false,
      response.status === 400 ? c.compileError : c.unavailable,
    );
  } catch (error) {
    return result(
      false,
      error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
        ? c.timeout
        : c.unavailable,
    );
  }
}
