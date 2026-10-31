// Fabric pictures for "Feel the Fabric", drawn in code (no image downloads, so it opens instantly).
// The cloth shader weaves these pictures into threads; warm bright gold becomes glossy zari floats.

import type { FabricKind } from "./cloth";

export type Swatch = { kind: FabricKind; label: string; note: string };

/** The fabrics a visitor can try, in the order shown. */
export const SWATCHES: Swatch[] = [
  { kind: "brocade", label: "Kimkhab Brocade", note: "Woven with gold zari, firm and rich" },
  { kind: "silk", label: "Raw Silk", note: "Light, fluid, catches the light" },
  { kind: "linen", label: "Linen", note: "Crisp, keeps a soft crease" },
  { kind: "cotton", label: "Cotton", note: "Soft, breathable, everyday" },
];

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Draw the picture of one fabric at the given pixel size. */
export function paintSwatch(kind: FabricKind, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const r = rand(7);

  if (kind === "brocade") {
    // deep maroon ground with a gold buta (paisley-like motif) lattice
    g.fillStyle = "#5E1220";
    g.fillRect(0, 0, w, h);
    const step = Math.max(70, Math.round(Math.min(w, h) / 5.5));
    g.strokeStyle = "rgba(214, 178, 92, 0.55)";
    g.lineWidth = Math.max(1.5, step / 40);
    for (let y = -step; y < h + step; y += step)
      for (let x = -step; x < w + step; x += step) {
        g.beginPath();
        g.moveTo(x, y + step / 2);
        g.lineTo(x + step / 2, y);
        g.lineTo(x + step, y + step / 2);
        g.lineTo(x + step / 2, y + step);
        g.closePath();
        g.stroke();
      }
    for (let row = 0, y = -step; y < h + step; y += step, row++)
      for (let x = -step; x < w + step; x += step) {
        const cx = x + (row % 2 ? step / 2 : 0);
        buta(g, cx + step / 2, y + step / 2, step * 0.3);
      }
  } else if (kind === "silk") {
    // pearl ivory with soft shot-silk bands (kept cool so it never reads as gold zari)
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#DED5C4");
    grad.addColorStop(0.45, "#F1ECE2");
    grad.addColorStop(1, "#D3C8B4");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      // raw-silk slubs: short thicker threads
      g.strokeStyle = `rgba(150, 135, 110, ${0.08 + r() * 0.12})`;
      g.lineWidth = 1 + r() * 2;
      const x = r() * w, y = r() * h, len = 20 + r() * 60;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + len, y + (r() - 0.5) * 2);
      g.stroke();
    }
  } else if (kind === "linen") {
    g.fillStyle = "#C8BEAA";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = r() > 0.5 ? `rgba(110, 100, 85, ${0.1 + r() * 0.15})` : `rgba(240, 230, 210, ${0.15 + r() * 0.2})`;
      g.lineWidth = 0.8 + r() * 1.8;
      const vertical = r() > 0.5;
      const x = r() * w, y = r() * h, len = 30 + r() * 120;
      g.beginPath();
      g.moveTo(x, y);
      if (vertical) g.lineTo(x + (r() - 0.5) * 2, y + len);
      else g.lineTo(x + len, y + (r() - 0.5) * 2);
      g.stroke();
    }
  } else {
    // cotton: soft off-white
    g.fillStyle = "#F1ECE2";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(150, 135, 110, ${0.03 + r() * 0.05})`;
      g.beginPath();
      g.arc(r() * w, r() * h, 6 + r() * 30, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

/** A small gold buta (teardrop with a curled tip) with a dot inside. */
function buta(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save();
  g.translate(x, y);
  g.fillStyle = "#D8B45E";
  g.beginPath();
  g.moveTo(0, -s);
  g.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.9, s * 0.7, 0, s * 0.8);
  g.bezierCurveTo(-s * 0.9, s * 0.7, -s * 0.7, -s * 0.2, -s * 0.15, -s * 0.35);
  g.bezierCurveTo(s * 0.1, -s * 0.5, s * 0.05, -s * 0.85, 0, -s);
  g.fill();
  g.fillStyle = "#5E1220";
  g.beginPath();
  g.arc(0, s * 0.2, s * 0.22, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#E6C77A";
  g.beginPath();
  g.arc(0, s * 0.2, s * 0.1, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
