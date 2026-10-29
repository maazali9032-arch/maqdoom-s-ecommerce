import Link from "next/link";
import { cacheLife } from "next/cache";
import { getCategories, getSettings } from "@/lib/catalogue";
import { SITE_NAME, sectionPath, whatsappLink } from "@/lib/site";
import { HeaderClient, type NavItem } from "./HeaderClient";

export async function SiteHeader() {
  const [main, settings] = await Promise.all([getCategories("main"), getSettings()]);
  const nav: NavItem[] = [
    { href: "/shop", label: "Shop All" },
    { href: "/mahib", label: "MAHIB", mahib: true },
    ...main.slice(0, 6).map((c) => ({ href: sectionPath("main", c.slug), label: c.name })),
    { href: "/#tailoring", label: "Custom Tailoring" },
  ];
  return (
    <HeaderClient
      nav={nav}
      whatsappHref={whatsappLink(settings.whatsapp_number, `Hello ${SITE_NAME}, I have a question.`)}
    />
  );
}

export async function SiteFooter() {
  "use cache";
  cacheLife("hours");
  const [main, mahib, settings] = await Promise.all([getCategories("main"), getCategories("mahib"), getSettings()]);
  const wa = (text: string) => whatsappLink(settings.whatsapp_number, text);
  return (
    <footer className="site-footer" id="siteFooter">
      <div className="container">
        <div className="footer-top-grid">
          <div className="footer-brand-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo2.webp" alt={SITE_NAME} className="footer-logo2-img" loading="lazy" />
          </div>
          <div>
            <h4 className="footer-col-title">Shop</h4>
            <ul className="footer-links-list">
              <li><Link href="/shop" className="footer-link">All Products</Link></li>
              {main.map((c) => (
                <li key={c.slug}><Link href={sectionPath("main", c.slug)} className="footer-link">{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="footer-col-title">MAHIB</h4>
            <ul className="footer-links-list">
              <li><Link href="/mahib" className="footer-link">The MAHIB Edit</Link></li>
              {mahib.map((c) => (
                <li key={c.slug}><Link href={sectionPath("mahib", c.slug)} className="footer-link">{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="footer-col-title">Customer Care</h4>
            <ul className="footer-links-list">
              <li><a href={wa("Hello, I'd like help with an order.")} className="footer-link" target="_blank" rel="noopener noreferrer">Order on WhatsApp</a></li>
              <li><a href={wa("Hello, I'd like to book a custom tailoring appointment.")} className="footer-link" target="_blank" rel="noopener noreferrer">Custom Tailoring</a></li>
              <li><a href={wa("Hello, I have a question about sizes.")} className="footer-link" target="_blank" rel="noopener noreferrer">Size Help</a></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-col-title">Talk to Us</h4>
            <p className="newsletter-desc">Questions, orders and appointments are handled on WhatsApp.</p>
            <a href={wa("Hello!")} className="btn-primary" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex" }}>
              <span>Chat on WhatsApp</span>
              <span className="btn-arrow">&rarr;</span>
            </a>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <p className="copyright-text">&copy; {new Date().getFullYear()} MAQDOOM&rsquo;S Big Mall. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
