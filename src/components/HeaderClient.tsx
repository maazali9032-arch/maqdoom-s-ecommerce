"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string; mahib?: boolean };

/** "Shop All" only on /shop itself; MAHIB and categories also on their sub-pages. */
function isActive(href: string, path: string) {
  if (href.includes("#")) return false;
  if (href === "/shop") return path === "/shop";
  return path === href || path.startsWith(`${href}/`);
}

/** Scroll shadow and the mobile menu drawer (classes from the original design). */
export function HeaderClient({ nav, whatsappHref }: { nav: NavItem[]; whatsappHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const cls = (item: NavItem) =>
    `nav-link${item.mahib ? " nav-link-mahib" : ""}${isActive(item.href, path) ? " active" : ""}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className={`site-header${scrolled ? " scrolled" : ""}`} id="siteHeader">
        <div className="container nav-inner">
          <Link href="/" className="brand-link" aria-label="MAQDOOM'S BIG MALL Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="MAQDOOM'S BIG MALL" className="header-logo-img" />
          </Link>
          <nav className="main-nav" aria-label="Primary Navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cls(item)}
                aria-current={isActive(item.href, path) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="icon-btn" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </a>
            <button className="icon-btn mobile-menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`drawer-backdrop${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        <div className="drawer-panel" style={{ maxWidth: 320 }}>
          <div className="drawer-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="MAQDOOM'S" style={{ height: 38, width: "auto", objectFit: "contain" }} />
            <button className="modal-close-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              &times;
            </button>
          </div>
          <div className="drawer-body">
            <nav style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "1rem", fontWeight: 500 }}>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cls(item)}
                  aria-current={isActive(item.href, path) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
