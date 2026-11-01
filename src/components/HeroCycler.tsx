"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_OUTFITS } from "@/lib/hero";

const OUTFITS = HERO_OUTFITS;
const HOLD_MS = 4800;

/**
 * The hero's four outfits with 01–04 pagination. Each change is a curtain reveal: the new outfit
 * is unveiled from the bottom up behind a gold line. The active number shows a thin timer line.
 * Pauses while the tab is hidden.
 */
export function HeroCycler() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % OUTFITS.length), slow ? 8000 : HOLD_MS);
    return () => window.clearTimeout(t);
  }, [index, visible]);

  // curtain reveal: the new outfit rises in from the bottom while the old one is cut away above it
  const prev = useRef(index);
  useEffect(() => {
    const from = prev.current;
    prev.current = index;
    if (from === index) return; // first paint: show the first outfit as it is, no animation
    document.querySelectorAll<HTMLImageElement>(".model-outfit").forEach((img, i) => {
      img.classList.remove("active", "reveal", "leaving");
      if (i === index) img.classList.add("active", "reveal");
      else if (i === from) img.classList.add("leaving");
    });
    const line = document.querySelector<HTMLElement>(".hero-curtain-line");
    if (line) {
      line.classList.remove("run");
      void line.offsetWidth; // restart the animation
      line.classList.add("run");
    }
  }, [index]);

  return (
    <div
      className="hero-pagination"
      aria-label="Outfit carousel controls"
      style={{ ["--hero-hold" as string]: `${HOLD_MS}ms` }}
    >
      {OUTFITS.map((_, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 ? <span className="pagination-dash">—</span> : null}
          <span
            key={i === index ? `on-${index}` : `off-${i}`}
            className={`page-num${i === index ? " active" : ""}${i === index && visible ? " timing" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={`Outfit ${i + 1}`}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIndex(i)}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
        </span>
      ))}
    </div>
  );
}
