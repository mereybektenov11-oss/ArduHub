// Replacement for the site's src/lib/supabase/client.ts: the lesson code uses
// the app's own client, whose session is kept encrypted by the main process.
import { supabase } from "../auth";

export function browserSupabase() {
  return supabase();
}

// Password recovery happens on the site, not in the app.
export function passwordRecoveryClient() {
  return null;
}
