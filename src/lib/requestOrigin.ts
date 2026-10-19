// Next's reconstructed request.url may use localhost behind the local proxy.
// Browsers cannot forge Host, so match Origin against the actual request host.
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (host && /^[a-zA-Z0-9.:[\]-]+$/.test(host)) url.host = host;
  return url.origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === requestOrigin(request);
}
