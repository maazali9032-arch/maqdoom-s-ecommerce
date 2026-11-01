"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FabricStudio } from "@/woven/studio";
import type { WovenOverlay } from "@/woven/overlay";
import { SWATCHES } from "@/woven/swatches";
import type { FabricKind } from "@/woven/cloth";

const loadStudio = () => import("@/woven/studio");
const loadOverlay = () => import("@/woven/overlay");
const loadSnapshot = () => import("@/woven/heroSnapshot");
const KEY = "maqdooms-fabric";
const HOLD_MS = 260;
const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=button],[data-woven]";

/**
 * "Feel the Fabric" switch in the header, shown on the home page only.
 * On: the home hero gets a woven-thread look (drawn over the real content, which stays sharp and
 * clickable), and you can press and hold the hero, then pull it like cloth. The rest of the site
 * is untouched. Nothing waits on it: the hero picture is drawn from its own images.
 */
export function FeelTheFabric({ fabricsHref }: { fabricsHref: string }) {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [toast, setToast] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const overlay = useRef<WovenOverlay | null>(null);
  const home = usePathname() === "/";

  const start = useCallback(async (weave: boolean) => {
    const { WovenOverlay } = await loadOverlay();
    const hero = document.getElementById("heroSection");
    if (overlay.current || !hero) return;
    overlay.current = new WovenOverlay(hero);
    document.body.classList.add("woven-on");
    if (weave) overlay.current.weaveIn();
    void loadStudio();
    void loadSnapshot();
  }, []);

  const stop = useCallback(() => {
    overlay.current?.destroy();
    overlay.current = null;
    document.body.classList.remove("woven-on");
  }, []);

  // support check and remembered choice (after mount, so server and first render match)
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
      let remembered = false;
      try {
        remembered = localStorage.getItem(KEY) === "on";
      } catch {
        /* storage blocked */
      }
      if (remembered) setOn(true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      stop();
    };
  }, [start, stop]);

  // the woven look lives on the home hero only: add it there, remove it on other pages
  useEffect(() => {
    if (!on || !home) {
      stop();
      return;
    }
    // after moving back to the home page the hero may take a moment to appear
    let tries = 0;
    let timer = 0;
    const attach = () => {
      if (document.getElementById("heroSection")) void start(false);
      else if (++tries < 40) timer = window.setTimeout(attach, 100);
    };
    attach();
    return () => window.clearTimeout(timer);
  }, [on, home, start, stop]);

  // home hero: press and hold, then pull it like cloth
  useEffect(() => {
    if (!on || !home) return;
    let hold = 0;
    let press: { id: number; x: number; y: number } | null = null;
    let busy = false;

    const cancel = () => {
      window.clearTimeout(hold);
      press = null;
    };
    const begin = async () => {
      const p = press;
      const hero = document.getElementById("heroSection");
      if (!p || !hero || busy) return;
      busy = true;
      let made: HTMLCanvasElement | null = null;
      try {
        const [{ snapshotHero }, { FabricStudio }] = await Promise.all([loadSnapshot(), loadStudio()]);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const pic = snapshotHero(hero, dpr);
        const canvas = document.createElement("canvas");
        canvas.className = "hero-cloth";
        canvas.dataset.woven = "";
        canvas.setAttribute("aria-hidden", "true");
        const { placeOver } = await loadOverlay();
        placeOver(canvas, hero.getBoundingClientRect());
        document.body.appendChild(canvas);
        made = canvas;
        const cloth = new FabricStudio(canvas, { thread: 2.6 });
        cloth.setPicture(pic, "silk");
        cloth.pullFrom(p.id, p.x, p.y);
        overlay.current?.setHidden(true);
        // the release after a pull must not click whatever is underneath
        const swallow = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 700);
        cloth.onSettle = () => {
          canvas.classList.add("hero-cloth-out");
          overlay.current?.setHidden(false);
          window.setTimeout(() => {
            cloth.destroy();
            canvas.remove();
            busy = false;
          }, 320);
        };
      } catch {
        made?.remove();
        overlay.current?.setHidden(false);
        busy = false;
      }
      press = null;
    };

    const down = (e: PointerEvent) => {
      if (e.button > 0 || busy) return;
      const t = e.target as Element | null;
      if (!t?.closest?.("#heroSection") || t.closest(INTERACTIVE)) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY };
      hold = window.setTimeout(() => void begin(), HOLD_MS);
    };
    const move = (e: PointerEvent) => {
      if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancel();
    };
    const up = (e: PointerEvent) => press?.id === e.pointerId && cancel();
    const menu = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("#heroSection")) e.preventDefault();
    };
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    window.addEventListener("contextmenu", menu);
    return () => {
      cancel();
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("contextmenu", menu);
    };
  }, [on, home]);

  // the tip hides by itself
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(false), 6500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      if (next) localStorage.setItem(KEY, "on");
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
    if (next) {
      void start(true);
      setToast(true);
    } else {
      stop();
      setToast(false);
    }
  };
  const closeStudio = useCallback(() => setStudioOpen(false), []);

  if (!supported || !home) return null;
  return (
    <>
      <button
        type="button"
        className={`fabric-btn${on ? " on" : ""}`}
        onClick={toggle}
        onPointerEnter={() => void loadOverlay()}
        aria-pressed={on}
        title={on ? "Turn the fabric look off" : "See and feel the site as woven fabric"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="fabric-btn-spark">
          <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.6L12 16l-1.8-5.4L4.5 9l5.7-1.4z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
        </svg>
        <span className="fabric-btn-long">{on ? "Fabric On" : "Feel the Fabric"}</span>
        <span className="fabric-btn-short">{on ? "Fabric On" : "Feel Fabric"}</span>
      </button>
      {toast
        ? createPortal(
            <div className="fabric-toast" role="status">
              <span>
                <strong>Woven.</strong> Press and hold the top picture, then pull it.
              </span>
              <button
                type="button"
                onClick={() => {
                  setToast(false);
                  setStudioOpen(true);
                }}
              >
                Try our fabrics
              </button>
            </div>,
            document.body,
          )
        : null}
      {studioOpen ? createPortal(<FabricPanel fabricsHref={fabricsHref} onClose={closeStudio} />, document.body) : null}
    </>
  );
}

/** Full-screen Fabric Studio: brocade, raw silk, linen and cotton to touch and pull. */
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
    <div className={`fabric-panel${shown ? " shown" : ""}`} role="dialog" aria-modal="true" aria-label="Fabric studio">
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
