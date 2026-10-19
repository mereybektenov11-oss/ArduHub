import type { Role } from "./validators";
export type Signup = { email: string; role?: Role };
export function databaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
export async function saveSignup(
  signup: Signup,
): Promise<"created" | "duplicate"> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("database_not_configured");
  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/waitlist_signups?on_conflict=email`,
    {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({ ...signup, source: "landing", locale: "ru" }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("database_write_failed");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw new Error("invalid_database_response");
  return rows.length ? "created" : "duplicate";
}
