import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { t } from "./content";

export const authConfigured = Boolean(
  __SUPABASE_URL__ && __SUPABASE_ANON_KEY__,
);

let client: SupabaseClient | null = null;

// The session is kept by the main process (encrypted with safeStorage),
// not in localStorage of the renderer.
export function supabase(): SupabaseClient | null {
  if (!authConfigured) return null;
  client ??= createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
    auth: {
      storage: {
        getItem: (key) => window.arduhub.store.get(key),
        setItem: (key, value) => window.arduhub.store.set(key, value),
        removeItem: (key) => window.arduhub.store.remove(key),
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function loginError(
  error: { code?: string; status?: number; name?: string } | null,
) {
  if (!error) return null;
  if (error.code === "invalid_credentials") return t.login.invalid;
  if (error.code === "email_not_confirmed") return t.login.unconfirmed;
  if (
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit" ||
    error.status === 429
  )
    return t.login.rate;
  if (error.name === "AuthRetryableFetchError" || error.status === 0)
    return t.login.network;
  return t.login.invalid;
}

type LessonState = { status?: string };

// Counts finished lessons in the progress document the site already stores.
export function countDone(data: unknown, total: number): number {
  const lessons = (data as { lessons?: Record<string, LessonState> } | null)
    ?.lessons;
  if (!lessons || typeof lessons !== "object") return 0;
  let done = 0;
  for (let i = 1; i <= total; i++)
    if (lessons[`lesson-${i}`]?.status === "done") done++;
  return done;
}
