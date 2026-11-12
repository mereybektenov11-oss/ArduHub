import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isAllowedExternal } from "../src/main/external";
import { createSecureStore, type Cipher } from "../src/main/secureStore";

describe("isAllowedExternal", () => {
  it("allows only listed pages of the ArduHub site", () => {
    expect(isAllowedExternal("https://arduhub.vercel.app/register")).toBe(true);
    expect(
      isAllowedExternal("https://arduhub.vercel.app/app/profile?x=1"),
    ).toBe(true);
    expect(isAllowedExternal("https://arduhub.vercel.app/app/lessons")).toBe(
      false,
    );
    expect(isAllowedExternal("http://arduhub.vercel.app/register")).toBe(false);
    expect(
      isAllowedExternal("https://arduhub.vercel.app.evil.com/register"),
    ).toBe(false);
    expect(
      isAllowedExternal("https://user:pw@arduhub.vercel.app/register"),
    ).toBe(false);
    expect(isAllowedExternal("file:///C:/Windows/system32/calc.exe")).toBe(
      false,
    );
    expect(isAllowedExternal("javascript:alert(1)")).toBe(false);
    expect(isAllowedExternal(42)).toBe(false);
  });
});

// Reversible fake cipher; marks output so the test can prove nothing is
// written in plain text.
const fake = (available = true): Cipher => ({
  available: async () => available,
  encrypt: async (s) => Buffer.from(`ENC:${Buffer.from(s).toString("hex")}`),
  decrypt: async (b) => Buffer.from(b.toString().slice(4), "hex").toString(),
});

describe("secure store", () => {
  let dir = "";
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it("persists encrypted values and reads them back", async () => {
    dir = mkdtempSync(join(tmpdir(), "arduhub-store-"));
    const file = join(dir, "session.json");
    const a = createSecureStore(file, fake());
    await a.set("sb-token", '{"access_token":"secret-value"}');
    const disk = readFileSync(file, "utf8");
    expect(disk).not.toContain("secret-value");
    const b = createSecureStore(file, fake());
    expect(await b.get("sb-token")).toBe('{"access_token":"secret-value"}');
    await b.remove("sb-token");
    expect(await createSecureStore(file, fake()).get("sb-token")).toBeNull();
  });

  it("keeps the session in memory only when encryption is unavailable", async () => {
    dir = mkdtempSync(join(tmpdir(), "arduhub-store-"));
    const file = join(dir, "session.json");
    const s = createSecureStore(file, fake(false));
    await s.set("k", "v");
    expect(await s.get("k")).toBe("v");
    expect(await s.isPersistent()).toBe(false);
    expect(() => readFileSync(file)).toThrow();
  });

  it("rejects invalid keys and oversized values", async () => {
    dir = mkdtempSync(join(tmpdir(), "arduhub-store-"));
    const s = createSecureStore(join(dir, "s.json"), fake());
    await s.set("../evil", "v");
    await s.set("big", "x".repeat(70_000));
    expect(await s.get("../evil")).toBeNull();
    expect(await s.get("big")).toBeNull();
  });
});

describe("app:// protocol paths", async () => {
  const { resolveAppPath } = await import("../src/main/appProtocol");
  const root = join(tmpdir(), "renderer");
  it("serves files inside the renderer folder only", () => {
    expect(resolveAppPath(root, "app://arduhub/")).toBe(
      join(root, "index.html"),
    );
    expect(resolveAppPath(root, "app://arduhub/hex/index.json")).toBe(
      join(root, "hex", "index.json"),
    );
    expect(resolveAppPath(root, "app://arduhub/../secret.txt")).toBe(
      join(root, "secret.txt"),
    );
    // The URL parser itself collapses %2e%2e segments: still inside root.
    expect(resolveAppPath(root, "app://arduhub/%2e%2e/%2e%2e/x")).toBe(
      join(root, "x"),
    );
    // Encoded slashes survive parsing; decoding must not escape the root.
    expect(resolveAppPath(root, "app://arduhub/%2F..%2F..%2Fx")).toBeNull();
    expect(resolveAppPath(root, "app://arduhub/..%5C..%5Cx")).toBeNull();
    expect(resolveAppPath(root, "app://evil/index.html")).toBeNull();
    expect(resolveAppPath(root, "https://arduhub/index.html")).toBeNull();
    expect(resolveAppPath(root, "app://arduhub/a%00b")).toBeNull();
  });
});
