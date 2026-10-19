"use client";
import { useEffect, useRef, useState } from "react";
import { ru } from "@/content/ru";
import { Button } from "./ui/primitives";

export function Brand() {
  return (
    <a className="brand" href="#main" aria-label={ru.ui.home}>
      <span className="brand-mark" aria-hidden="true">
        ∞
      </span>
      {ru.brand}
    </a>
  );
}
export default function Header() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => {
      const value = String(window.scrollY > 16);
      if (header.current && header.current.dataset.scrolled !== value)
        header.current.dataset.scrolled = value;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const links = menu.current?.querySelectorAll<HTMLAnchorElement>("a");
    links?.[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === "Tab" && links?.length) {
        const first = links[0],
          last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          trigger.current?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          trigger.current?.focus();
        } else if (document.activeElement === trigger.current) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <header ref={header} className="header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label={ru.header.navLabel}>
          {ru.header.nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <Button href="/app" className="account" variant="secondary">
          {ru.header.account.label}
          <span aria-hidden="true">↗</span>
        </Button>
        <button
          ref={trigger}
          className="menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? ru.header.closeMenu : ru.header.openMenu}
          onClick={() => setOpen(!open)}
        >
          {open ? "×" : "☰"}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          className="mobile-menu"
          aria-label={ru.ui.menu}
          ref={menu}
        >
          {ru.header.nav.map((item) => (
            <a key={item.href} href={item.href} onClick={close}>
              {item.label}
            </a>
          ))}
          <a href="/app" onClick={close}>
            {ru.header.account.label}
          </a>
        </nav>
      )}
      <noscript>
        <nav className="noscript-nav">
          {ru.header.nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </noscript>
    </header>
  );
}
