"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type ThreadKnot = { mark: string; title: string; text: string; href?: string; external?: boolean };

// A gentle wave that crosses the middle exactly where the knots sit (12.5%, 37.5%, 62.5%, 87.5%).
const WAVE = (() => {
  const pts: string[] = [];
  for (let x = 0; x <= 1000; x += 10) pts.push(`${x},${(50 - 16 * Math.sin((2 * Math.PI * x) / 250)).toFixed(2)}`);
  return `M${pts.join(" L")}`;
})();
const WAVE_V = (() => {
  const pts: string[] = [];
  for (let y = 0; y <= 1000; y += 10) pts.push(`${(20 + 5 * Math.sin((2 * Math.PI * y) / 250)).toFixed(2)},${y}`);
  return `M${pts.join(" L")}`;
})();

/**
 * "The Golden Thread": the Maqdoom story as a gold thread that stitches itself across the section
 * while it scrolls into view, tying four knots along the way.
 */
export function GoldenThread({ knots }: { knots: ThreadKnot[] }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".gt-knot"));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section's top reaches the lower part of the screen, 1 once most of it has scrolled in
      const p = reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (r.height * 0.75 + vh * 0.15)));
      el.style.setProperty("--p", p.toFixed(4));
      items.forEach((k, i) => k.classList.toggle("on", p >= (i + 0.5) / items.length - 0.04));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="gt-section" ref={root} aria-label="The Maqdoom story since 1895">
      <div className="container">
        <p className="gt-eyebrow">SINCE 1895</p>
        <h2 className="gt-title">THE GOLDEN THREAD</h2>
        <p className="gt-sub">130 years of dressing Hyderabad&rsquo;s grooms, one unbroken thread.</p>

        <div className="gt-track">
          <svg className="gt-svg gt-svg-h" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            <path className="gt-base" d={WAVE} pathLength={1} />
            <path className="gt-gold" d={WAVE} pathLength={1} />
          </svg>
          <svg className="gt-svg gt-svg-v" viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true">
            <path className="gt-base" d={WAVE_V} pathLength={1} />
            <path className="gt-gold" d={WAVE_V} pathLength={1} />
          </svg>

          <ol className="gt-knots">
            {knots.map((k) => {
              const body = (
                <>
                  <span className="gt-dot" aria-hidden="true" />
                  <span className="gt-mark">{k.mark}</span>
                  <span className="gt-name">{k.title}</span>
                  <span className="gt-text">{k.text}</span>
                  {k.href ? <span className="gt-go">Discover &rarr;</span> : null}
                </>
              );
              return (
                <li key={k.mark} className="gt-knot">
                  {k.href ? (
                    k.external ? (
                      <a className="gt-card" href={k.href} target="_blank" rel="noopener noreferrer">
                        {body}
                      </a>
                    ) : (
                      <Link className="gt-card" href={k.href}>
                        {body}
                      </Link>
                    )
                  ) : (
                    <div className="gt-card">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
