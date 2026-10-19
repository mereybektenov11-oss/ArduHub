"use client";
import type { ComponentProps } from "react";
import { scrollToSection } from "@/lib/scrollToSection";
export default function AccessLink({
  role = "other",
  children,
  className = "button button-primary",
  ...props
}: Omit<ComponentProps<"a">, "role"> & { role?: "other" | "school" }) {
  return (
    <a
      {...props}
      className={className}
      href="#access"
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("arduhub:role", { detail: role }));
        const section = document.getElementById("access");
        if (section) scrollToSection(section);
        document
          .getElementById("waitlist-email")
          ?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
