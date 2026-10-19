import { z } from "zod";
const optional = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined);
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  GROQ_API_KEY: optional,
  YOUTUBE_API_KEY: optional,
  COMPILER_API_URL: optional,
  COMPILER_URL: optional,
  AUTH_REQUIRED: optional,
});
export function readEnv(
  source: Record<string, string | undefined> = process.env,
) {
  const env = schema.parse(source);
  if (
    env.NEXT_PUBLIC_SUPABASE_URL &&
    !z.url().safeParse(env.NEXT_PUBLIC_SUPABASE_URL).success
  )
    throw Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
  if (
    env.AUTH_REQUIRED === "true" &&
    (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
    throw Error(
      "Supabase: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or disable AUTH_REQUIRED for guest mode",
    );
  return env;
}
export const env = readEnv();
export const serviceHealth = () => ({
  groq: !!env.GROQ_API_KEY,
  youtube: !!env.YOUTUBE_API_KEY,
  supabase: !!(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  compiler: !!(env.COMPILER_URL || env.COMPILER_API_URL),
});
export const showDevStatus = () =>
  process.env.NODE_ENV !== "production" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.LOCAL_DEV_STATUS === "true";
