import { readFile } from "node:fs/promises";
import { extname, normalize, relative, resolve, sep } from "node:path";

// Serves the built renderer under app://arduhub/. A real origin (instead of
// file://) lets module Workers, relative fetches (/hex/…) and CSP work like
// on the site. Only files inside the renderer folder are ever served.
export const APP_ORIGIN = "app://arduhub";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".hex": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
};

export function resolveAppPath(root: string, url: string): string | null {
  let pathname: string;
  try {
    const parsed = new URL(url);
    // URL#origin is "null" for custom schemes in Node, compare the parts.
    if (parsed.protocol !== "app:" || parsed.host !== "arduhub") return null;
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;
  const rootAbs = resolve(root);
  const file = resolve(
    rootAbs,
    normalize("." + (pathname === "/" ? "/index.html" : pathname)),
  );
  const rel = relative(rootAbs, file);
  if (!rel || rel.startsWith("..") || rel.split(sep).includes(".."))
    return null;
  return file;
}

export async function serveApp(
  root: string,
  request: Request,
): Promise<Response> {
  const file = resolveAppPath(root, request.url);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(file);
    return new Response(body, {
      headers: {
        "Content-Type":
          types[extname(file).toLowerCase()] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Client-side routes fall back to the app page.
    if (!extname(file))
      return serveApp(root, new Request(`${APP_ORIGIN}/index.html`));
    return new Response("Not found", { status: 404 });
  }
}
