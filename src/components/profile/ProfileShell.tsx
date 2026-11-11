"use client";

import Link from "next/link";
import { TextureButton } from "@/components/ui/texture-button";
import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/client";
import AuthBrand from "@/components/auth/AuthBrand";
import ProfileIcon from "./ProfileIcon";
import { dashboardRu } from "@/content/dashboard.ru";
import { profileRu as c, accountDocsRu as docs, ru } from "@/content/ru";
import PageTransition from "./PageTransition";
import { useProgress } from "@/lib/useProgress";

export default function ProfileShell({ children }: { children: ReactNode }) {
  const { progress: p, notify } = useProgress();
  const path = usePathname();
  const inDocs = path === "/app/docs" || path.startsWith("/app/docs/");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const client = browserSupabase();
      if (client) {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      }
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw Error();
      localStorage.removeItem("arduhub.active-user");
      router.replace("/sign-in");
      router.refresh();
    } catch {
      notify(dashboardRu.offline);
      setBusy(false);
    }
  }
  return (
    <PageTransition wholePage>
      <div className="profile-shell">
        <a className="skip-link" href="#profile-main">
          {c.skip}
        </a>
        <header className="profile-header">
          <nav className="profile-topnav" aria-label={c.navigation}>
            <Link href="/" className="profile-brand" aria-label={ru.brand}>
              <AuthBrand />
              <span>{ru.brand}</span>
            </Link>
            <div className="profile-toplinks">
              <Link href="/app/lessons">{c.learning}</Link>
              <Link
                href="/app/pricing"
                aria-current={path === "/app/pricing" ? "page" : undefined}
              >
                {c.pricing}
              </Link>
              <Link href="/app/docs" aria-current={inDocs ? "page" : undefined}>
                {c.documentation}
              </Link>
            </div>
            <TextureButton asChild variant="secondary">
              <Link
                href="/app/profile"
                aria-current={
                  path.startsWith("/app/profile") ? "page" : undefined
                }
              >
                <ProfileIcon name="user" />
                {c.account}
              </Link>
            </TextureButton>
            <TextureButton
              variant="danger-soft"
              type="button"
              onClick={logout}
              disabled={busy}
            >
              {dashboardRu.logout}
            </TextureButton>
          </nav>
        </header>
        <div className="profile-layout">
          <aside className="profile-sidebar">
            <p className="profile-eyebrow">
              {inDocs ? docs.eyebrow : c.workspace}
            </p>
            <nav aria-label={inDocs ? docs.navigation : c.sections}>
              {(inDocs ? docs.menu : c.menu).map(([label, href, icon]) => (
                <Link
                  href={href}
                  key={href}
                  aria-current={path === href ? "page" : undefined}
                >
                  <ProfileIcon name={icon} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <div className="profile-sidebar-foot">
              <span className="profile-mini-avatar">
                {p.profile.name.slice(0, 1)}
              </span>
              <span>
                {p.profile.name}
                <small>{c.personal}</small>
              </span>
            </div>
          </aside>
          <main id="profile-main" className="profile-main">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <footer className="profile-footer">
          <span>∞ {ru.brand}</span>
          <Link href="/privacy">{c.privacy}</Link>
        </footer>
      </div>
    </PageTransition>
  );
}
