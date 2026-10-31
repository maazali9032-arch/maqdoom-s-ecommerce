"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FabricStudio } from "@/woven/studio";
import { SWATCHES } from "@/woven/swatches";
import type { FabricKind } from "@/woven/cloth";

const loadStudio = () => import("@/woven/studio");

/**
 * Header button that opens "Feel the Fabric": a full-screen piece of cloth to touch and pull.
 * The cloth code loads in the background after the page is ready, so it opens instantly,
 * and it only runs while the panel is open.
 */
export function FeelTheFabric({ fabricsHref, compact = false }: { fabricsHref: string; compact?: boolean }) {
  const [supported, setSupported] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ok = false;
    try {
      ok = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      /* no WebGL */
    }
    const t = window.setTimeout(() => {
      setSupported(ok);
      if (!ok) return;
      // fetch the cloth code when the browser is idle
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
      if (idle) idle(() => void loadStudio());
      else window.setTimeout(() => void loadStudio(), 1500);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const close = useCallback(() => setOpen(false), []);
  if (!supported) return null;
  return (
    <>
      <button
        type="button"
        className={`fabric-btn${compact ? " fabric-btn-compact" : ""}`}
        onClick={() => setOpen(true)}
        onPointerEnter={() => void loadStudio()}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="fabric-btn-spark">
          <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.6L12 16l-1.8-5.4L4.5 9l5.7-1.4z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </svg>
        <span>{compact ? "Feel Fabric" : "Feel the Fabric"}</span>
      </button>
      {open ? createPortal(<FabricPanel fabricsHref={fabricsHref} onClose={close} />, document.body) : null}
    </>
  );
}

function FabricPanel({ fabricsHref, onClose }: { fabricsHref: string; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const studio = useRef<FabricStudio | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [kind, setKind] = useState<FabricKind>("brocade");
  const [closer, setCloser] = useState(false);
  const [touched, setTouched] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let alive = true;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const raf = requestAnimationFrame(() => setShown(true));
    void loadStudio()
      .then(({ FabricStudio }) => {
        if (!alive || !canvas.current) return;
        const s = new FabricStudio(canvas.current);
        s.onTouch = () => setTouched(true);
        s.setFabric("brocade");
        studio.current = s;
      })
      .catch(() => alive && setFailed(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      studio.current?.destroy();
      studio.current = null;
    };
  }, [onClose]);

  const pick = (k: FabricKind) => {
    setKind(k);
    setCloser(false);
    studio.current?.setCloser(false);
    studio.current?.setFabric(k);
  };
  const toggleCloser = () => {
    const next = !closer;
    setCloser(next);
    studio.current?.setCloser(next);
  };
  const current = SWATCHES.find((s) => s.kind === kind)!;

  return (
    <div className={`fabric-panel${shown ? " shown" : ""}`} role="dialog" aria-modal="true" aria-label="Feel the fabric">
      <div className="fabric-top">
        <div>
          <p className="fabric-eyebrow">MAQDOOM&rsquo;S FABRIC STUDIO</p>
          <h2 className="fabric-title">{current.label}</h2>
          <p className="fabric-note">{current.note}</p>
        </div>
        <button ref={closeBtn} type="button" className="fabric-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      <div className="fabric-stage">
        <canvas ref={canvas} className="fabric-canvas" aria-label={`${current.label}. Touch and pull the cloth.`} />
        {!touched && !failed ? (
          <div className="fabric-hint" aria-hidden="true">
            <span className="fabric-hint-dot" />
            {closer ? "Drag to look around" : "Touch and pull the cloth"}
          </div>
        ) : null}
        {failed ? <p className="fabric-failed">The fabric couldn&rsquo;t load on this device.</p> : null}
        <button type="button" className={`fabric-closer${closer ? " on" : ""}`} onClick={toggleCloser}>
          {closer ? "Step back" : "Look closer"}
        </button>
      </div>

      <div className="fabric-bottom">
        <div className="fabric-swatches" role="radiogroup" aria-label="Choose a fabric">
          {SWATCHES.map((s) => (
            <button
              key={s.kind}
              type="button"
              role="radio"
              aria-checked={s.kind === kind}
              className={`fabric-swatch fabric-swatch-${s.kind}${s.kind === kind ? " active" : ""}`}
              onClick={() => pick(s.kind)}
            >
              <span className="fabric-swatch-chip" aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
        <Link href={fabricsHref} className="fabric-shop" onClick={onClose}>
          Shop our fabrics &rarr;
        </Link>
      </div>
    </div>
  );
}
