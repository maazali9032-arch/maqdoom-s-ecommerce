"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FeelTheFabric } from "./FeelTheFabric";

export type NavLink = { href: string; label: string };
export type NavItem = NavLink & { mahib?: boolean; children?: NavLink[] };

/** A menu item is active on its own page, its sub-pages and any of its drop-down pages. */
function isActive(item: NavItem, path: string) {
  if (item.href.includes("#")) return false;
  if (path === item.href || path.startsWith(`${item.href}/`)) return true;
  return !!item.children?.some((c) => path === c.href);
}

const WA_ICON =
  "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.78h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z";

/** Header with drop-down menus, the Feel the Fabric button, the phone menu and the WhatsApp button. */
export function HeaderClient({
  nav,
  whatsappHref,
  fabricsHref,
}: {
  nav: NavItem[];
  whatsappHref: string;
  fabricsHref: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const path = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close any open menu after moving to another page
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    const t = window.setTimeout(() => {
      setMenu(null);
      setOpen(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setMenu(null);
    };
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
            {nav.map((item) =>
              item.children?.length ? (
                <div
                  key={item.href}
                  className={`nav-drop${menu === item.href ? " open" : ""}`}
                  onMouseEnter={() => setMenu(item.href)}
                  onMouseLeave={() => setMenu(null)}
                  onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setMenu(null)}
                >
                  <Link
                    href={item.href}
                    className={`nav-link${item.mahib ? " nav-link-mahib" : ""}${isActive(item, path) ? " active" : ""}`}
                    aria-current={path === item.href ? "page" : undefined}
                    aria-haspopup="true"
                    aria-expanded={menu === item.href}
                    onFocus={() => setMenu(item.href)}
                  >
                    {item.label}
                    <svg className="nav-caret" viewBox="0 0 10 6" aria-hidden="true">
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </Link>
                  <div className={`nav-panel${item.mahib ? " nav-panel-mahib" : ""}`}>
                    <p className="nav-panel-title">{item.mahib ? "The MAHIB Edit" : "Shop by category"}</p>
                    <ul className="nav-panel-list">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className={path === c.href ? "active" : undefined}>
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link href={item.href} className="nav-panel-all">
                      View all &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link${item.mahib ? " nav-link-mahib" : ""}${isActive(item, path) ? " active" : ""}`}
                  aria-current={isActive(item, path) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <div className="nav-actions">
            <span className="fabric-btn-desktop">
              <FeelTheFabric fabricsHref={fabricsHref} />
            </span>
            <span className="fabric-btn-mobile">
              <FeelTheFabric fabricsHref={fabricsHref} compact />
            </span>
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
        <div className="drawer-panel" style={{ maxWidth: 340 }}>
          <div className="drawer-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="MAQDOOM'S" style={{ height: 38, width: "auto", objectFit: "contain" }} />
            <button className="modal-close-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
              &times;
            </button>
          </div>
          <div className="drawer-body">
            <nav className="drawer-nav" aria-label="Menu">
              {nav.map((item) => (
                <div key={item.href} className="drawer-group">
                  <Link
                    href={item.href}
                    className={`drawer-main${item.mahib ? " drawer-main-mahib" : ""}${path === item.href ? " active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.children?.length ? (
                    <ul className="drawer-sub">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className={path === c.href ? "active" : undefined} onClick={() => setOpen(false)}>
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </nav>
            <a className="btn-primary drawer-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      <a className="wa-float" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={WA_ICON} fill="currentColor" />
        </svg>
        <span className="wa-float-label">Chat with us</span>
      </a>
    </>
  );
}
