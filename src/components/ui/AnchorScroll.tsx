"use client";
import { useEffect } from "react";
import { cancelSectionScroll, scrollToSection } from "@/lib/scrollToSection";
export default function AnchorScroll() {
  useEffect(() => {
    function navigate(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const target = document.getElementById(
        decodeURIComponent(link.hash.slice(1)),
      );
      if (!target) return;
      event.preventDefault();
      history.pushState(null, "", link.hash);
      if (link.classList.contains("skip-link")) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      scrollToSection(target);
    }
    document.addEventListener("click", navigate);
    return () => {
      document.removeEventListener("click", navigate);
      cancelSectionScroll();
    };
  }, []);
  return null;
}
