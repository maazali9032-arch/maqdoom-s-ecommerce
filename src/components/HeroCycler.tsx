"use client";

import { useEffect, useState } from "react";
import { HERO_OUTFITS } from "@/lib/hero";

const OUTFITS = HERO_OUTFITS;
const HOLD_MS = 4800;

/**
 * The hero's four outfits with 01–04 pagination. The old outfit steps away before the next one
 * rises in (no double exposure); the active number shows a thin timer line.
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

  useEffect(() => {
    document.querySelectorAll<HTMLImageElement>(".model-outfit").forEach((img, i) => {
      img.classList.toggle("active", i === index);
    });
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
