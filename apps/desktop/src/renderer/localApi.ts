// The site's lesson components call relative /api/* routes of the Next server.
// The app has no such server:
// - lessons and videos are served from the bundled curriculum;
// - the AI mentor (/api/mentor) is forwarded to the ArduHub site with the
//   learner's access token (the site accepts it from app://arduhub);
// - other routes that need the site server (compiler, awards, achievements)
//   answer "unavailable" until D4 connects them.
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import videos from "@arduhub/curriculum/lesson-videos.json";
import { supabase } from "./auth";
import { siteApi } from "./content";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function localApi(url: URL, init?: RequestInit): Response | null {
  const lesson = /^\/api\/lessons\/([\w-]+)$/.exec(url.pathname);
  if (lesson) {
    const found = learningLessons.find((l) => l.id === lesson[1]);
    return found ? json(found) : json({ error: "not_found" }, 404);
  }
  if (url.pathname === "/api/lesson-video") {
    const id = url.searchParams.get("lessonId") ?? "";
    const video = (videos as Record<string, unknown>)[id];
    return video ? json(video) : json({ error: "not_found" }, 404);
  }
  if (url.pathname.startsWith("/api/")) {
    void init;
    return json({ error: "unavailable_in_app" }, 503);
  }
  return null;
}

/** /api/mentor → the site, signed with the current session token. */
export async function mentorProxy(
  init: RequestInit | undefined,
  fetcher: typeof fetch,
): Promise<Response> {
  const session = (await supabase()?.auth.getSession())?.data.session;
  if (!session) return json({ error: "unauthorized" }, 401);
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetcher(`${siteApi}/api/mentor`, {
    method: "POST",
    headers,
    body: init?.body,
    signal: init?.signal,
  });
}

export function installLocalApi() {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, location.href);
    if (url.origin === location.origin) {
      if (url.pathname === "/api/mentor") return mentorProxy(init, original);
      const local = localApi(url, init);
      if (local) return Promise.resolve(local);
    }
    return original(input, init);
  };
}
