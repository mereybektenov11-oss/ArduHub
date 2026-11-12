// Replacement for next/navigation inside the desktop app.
import { useMemo } from "react";
import { back, navigate, useLocation } from "../router";

type NavigateOptions = { scroll?: boolean };
const router = {
  push: (href: string, _options?: NavigateOptions) => navigate(href),
  replace: (href: string, _options?: NavigateOptions) => navigate(href, true),
  back,
  forward: () => {},
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const url = useLocation();
  return useMemo(() => new URLSearchParams(url.search), [url]);
}

export function redirect(href: string): never {
  navigate(href, true);
  throw new Error("redirect");
}

export function notFound(): never {
  throw new Error("not_found");
}
