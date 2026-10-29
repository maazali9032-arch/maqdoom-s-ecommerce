"use client";

import { useEffect, useState } from "react";
import { HERO_OUTFITS } from "@/lib/hero";

const OUTFITS = HERO_OUTFITS;

/** The hero's four-outfit crossfade with 01–04 pagination (from the original app.js). */
export function HeroCycler() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % OUTFITS.length), slow ? 6000 : 2200);
    return () => window.clearInterval(t);
  }, [index]);
  return (
    <>
      <div className="hero-pagination" aria-label="Outfit carousel controls">
        {OUTFITS.map((_, i) => (
          <span key={i} style={{ display: "contents" }}>
            {i > 0 ? <span className="pagination-dash">—</span> : null}
            <span
              className={`page-num${i === index ? " active" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Outfit ${i + 1}`}
              onClick={() => setIndex(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIndex(i)}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
          </span>
        ))}
      </div>
      <HeroStagePortal index={index} />
    </>
  );
}

/** Renders the model stage; kept separate so the pagination and stage share one timer. */
function HeroStagePortal({ index }: { index: number }) {
  useEffect(() => {
    document.querySelectorAll<HTMLImageElement>(".model-outfit").forEach((img, i) => {
      img.classList.toggle("active", i === index);
    });
  }, [index]);
  return null;
}
