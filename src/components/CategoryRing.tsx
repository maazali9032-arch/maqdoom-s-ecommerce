"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export type RingCard = { href: string; name: string; img: string; desc?: string | null };

const MIN_CARDS = 12; // categories are repeated so the wide ring always looks full
const SPEED = 9; // degrees per second when turning by itself

/**
 * Categories standing in a 3D ring that slowly turns, like a showroom carousel.
 * The front card is large and bright; the sides turn away and dim. Drag or swipe to spin it;
 * it pauses on hover and while held. Runs only while on screen.
 */
export function CategoryRing({ cards }: { cards: RingCard[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  const repeat = Math.max(1, Math.ceil(MIN_CARDS / Math.max(1, cards.length)));
  const items = Array.from({ length: repeat }, (_, r) => cards.map((c) => ({ ...c, copy: r }))).flat();
  const n = items.length;
  const step = 360 / n;

  useEffect(() => {
    const st = stage.current, rg = ring.current;
    if (!st || !rg) return;
    const els = Array.from(rg.children) as HTMLElement[];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let angle = 0;
    let velocity = 0; // after a swipe, degrees per second
    let hovered = false;
    let drag: { id: number; x: number; angle: number; moved: number; t: number; lastX: number } | null = null;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let rx = 0; // half-width of the oval: reaches the edges of the section
    let rz = 0; // depth of the oval

    const layout = () => {
      const w = els[0]?.offsetWidth ?? 260;
      const half = st.clientWidth / 2;
      // the nearest side cards end just inside the section's edges
      const side = Math.sin((Math.max(step, 60) * Math.PI) / 180);
      // ...and neighbours never overlap the front card (on phones they run off the screen edges)
      const apart = (w * 1.04) / Math.sin((step * Math.PI) / 180);
      rx = Math.max(w * 0.9, (half - w * 0.55) / side, apart);
      rz = Math.min(rx * 0.6, 420);
    };

    const paint = () => {
      els.forEach((el, i) => {
        const rel = (((i * step - angle) % 360) + 540) % 360 - 180; // -180..180, 0 = front
        const rad = (rel * Math.PI) / 180;
        const facing = Math.cos(rad); // 1 front, -1 back
        // an oval as wide as the section: cards spread to the edges and turn to face the middle
        const x = rx * Math.sin(rad);
        const z = rz * (facing - 1);
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${(rel * 0.55).toFixed(2)}deg)`;
        const k = (facing + 1) / 2;
        el.style.opacity = String(0.12 + 0.88 * k * k);
        // darken with an overlay (a CSS filter here blacks out photos inside the 3D ring)
        el.style.setProperty("--shade", (0.6 * (1 - k)).toFixed(3));
        el.style.pointerEvents = facing > 0.3 ? "auto" : "none";
        el.classList.toggle("ring-front", Math.abs(rel) < step / 2);
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || drag) return;
      if (Math.abs(velocity) > 1) {
        angle += velocity * dt;
        velocity *= Math.pow(0.04, dt); // swipe glides, then slows down
      } else if (!hovered && !reduced) {
        velocity = 0;
        angle += SPEED * dt;
      } else return;
      paint();
    };

    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      drag = { id: e.pointerId, x: e.clientX, angle, moved: 0, t: performance.now(), lastX: e.clientX };
      velocity = 0;
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      if (drag.moved > 6) {
        try {
          st.setPointerCapture(e.pointerId);
        } catch {
          /* pointer gone */
        }
      }
      const now = performance.now();
      const dts = Math.max(0.008, (now - drag.t) / 1000);
      velocity = (-(e.clientX - drag.lastX) * 0.35) / dts;
      drag.t = now;
      drag.lastX = e.clientX;
      angle = drag.angle - dx * 0.35;
      paint();
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const wasDrag = drag.moved > 6;
      const still = performance.now() - drag.t > 120; // finger stopped before letting go: no glide
      drag = null;
      velocity = still ? 0 : Math.max(-400, Math.min(400, velocity));
      last = performance.now();
      if (wasDrag) {
        // a drag must not open the card under the finger
        const swallow = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        st.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => st.removeEventListener("click", swallow, { capture: true }), 400);
      }
    };
    const enter = () => (hovered = true);
    const leave = () => (hovered = false);
    // keyboard: bring a focused card to the front
    const focus = (e: FocusEvent) => {
      const i = els.indexOf((e.target as HTMLElement).closest(".ring-card") as HTMLElement);
      if (i < 0) return;
      velocity = 0;
      angle = i * step;
      paint();
    };

    layout();
    paint();
    const ro = new ResizeObserver(() => {
      layout();
      paint();
    });
    ro.observe(st);
    const io = new IntersectionObserver(([en]) => {
      visible = !!en?.isIntersecting;
      last = performance.now();
    });
    io.observe(st);
    st.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    st.addEventListener("pointerenter", enter);
    st.addEventListener("pointerleave", leave);
    st.addEventListener("focusin", focus);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      st.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      st.removeEventListener("pointerenter", enter);
      st.removeEventListener("pointerleave", leave);
      st.removeEventListener("focusin", focus);
    };
  }, [n, step]);

  return (
    <div className="ring-stage" ref={stage}>
      <div className="ring" ref={ring}>
        {items.map((c, i) => (
          <Link
            key={`${c.copy}-${c.href}-${i}`}
            href={c.href}
            className="category-card ring-card"
            draggable={false}
            aria-hidden={c.copy > 0 ? true : undefined}
            tabIndex={c.copy > 0 ? -1 : undefined}
          >
            <div className="category-img-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt={c.copy > 0 ? "" : `${c.name} collection`} decoding="async" draggable={false} />
            </div>
            <div className="category-info-box">
              <div className="cat-text-wrap">
                <h3 className="category-name">{c.name.toUpperCase()}</h3>
                {c.desc ? <span className="category-subtext">{c.desc}</span> : null}
              </div>
              <div className="category-arrow-circle">&rarr;</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
