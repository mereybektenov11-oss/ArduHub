export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { readEnv } = await import("./lib/env");
    const env = readEnv();
    if (!env.GROQ_API_KEY)
      console.warn(
        "ArduHub: Groq is not configured; free templates are available.",
      );
    if (!env.YOUTUBE_API_KEY)
      console.warn(
        "ArduHub: YouTube is not configured; cached videos or the lesson fallback are available.",
      );
    if (!env.NEXT_PUBLIC_SUPABASE_URL)
      console.warn(
        "ArduHub: Supabase is not configured; guest mode is available.",
      );
  }
}
