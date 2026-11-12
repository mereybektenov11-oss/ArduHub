import { useSyncExternalStore } from "react";

// In-app router used by the next/navigation and next/link shims. The site's
// lesson components keep using their URLs (/app/lesson/lesson-1?stage=…);
// the app maps them to its own screens.
type Listener = () => void;
let current = new URL("app://local/menu");
const listeners = new Set<Listener>();
const history: string[] = [];

function emit() {
  for (const l of listeners) l();
}

export function navigate(href: string, replace = false) {
  const next = new URL(href, current);
  if (next.href === current.href) return;
  if (!replace) history.push(current.href);
  current = next;
  emit();
}

export function back() {
  const prev = history.pop();
  if (!prev) return navigate("/menu", true);
  current = new URL(prev);
  emit();
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const snapshot = () => current;

export function useLocation(): URL {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

// Screen of the app for the current URL.
export type Route =
  | { screen: "menu" }
  | { screen: "settings" }
  | { screen: "lessons" }
  | { screen: "lesson"; id: string };

export function route(url: URL): Route {
  const lesson = /^\/app\/lesson\/([\w-]+)$/.exec(url.pathname);
  if (lesson) return { screen: "lesson", id: lesson[1] };
  if (url.pathname === "/settings") return { screen: "settings" };
  if (url.pathname === "/menu") return { screen: "menu" };
  // Every other cabinet page of the site (/app, /app/lessons, /app/map, …)
  // lands on the lesson map of the app.
  if (url.pathname.startsWith("/app") || url.pathname === "/lessons")
    return { screen: "lessons" };
  return { screen: "menu" };
}
