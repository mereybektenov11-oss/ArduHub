import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw Error("Configure Supabase before running this check");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = createClient(url, key, options);
const email = `arduhub-qa-${randomUUID()}@example.org`;
const password = randomBytes(24).toString("base64url") + "aA1!";
const { data, error } = await client.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name: "Проверка ArduHub",
      timezone: "Asia/Qyzylorda",
      role: "student",
    },
  },
});
if (error) throw Error(`Signup failed: ${error.code}`);
if (!data.session || !data.user)
  throw Error(
    "Signup requires email confirmation; use a confirmed test account instead",
  );
const userId = data.user.id;
const { data: profile, error: profileError } = await client
  .from("profiles")
  .select("id,display_name,sparks,mentor_tokens")
  .eq("id", userId)
  .single();
if (profileError || !profile)
  throw Error(`Profile failed: ${profileError?.code}`);
const anon = createClient(url, key, options);
const { data: hidden, error: hiddenError } = await anon
  .from("profiles")
  .select("id");
if (
  hidden?.length ||
  (hiddenError && !["42501", "PGRST301"].includes(hiddenError.code))
)
  throw Error("Anonymous profile access check failed");
const { error: signOutError } = await client.auth.signOut();
if (signOutError) throw Error(`Logout failed: ${signOutError.code}`);
const { data: login, error: loginError } = await client.auth.signInWithPassword(
  { email, password },
);
if (loginError || login.user?.id !== userId)
  throw Error(`Login failed: ${loginError?.code}`);
await writeFile(
  ".env.e2e.local",
  `E2E_AUTH_EMAIL=${email}\nE2E_AUTH_PASSWORD=${password}\n`,
);
await mkdir("reports/usability", { recursive: true });
const report = {
  project: new URL(url).hostname,
  userId,
  signup: true,
  login: true,
  profile: true,
  anonymousProfilesHidden: true,
  initialSparks: profile.sparks,
  initialMentorTokens: profile.mentor_tokens,
};
await writeFile(
  "reports/usability/supabase-auth.json",
  JSON.stringify(report, null, 2),
);
await client.auth.signOut();
console.log(JSON.stringify(report));
