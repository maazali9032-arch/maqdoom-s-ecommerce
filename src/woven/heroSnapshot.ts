// A picture of the home hero, drawn straight from its own images and text (no page screenshot).
// It takes a few milliseconds, so the hero can be pulled like cloth the moment a finger holds it.

type Box = { x: number; y: number; w: number; h: number };

/** Draw `root` (the hero section) into a canvas the size it appears on screen. */
export function snapshotHero(root: HTMLElement, dpr: number): HTMLCanvasElement {
  const r = root.getBoundingClientRect();
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  g.translate(-r.left, -r.top);
  g.textBaseline = "alphabetic";
  drawNode(g, root, 1);
  return c;
}

function drawNode(g: CanvasRenderingContext2D, el: Element, parentAlpha: number) {
  if (!(el instanceof HTMLElement) || el.dataset.woven !== undefined) return;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return;
  const alpha = parentAlpha * parseFloat(cs.opacity || "1");
  if (alpha < 0.02) return;
  const b = el.getBoundingClientRect();
  // skip screen-reader-only text (clipped to a 1px box)
  if (b.width <= 2 && b.height <= 2 && cs.overflow === "hidden") return;
  const box = { x: b.left, y: b.top, w: b.width, h: b.height };
  g.globalAlpha = alpha;

  // background colour, gradient and border
  const bg = cs.backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
    g.fillStyle = bg;
    roundRect(g, box, parseFloat(cs.borderTopLeftRadius) || 0);
    g.fill();
  }
  if (cs.backgroundImage.startsWith("linear-gradient")) drawGradient(g, cs.backgroundImage, box);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (bw > 0 && cs.borderTopStyle !== "none" && cs.borderTopColor !== "rgba(0, 0, 0, 0)") {
    g.strokeStyle = cs.borderTopColor;
    g.lineWidth = bw;
    roundRect(g, { x: box.x + bw / 2, y: box.y + bw / 2, w: box.w - bw, h: box.h - bw }, parseFloat(cs.borderTopLeftRadius) || 0);
    g.stroke();
  }

  if (el instanceof HTMLImageElement) {
    if (el.complete && el.naturalWidth) drawImage(g, el, box, cs);
    return;
  }

  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) drawText(g, n as Text, cs, alpha);
    else if (n instanceof Element) drawNode(g, n, alpha);
  }
  drawPseudo(g, el, box, cs, alpha);
  g.globalAlpha = 1;
}

/** Text written by CSS (::before / ::after content), e.g. the phone "BIG  MALL" line. */
function drawPseudo(g: CanvasRenderingContext2D, el: HTMLElement, box: Box, cs: CSSStyleDeclaration, alpha: number) {
  for (const which of ["::before", "::after"] as const) {
    const ps = getComputedStyle(el, which);
    const m = ps.content.match(/^"(.+)"$/);
    if (!m || ps.display === "none") continue;
    const text = ps.textTransform === "uppercase" ? m[1]!.toUpperCase() : m[1]!;
    g.globalAlpha = alpha;
    g.fillStyle = ps.color;
    g.font = `${ps.fontStyle} ${ps.fontWeight} ${ps.fontSize} ${ps.fontFamily}`;
    try {
      (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = ps.letterSpacing === "normal" ? "0px" : ps.letterSpacing;
    } catch {
      /* older browsers */
    }
    const size = parseFloat(ps.fontSize);
    const padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const w = g.measureText(text).width;
    const atEnd = which === "::after" && cs.justifyContent === "space-between";
    if (which === "::after" && !atEnd) continue; // only the simple left/right layout is supported
    const x = atEnd ? box.x + box.w - padR - w : box.x + padL;
    g.fillText(text, x, box.y + box.h / 2 + size * 0.34);
  }
}

function drawImage(g: CanvasRenderingContext2D, img: HTMLImageElement, box: Box, cs: CSSStyleDeclaration) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const fit = cs.objectFit;
  let dw = box.w, dh = box.h;
  if (fit === "cover" || fit === "contain") {
    const s = fit === "cover" ? Math.max(box.w / iw, box.h / ih) : Math.min(box.w / iw, box.h / ih);
    dw = iw * s;
    dh = ih * s;
  }
  // object-position: "50% 100%" style (computed values are percentages or px)
  const [px, py] = cs.objectPosition.split(" ");
  const pos = (v: string | undefined, free: number) => (v?.endsWith("%") ? (parseFloat(v) / 100) * free : parseFloat(v ?? "0") || free / 2);
  const dx = box.x + pos(px, box.w - dw);
  const dy = box.y + pos(py, box.h - dh);
  g.save();
  g.beginPath();
  g.rect(box.x, box.y, box.w, box.h);
  if (fit === "cover") g.clip();
  const filter = cs.filter && cs.filter !== "none" ? cs.filter : "";
  if (filter.includes("drop-shadow")) g.filter = filter;
  g.drawImage(img, dx, dy, dw, dh);
  g.restore();
}

function drawText(g: CanvasRenderingContext2D, node: Text, cs: CSSStyleDeclaration, alpha: number) {
  const text = node.textContent ?? "";
  if (!text.trim() || cs.color === "rgba(0, 0, 0, 0)") return;
  g.globalAlpha = alpha;
  g.fillStyle = cs.color;
  g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  try {
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
  } catch {
    /* older browsers */
  }
  const upper = cs.textTransform === "uppercase";
  const size = parseFloat(cs.fontSize);
  const range = document.createRange();
  // one word at a time, placed exactly where the browser put it
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    range.setStart(node, m.index);
    range.setEnd(node, m.index + m[0].length);
    const rect = range.getBoundingClientRect();
    if (!rect.width) continue;
    const word = upper ? m[0].toUpperCase() : m[0];
    // baseline sits about 78% down a line box for these fonts
    const base = rect.top + rect.height / 2 + size * 0.34;
    g.fillText(word, rect.left, base);
  }
  range.detach?.();
}

function drawGradient(g: CanvasRenderingContext2D, css: string, box: Box) {
  const inner = css.slice(css.indexOf("(") + 1, css.lastIndexOf(")"));
  const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim());
  let angle = 180;
  if (/deg$/.test(parts[0]!)) angle = parseFloat(parts.shift()!);
  else if (parts[0]!.startsWith("to ")) {
    const dir = parts.shift()!;
    angle = dir.includes("right") ? 90 : dir.includes("left") ? 270 : dir.includes("top") ? 0 : 180;
  }
  const a = ((angle - 90) * Math.PI) / 180;
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const half = (Math.abs(box.w * Math.cos(a)) + Math.abs(box.h * Math.sin(a))) / 2;
  const grad = g.createLinearGradient(cx - Math.cos(a) * half, cy - Math.sin(a) * half, cx + Math.cos(a) * half, cy + Math.sin(a) * half);
  parts.forEach((p, i) => {
    const mm = p.match(/^(.*\))\s*([\d.]+)%?$/) ?? p.match(/^(\S+)\s*([\d.]+)%?$/);
    const color = mm ? mm[1]! : p;
    const at = mm ? parseFloat(mm[2]!) / 100 : i / Math.max(1, parts.length - 1);
    try {
      grad.addColorStop(Math.min(1, Math.max(0, at)), color);
    } catch {
      /* unknown colour */
    }
  });
  g.fillStyle = grad;
  g.fillRect(box.x, box.y, box.w, box.h);
}

function roundRect(g: CanvasRenderingContext2D, b: Box, r: number) {
  g.beginPath();
  if (r > 0 && g.roundRect) g.roundRect(b.x, b.y, b.w, b.h, Math.min(r, b.w / 2, b.h / 2));
  else g.rect(b.x, b.y, b.w, b.h);
}
