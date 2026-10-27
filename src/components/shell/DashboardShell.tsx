"use client";
import Link from "next/link";
import SpotlightTour from "@/components/tour/SpotlightTour";
import LevelUp from "@/components/cabinet/LevelUp";
import { interfaceCopy } from "@/content/cabinet.ru";
import MentorAssistant from "@/components/mentor/MentorAssistant";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { dashboardRu as c } from "@/content/dashboard.ru";
import { useProgress } from "@/lib/useProgress";
import CabinetIcon from "@/components/icons/NavigationIcon";
import { Modal } from "@/components/cabinet/ui";
import TransientNotice from "@/components/overlay/TransientNotice";
import RightRail, { StatBar } from "./RightRail";
import { kidsHomeRu as k } from "@/content/kids-home.ru";
import CommandPalette from "./CommandPalette";
import NameDialog from "@/components/onboarding/NameDialog";
import SavePrompt from "@/components/onboarding/SavePrompt";
import RewardToast from "@/components/icons/RewardToast";
import SoundToggle from "./SoundToggle";
import Chest from "@/components/feedback/Chest";
import { AchievementNotification } from "@/components/profile/Stickers";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const {
    progress: p,
    toast,
    unavailable,
    offline,
    sessionExpired,
    corrupt,
    reset,
  } = useProgress();
  const [more, setMore] = useState(false),
    [search, setSearch] = useState(false),
    [introduced, setIntroduced] = useState(false);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const focus = path.startsWith("/app/lesson/");
  const menu = (sheet = false) => (
    <nav
      aria-label={sheet ? c.more : "ArduHub"}
      data-tour={sheet ? undefined : "menu"}
    >
      {c.groups.map((group) => (
        <section className="dash-nav-group" key={group.title}>
          <h2 className="group-label">{group.title}</h2>
          {group.items.map(([label, href, icon]) => (
            <Link
              key={href}
              title={label}
              href={href}
              prefetch={false}
              onClick={() => setMore(false)}
              aria-current={
                (href === "/app" ? path === href : path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              <CabinetIcon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </section>
      ))}
    </nav>
  );
  return (
    <div
      className={`cabinet dash-shell ${focus ? "dash-focus" : ""}`}
      style={{ "--lesson-scale": p.settings?.textScale ?? 1 } as CSSProperties}
    >
      <a className="skip-link" href="#cab-main">
        {k.skip}
      </a>
      {!focus && (
        <aside className="dash-sidebar">
          <Link className="dash-brand" href="/">
            ∞ ArduHub<span>.</span>
          </Link>
          <div className="dash-nav-scroll">{menu()}</div>
          <div className="dash-sidebar-foot">
            <button aria-label={c.search} onClick={() => setSearch(true)}>
              <CabinetIcon name="book" />
              <span>{c.search}</span>
              <kbd>Ctrl K</kbd>
            </button>
            <Link href="/app/profile" data-tour="profile">
              <span
                className={`cab-avatar frame-${p.account?.avatarFrame || "none"}`}
              >
                {p.profile.avatar || p.profile.name.slice(0, 1)}
              </span>
              <span>
                {p.profile.name}
                <small>{c.profile}</small>
              </span>
            </Link>
          </div>
        </aside>
      )}
      <div className="dash-page">
        <SoundToggle />
        {!focus && (
          <button
            className="kids-mobile-search cab-icon-btn"
            aria-label={c.search}
            onClick={() => setSearch(true)}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="10" cy="10" r="6" />
              <path d="m15 15 6 6" />
            </svg>
          </button>
        )}
        {!focus && path !== "/app" && (
          <div className="dash-mobile-stats">
            <StatBar />
          </div>
        )}
        {sessionExpired && (
          <div className="dash-expired" role="status">
            <span>{c.sessionExpired}</span>
            <Link href="/sign-in">{c.signIn}</Link>
          </div>
        )}
        <div className="dash-columns">
          <main className="cab-main" id="cab-main">
            {children}
          </main>
          {!focus && <RightRail />}
        </div>
      </div>
      {!focus && (
        <nav className="dash-bottom" aria-label={c.more}>
          {[
            [c.groups[0].items[0][0], "/app", "home"],
            ["Карта", "/app/map", "map"],
            ["Практика", "/app/practice", "puzzle"],
            ["Проекты", "/app/projects", "puzzle"],
          ].map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              <CabinetIcon name={icon} />
              {label}
            </Link>
          ))}
          <button onClick={() => setMore(true)}>
            <span aria-hidden="true">•••</span>
            {c.more}
          </button>
        </nav>
      )}
      {more && (
        <Modal title={c.more} onClose={() => setMore(false)}>
          <nav className="cab-stack" aria-label={c.more}>
            {c.groups[2].items.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMore(false)}>
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="cab-btn"
            onClick={() => {
              setMore(false);
              setSearch(true);
            }}
          >
            {c.search}
          </button>
          <Link href="/app/profile" onClick={() => setMore(false)}>
            {c.profile}
          </Link>
        </Modal>
      )}
      {search && <CommandPalette onClose={() => setSearch(false)} />}
      <button
        className="dash-help"
        aria-label={c.help}
        onClick={() => window.dispatchEvent(new Event("cabinet:tour"))}
      >
        ?
      </button>
      <MentorAssistant />
      {introduced && <SpotlightTour key={path} />}
      <NameDialog onReady={() => setIntroduced(true)} />
      {introduced && <SavePrompt />}
      <LevelUp />
      <RewardToast />
      <Chest />
      <AchievementNotification />
      {corrupt && (
        <div className="cab-storage-warning" role="alert">
          {interfaceCopy.text008}
          <button className="cab-btn" onClick={reset}>
            {interfaceCopy.text009}
          </button>
        </div>
      )}
      {unavailable && (
        <div className="cab-storage-warning" role="status">
          {interfaceCopy.text007}
        </div>
      )}
      <TransientNotice message={toast} offline={offline && !unavailable} />
    </div>
  );
}
