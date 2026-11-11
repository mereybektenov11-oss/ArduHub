// The site's lesson components call relative /api/* routes of the Next server.
// The app has no such server: lessons and videos are served from the bundled
// curriculum here, and routes that need the site server (compiler, mentor,
// awards, achievements) answer "unavailable" until D4 connects them.
import { learningLessons } from "@arduhub/arduino-core/lessons/content";
import videos from "@arduhub/curriculum/lesson-videos.json";

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
      const local = localApi(url, init);
      if (local) return Promise.resolve(local);
    }
    return original(input, init);
  };
}
