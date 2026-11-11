import type { NextConfig } from "next";

// On Windows, Next prepends './' to cross-drive entry paths when dependencies
// live on another disk. Keep those paths absolute for Webpack.
function normalizeEntryPath(value: string) {
  return /^\.\/[A-Za-z]:[\\/]/.test(value) ? value.slice(2) : value;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@arduhub/arduino-core", "@arduhub/curriculum"],
  // Learning moved to the desktop app: the old cabinet pages lead to the
  // personal profile, where the app is downloaded.
  async redirects() {
    const learning =
      "about|glossary|homework|ideas|leaderboard|lesson|lessons|map|mentor|missions|practice|projects|shop|test";
    return [
      { source: "/app", destination: "/app/profile", permanent: true },
      {
        source: `/app/:section(${learning})`,
        destination: "/app/profile",
        permanent: true,
      },
      {
        source: `/app/:section(${learning})/:rest*`,
        destination: "/app/profile",
        permanent: true,
      },
    ];
  },
  async headers() {
    const dev = process.env.NODE_ENV !== "production";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const authOrigin =
      supabaseUrl && URL.canParse(supabaseUrl)
        ? new URL(supabaseUrl).origin
        : "";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com${dev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${authOrigin}${dev ? " ws: wss:" : ""}; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; media-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
          },
        ],
      },
    ];
  },
  webpack(config) {
    const originalEntry = config.entry;
    config.entry = async () => {
      const entries =
        typeof originalEntry === "function"
          ? await originalEntry()
          : originalEntry;
      for (const [name, entry] of Object.entries(entries)) {
        if (typeof entry === "string") {
          entries[name] = normalizeEntryPath(entry);
        } else if (Array.isArray(entry)) {
          entries[name] = entry.map((value) =>
            typeof value === "string" ? normalizeEntryPath(value) : value,
          );
        }
      }
      return entries;
    };
    return config;
  },
};

export default nextConfig;
