"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { WovenEngine } from "@/woven/engine";

const KEY = "maqdooms-woven";

/**
 * Header switch for Woven Mode. Off: the normal site. On: the same site woven as velvet cloth,
 * with loom sounds. The engine code downloads only when switched on; the choice is remembered.
 */
export function WovenToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const engine = useRef<WovenEngine | null>(null);
  const router = useRouter();
  const path = usePathname();
  const firstPath = useRef(path);

  const start = async (withSound: boolean) => {
    const { WovenEngine } = await import("@/woven/engine");
    if (engine.current) return;
    engine.current = new WovenEngine();
    if (withSound) engine.current.enableSound();
    else {
      // browsers allow sound only after a tap; switch it on with the first one
      const wake = () => engine.current?.enableSound();
      window.addEventListener("pointerdown", wake, { once: true });
    }
    engine.current.weaveIn();
  };

  // Support check and remembered choice (after mount, so server and first render match).
  useEffect(() => {
    const t = window.setTimeout(() => {
      let ok = false;
      try {
        ok = !!document.createElement("canvas").getContext("webgl2");
      } catch {
        /* no WebGL */
      }
      if (!ok) return;
      setSupported(true);
      let remembered = false;
      try {
        remembered = localStorage.getItem(KEY) === "on";
      } catch {
        /* storage blocked */
      }
      if (remembered) {
        setOn(true);
        void start(false);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  // Weave each new page in after navigation.
  useEffect(() => {
    if (path === firstPath.current) return;
    firstPath.current = path;
    engine.current?.weaveIn(true);
  }, [path]);

  // Unweave before leaving the page (links inside this site only).
  useEffect(() => {
    if (!on) return;
    const onClick = (e: MouseEvent) => {
      const eng = engine.current;
      if (!eng || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.closest(".drawer-panel") || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void eng.unravel().then(() => router.push(url.pathname + url.search + url.hash));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [on, router]);

  useEffect(() => () => engine.current?.destroy(), []);

  if (!supported) return null;
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      if (next) localStorage.setItem(KEY, "on");
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
    if (next) void start(true);
    else {
      engine.current?.destroy();
      engine.current = null;
    }
  };
  return (
    <button
      type="button"
      className={`icon-btn woven-toggle${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Turn off woven mode" : "Turn on woven mode"}
      title={on ? "Woven mode is on" : "Woven mode: see the site as woven velvet"}
      onClick={toggle}
    >
      {/* a spool of thread with a needle */}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <path d="M5 4h10M5 20h10M6.5 4v16M13.5 4v16" />
        <path d="M6.5 8.5l7 -2M6.5 12l7 -2M6.5 15.5l7 -2M6.5 19l7 -2" />
        <path d="M19.5 3.5L16 17" />
        <ellipse cx="19.4" cy="5" rx="0.6" ry="1.2" transform="rotate(14 19.4 5)" />
      </svg>
    </button>
  );
}
