import { promises as fs } from "node:fs";
import { dirname } from "node:path";

// Encrypted key-value store for the Supabase session. Values are encrypted
// with Electron safeStorage (Windows DPAPI): other Windows users cannot read
// them, other programs of the same user can. Nothing is written in plain text;
// when encryption is unavailable the session lives only in memory.
export type Cipher = {
  available(): Promise<boolean>;
  encrypt(plain: string): Promise<Buffer>;
  decrypt(data: Buffer): Promise<string>;
};

const KEY = /^[A-Za-z0-9._-]{1,128}$/;
const MAX_VALUE = 64 * 1024;

export function createSecureStore(file: string, cipher: Cipher) {
  const memory = new Map<string, string>();
  let loaded = false;
  let persistent = false;

  async function load() {
    if (loaded) return;
    loaded = true;
    persistent = await cipher.available().catch(() => false);
    if (!persistent) return;
    try {
      const raw = JSON.parse(await fs.readFile(file, "utf8")) as Record<
        string,
        string
      >;
      for (const [k, v] of Object.entries(raw)) {
        if (KEY.test(k) && typeof v === "string")
          memory.set(k, await cipher.decrypt(Buffer.from(v, "base64")));
      }
    } catch {
      // Missing or unreadable file: start signed out.
      memory.clear();
    }
  }

  async function save() {
    if (!persistent) return;
    const out: Record<string, string> = {};
    for (const [k, v] of memory)
      out[k] = (await cipher.encrypt(v)).toString("base64");
    await fs.mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(out), { mode: 0o600 });
    await fs.rename(tmp, file);
  }

  return {
    async get(key: unknown): Promise<string | null> {
      if (typeof key !== "string" || !KEY.test(key)) return null;
      await load();
      return memory.get(key) ?? null;
    },
    async set(key: unknown, value: unknown): Promise<void> {
      if (typeof key !== "string" || !KEY.test(key)) return;
      if (typeof value !== "string" || value.length > MAX_VALUE) return;
      await load();
      memory.set(key, value);
      await save();
    },
    async remove(key: unknown): Promise<void> {
      if (typeof key !== "string" || !KEY.test(key)) return;
      await load();
      memory.delete(key);
      await save();
    },
    async isPersistent() {
      await load();
      return persistent;
    },
  };
}
