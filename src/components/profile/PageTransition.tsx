"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";

let profileIntroSeen = false;
const introKey = "arduhub.profile-intro-seen";

export default function PageTransition({
  children,
  wholePage = false,
}: {
  children: ReactNode;
  wholePage?: boolean;
}) {
  const path = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | undefined>(undefined);
  const previousPath = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    if (!wholePage || previousPath.current === path) return;
    previousPath.current = path;
    animation.current?.cancel();
    if (path !== "/app/profile") return;
    let seen = profileIntroSeen;
    try {
      seen ||= sessionStorage.getItem(introKey) === "1";
    } catch {}
    if (seen) return;
    profileIntroSeen = true;
    try {
      sessionStorage.setItem(introKey, "1");
    } catch {}
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animation.current = root.current?.animate(
      [
        { opacity: 0.75, filter: "blur(12px)" },
        { opacity: 1, filter: "blur(8px)", offset: 0.2 },
        { opacity: 1, filter: "none" },
      ],
      {
        duration: 1500,
        easing: "cubic-bezier(.22,1,.36,1)",
        fill: "none",
        id: "profile-intro",
      },
    );
  }, [path, wholePage]);
  useLayoutEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const cancel = () => {
      if (preference.matches) animation.current?.cancel();
    };
    preference.addEventListener("change", cancel);
    return () => preference.removeEventListener("change", cancel);
  }, []);
  return (
    <div
      className={wholePage ? "app-page-intro" : "app-route-enter"}
      ref={root}
      key={wholePage ? "shell" : path}
    >
      {children}
    </div>
  );
}
