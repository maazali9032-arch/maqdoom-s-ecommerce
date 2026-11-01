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
    const dots = items.map((k) => k.querySelector<HTMLElement>(".gt-dot"));
    const track = el.querySelector<HTMLElement>(".gt-track");
    const revealH = el.querySelector<SVGRectElement>(".gt-reveal-h");
    const revealV = el.querySelector<SVGRectElement>(".gt-reveal-v");
    const phone = matchMedia("(max-width: 760px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      if (!track) return;
      const vh = window.innerHeight;
      const t = track.getBoundingClientRect();
      let p: number;
      let lit: boolean[];
      if (reduced) {
        p = 1;
        lit = items.map(() => true);
      } else if (phone.matches) {
        // the thread runs down the page: it is drawn down to a reading line 70% down the screen,
        // and a knot lights the moment the thread reaches it
        const line = vh * 0.7;
        p = Math.min(1, Math.max(0, (line - t.top) / t.height));
        lit = dots.map((d) => {
          if (!d) return false;
          const r = d.getBoundingClientRect();
          return r.top + r.height / 2 <= line;
        });
      } else {
        // across the page: drawn from left to right while the thread rises from the bottom of the
        // screen to a little above the middle; knots sit at 1/8, 3/8, 5/8 and 7/8 of the thread
        p = Math.min(1, Math.max(0, (vh - t.top) / (vh * 0.55)));
        lit = items.map((_, i) => p >= (i + 0.5) / items.length);
      }
      el.style.setProperty("--p", p.toFixed(4));
      revealH?.setAttribute("width", (p * 1000).toFixed(1));
      revealV?.setAttribute("height", (p * 1000).toFixed(1));
      items.forEach((k, i) => k.classList.toggle("on", lit[i]!));
    };
    const onScroll = () => update(); // scroll events already arrive once per frame
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    phone.addEventListener("change", onScroll);
    return () => {
      phone.removeEventListener("change", onScroll);
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
          {/* the gold thread is revealed by a clip that grows with the scroll, so what is drawn
              always matches where the knots light up */}
          <svg className="gt-svg gt-svg-h" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="gt-clip-h">
                <rect className="gt-reveal-h" x="0" y="-60" width="0" height="220" />
              </clipPath>
            </defs>
            <path className="gt-base" d={WAVE} pathLength={1} />
            <path className="gt-gold" d={WAVE} clipPath="url(#gt-clip-h)" />
          </svg>
          <svg className="gt-svg gt-svg-v" viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="gt-clip-v">
                <rect className="gt-reveal-v" x="-40" y="0" width="120" height="0" />
              </clipPath>
            </defs>
            <path className="gt-base" d={WAVE_V} pathLength={1} />
            <path className="gt-gold" d={WAVE_V} clipPath="url(#gt-clip-v)" />
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
