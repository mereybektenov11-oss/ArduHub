export async function compilerHealth(
  url?: string,
  fetcher: typeof fetch = fetch,
) {
  if (!url) return { configured: false, reachable: false, ms: 0 };
  const start = performance.now();
  try {
    const target = new URL(url);
    target.pathname = target.pathname.replace(/\/compile\/?$/, "/health");
    if (!target.pathname.endsWith("/health"))
      target.pathname = target.pathname.replace(/\/$/, "") + "/health";
    target.search = "";
    const r = await fetcher(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return {
      configured: true,
      reachable: r.ok,
      ms: Math.round(performance.now() - start),
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      ms: Math.round(performance.now() - start),
    };
  }
}
