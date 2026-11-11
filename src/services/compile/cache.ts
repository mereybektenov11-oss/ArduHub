import { normalizeCode } from "@arduhub/arduino-core/compile/normalize";
type Index = { version: number; entries: Record<string, { path: string }> };
let indexPromise: Promise<Index> | undefined;
export async function cachedHex(code: string): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(normalizeCode(code)),
    );
    const hash = Array.from(new Uint8Array(digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    indexPromise ??= fetch("/hex/index.json", { cache: "force-cache" }).then(
      (r) => {
        if (!r.ok) throw Error();
        return r.json();
      },
    );
    const index = await indexPromise;
    const entry = index.version === 1 ? index.entries[hash] : undefined;
    if (!entry || entry.path !== `/hex/${hash}.hex`) return null;
    const response = await fetch(entry.path, { cache: "force-cache" });
    if (!response.ok) return null;
    const hex = await response.text();
    return hex.length < 200000 && /^[:0-9a-f\r\n]+$/i.test(hex) ? hex : null;
  } catch {
    indexPromise = undefined;
    return null;
  }
}
