// Only these site pages may be opened in the system browser from the app.
// Everything else is refused, so a compromised renderer cannot launch
// arbitrary URLs or protocols.
export const SITE_ORIGIN = "https://arduhub.vercel.app";

const allowedPaths = new Set([
  "/",
  "/register",
  "/sign-in",
  "/privacy",
  "/app/profile",
  "/app/profile/settings",
  "/app/pricing",
]);

export function isAllowedExternal(raw: unknown, origin = SITE_ORIGIN): boolean {
  if (typeof raw !== "string" || raw.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    url.origin === origin &&
    url.username === "" &&
    url.password === "" &&
    allowedPaths.has(url.pathname)
  );
}
