import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetch } from "./fetch";
// Recovery links must also work when opened on another browser or device.
export function passwordRecoveryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key
    ? createClient(url, key, {
        global: { fetch: supabaseFetch },
        auth: {
          flowType: "implicit",
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: "arduhub-recovery-request",
        },
      })
    : null;
}
export function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key
    ? createBrowserClient(url, key, { global: { fetch: supabaseFetch } })
    : null;
}
