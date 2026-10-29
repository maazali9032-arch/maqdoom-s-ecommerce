// Woven Mode engine. Runs only after the visitor switches Woven Mode on.
// - A velvet thread texture lies over the live site (the site stays sharp, clickable and readable).
// - Opening or changing a page: the loom weaves it in from the top, with the shuttle.
// - Press and hold (not on a link/button): the screen becomes real cloth you can pull.
// - Double-tap / double-click: lean in to see the threads; tap "Step back" to return.

import { Cloth, FABRICS } from "./cloth";
import { Sound } from "./sound";
import { VERT, FRAG } from "./shaders";

const THREAD = 2.2;           // thread width in CSS px
const HOLD_MS = 380;
const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=button],[role=tab],[contenteditable],[data-woven]";

export class WovenEngine {
  private canvas = document.createElement("canvas");
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private buf: { pos: WebGLBuffer; norm: WebGLBuffer; rest: WebGLBuffer; idx: WebGLBuffer };
  private tex: { snap: WebGLTexture; brush: WebGLTexture };
  private count = 0;
  private cloth = new Cloth();
  readonly sound = new Sound();
  private brush = document.createElement("canvas");
  private bctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // weaving
  private front = 1e6;
  private phase: "idle" | "weaving" | "unravel" = "idle";
  private speed = 1800;
  private unravelDone: (() => void) | null = null;
  private shuttle: HTMLElement;
  private weft: HTMLElement;
  private shuttleT = 0;
  private shuttleDir = 1;

  // snapshot cloth
  private mode: 0 | 1 = 0;
  private snapScroll = 0;
  private fade = 0;
  private fading = false;
  private zoom = 1;
  private zoomTarget = 1;
  private zoomAt = { x: 0, y: 0 };
  private panX = 0;
  private panY = 0;
  private leaning = false;
  private pulling = false;
  private stepBack: HTMLButtonElement;
  private fontCSS: Promise<string> | null = null;

  // input
  private hold = 0;
  private press: { x: number; y: number; id: number; capture: Promise<HTMLCanvasElement | null> } | null = null;
  private lastTap = { t: 0, x: 0, y: 0 };
  private hover: { x: number; y: number } | null = null;
  private lastScroll = 0;
  private lastPull = { x: 0, y: 0 };
  private active = 0;           // time of the last activity; drawing pauses when idle
  private raf = 0;
  private time = 0;
  private last = performance.now();
  private off: (() => void)[] = [];

  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  constructor() {
    const gl = this.canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.canvas.dataset.woven = "";
    this.canvas.className = "woven-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.canvas);

    this.prog = this.program();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    this.buf = { pos: gl.createBuffer()!, norm: gl.createBuffer()!, rest: gl.createBuffer()!, idx: gl.createBuffer()! };
    this.attrib(this.buf.pos, "aPos", 3);
    this.attrib(this.buf.norm, "aNormal", 3);
    this.attrib(this.buf.rest, "aRest", 2);
    this.tex = { snap: this.texture(0), brush: this.texture(1) };
    gl.uniform1i(this.u("uSnap"), 0);
    gl.uniform1i(this.u("uBrush"), 1);

    this.brush.width = this.brush.height = 96;
    this.bctx = this.brush.getContext("2d")!;
    this.bctx.fillStyle = "rgb(128,128,0)";
    this.bctx.fillRect(0, 0, 96, 96);

    this.cloth.fabric = FABRICS.velvet;

    this.shuttle = this.el(
      "div",
      "woven-shuttle",
      `<svg viewBox="0 0 64 28"><defs><linearGradient id="wv-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C58B4C"/><stop offset=".5" stop-color="#8A5527"/><stop offset="1" stop-color="#5B3416"/></linearGradient></defs><path d="M2 14C12 4 52 4 62 14C52 24 12 24 2 14Z" fill="url(#wv-wood)"/><rect x="22" y="10" width="20" height="8" rx="3" fill="#2A1A0E"/><rect x="24" y="11.5" width="16" height="5" rx="2.5" fill="#C5A869"/></svg>`,
    );
    this.weft = this.el("div", "woven-weft");
    this.stepBack = this.el("button", "woven-step-back", "Step back") as HTMLButtonElement;
    this.stepBack.type = "button";
    this.stepBack.onclick = () => this.leanOut();

    this.resize();
    this.listen();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- public ----------

  /** Weave the current page in from the top (switching on, or after a page change). */
  weaveIn(fast = false) {
    if (this.reduced) return;
    this.front = -2;
    this.speed = fast ? 2200 : 1100;
    this.phase = "weaving";
    this.wake();
  }

  /** Unweave the screen from the bottom up; resolves when bare, ready for the next page. */
  unravel(): Promise<void> {
    if (this.reduced) return Promise.resolve();
    this.leanOut(true);
    this.front = Math.min(this.front, this.H + 2);
    this.phase = "unravel";
    this.wake();
    return new Promise((res) => {
      this.unravelDone = res;
      setTimeout(res, 900); // never block navigation
    });
  }

  enableSound() {
    this.sound.enable();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const f of this.off) f();
    this.sound.disable();
    for (const n of [this.canvas, this.shuttle, this.weft, this.stepBack]) n.remove();
    document.body.style.userSelect = "";
    const lose = this.gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
  }

  // ---------- setup helpers ----------

  private el(tag: string, cls: string, html = "") {
    const n = document.createElement(tag);
    n.className = cls;
    n.dataset.woven = "";
    n.setAttribute("aria-hidden", tag === "button" ? "false" : "true");
    n.innerHTML = html;
    document.body.appendChild(n);
    return n;
  }

  private program() {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    gl.useProgram(p);
    return p;
  }

  private u(name: string) {
    if (!this.uniforms.has(name)) this.uniforms.set(name, this.gl.getUniformLocation(this.prog, name));
    return this.uniforms.get(name) ?? null;
  }

  private attrib(buf: WebGLBuffer, name: string, size: number) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(this.prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  private texture(unit: number) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 0, 255]));
    return t;
  }

  private upload(unit: number, t: WebGLTexture, src: TexImageSource) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }

  private resize = () => {
    const gl = this.gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.cloth.resize(this.W, this.H);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.rest);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.cloth.home), gl.STATIC_DRAW);
    const idx = this.cloth.indices();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf.idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.count = idx.length;
    this.wake();
  };

  private wake() {
    this.active = performance.now();
  }

  // ---------- input ----------

  private on<K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) {
    window.addEventListener(t, f as EventListener, o);
    this.off.push(() => window.removeEventListener(t, f as EventListener, o));
  }

  private listen() {
    this.on("resize", this.resize);
    this.lastScroll = window.scrollY;
    this.on("scroll", () => {
      const d = window.scrollY - this.lastScroll;
      this.lastScroll = window.scrollY;
      if (this.mode === 0) this.cloth.ripple(Math.min(1.5, Math.abs(d) * 0.04));
      this.wake(); // no sound on scroll: the cloth only sounds when touched
    }, { passive: true });

    this.on("pointermove", (e) => {
      this.brushNap(e.clientX, e.clientY, e.movementX, e.movementY);
      if (e.pointerType === "mouse" && !this.press) this.hover = { x: e.clientX, y: e.clientY };
      const p = this.press;
      if (p && p.id === e.pointerId) {
        if (this.pulling) {
          this.cloth.drag(e.clientX, e.clientY);
          // measure the finger's movement ourselves (phones don't always report movementX/Y)
          const moved = Math.hypot(e.clientX - this.lastPull.x, e.clientY - this.lastPull.y);
          this.lastPull = { x: e.clientX, y: e.clientY };
          this.sound.rustle(Math.min(1, moved / 30), true);
        } else if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) {
          this.cancelHold();
        }
      }
      if (this.leaning && e.buttons) {
        this.panX -= e.movementX / this.zoom;
        this.panY -= e.movementY / this.zoom;
        this.clampPan();
      }
      this.wake();
    }, { passive: true });

    this.on("pointerdown", (e) => {
      if (this.mode === 1 || e.button > 0) return;
      const target = e.target as Element | null;
      if (target?.closest?.(INTERACTIVE) || target === this.stepBack) return;
      // start capturing right away so the cloth is ready when the hold completes
      const capture = this.capture().catch(() => null);
      this.press = { x: e.clientX, y: e.clientY, id: e.pointerId, capture };
      this.hold = window.setTimeout(() => void this.beginPull(), HOLD_MS);
    }, { passive: true });

    const up = (e: PointerEvent) => {
      const p = this.press;
      if (this.pulling && p?.id === e.pointerId) this.endPull();
      else if (p?.id === e.pointerId) {
        this.cancelHold();
        // double tap on a plain area: lean in
        const now = performance.now();
        const near = Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 30;
        if (now - this.lastTap.t < 320 && near) {
          this.lastTap.t = 0;
          void this.leanIn(e.clientX, e.clientY);
        } else this.lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    };
    this.on("pointerup", up, { passive: true });
    this.on("pointercancel", () => {
      if (this.pulling) this.endPull();
      else this.cancelHold();
    });
    // no page scroll and no text selection while holding the cloth
    this.on("touchmove", (e) => {
      if (this.pulling || this.leaning) e.preventDefault();
    }, { passive: false });
    this.on("selectstart", (e) => {
      if (this.pulling || this.press) e.preventDefault();
    });
    this.on("wheel", (e) => {
      if (this.leaning) {
        e.preventDefault();
        this.leanOut();
      }
    }, { passive: false });
    this.on("keydown", (e) => {
      if (e.key === "Escape") this.leanOut();
    });
  }

  private cancelHold() {
    window.clearTimeout(this.hold);
    if (!this.pulling) this.press = null;
  }

  private brushNap(x: number, y: number, dx: number, dy: number) {
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const bx = (x / this.W) * 96, by = (y / this.H) * 96;
    const r = Math.round(128 + (dx / len) * 110), g = Math.round(128 + (dy / len) * 110);
    const grad = this.bctx.createRadialGradient(bx, by, 0, bx, by, 9);
    grad.addColorStop(0, `rgba(${r},${g},0,0.9)`);
    grad.addColorStop(1, `rgba(${r},${g},0,0)`);
    this.bctx.fillStyle = grad;
    this.bctx.fillRect(bx - 10, by - 10, 20, 20);
  }

  // ---------- snapshot cloth ----------

  /** A picture of what is on screen now (the header stays live above it). */
  private async capture(): Promise<HTMLCanvasElement | null> {
    const { toCanvas, getFontEmbedCSS } = await import("html-to-image");
    this.fontCSS ??= getFontEmbedCSS(document.body).catch(() => "");
    const y = window.scrollY;
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = await toCanvas(document.body, {
      width: this.W,
      height: this.H,
      pixelRatio: this.dpr,
      fontEmbedCSS: await this.fontCSS,
      backgroundColor: bg && bg !== "rgba(0, 0, 0, 0)" ? bg : "#FDFBF7",
      style: { transform: `translateY(${-y}px)`, transformOrigin: "top left" },
      filter: (n) => !(n instanceof HTMLElement && (n.id === "siteHeader" || n.dataset.woven !== undefined || n.classList.contains("drawer-backdrop"))),
    });
    this.snapScroll = y;
    return canvas;
  }

  private async showSnapshot(capture: Promise<HTMLCanvasElement | null>) {
    const snap = await capture;
    if (!snap) return false;
    this.upload(0, this.tex.snap, snap);
    this.mode = 1;
    this.fade = 0;
    this.fading = false;
    this.wake();
    return true;
  }

  private async beginPull() {
    const p = this.press;
    if (!p) return;
    this.pulling = true;
    document.body.style.userSelect = "none";
    if (!(await this.showSnapshot(p.capture))) {
      this.pulling = false;
      this.press = null;
      document.body.style.userSelect = "";
      return;
    }
    if (!this.pulling) return; // released while capturing
    this.cloth.grab(p.x, p.y);
    this.lastPull = { x: p.x, y: p.y };
    navigator.vibrate?.(8);
    // the release after a pull must not click whatever is underneath
    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 600);
  }

  private endPull() {
    this.sound.rustle(0, true);
    this.pulling = false;
    this.press = null;
    this.cloth.release();
    document.body.style.userSelect = "";
    // let the cloth spring back, then return to the live page
    setTimeout(() => {
      if (!this.leaning) this.fading = true;
    }, 650);
  }

  private async leanIn(x: number, y: number) {
    if (this.mode === 1) return;
    if (!(await this.showSnapshot(this.capture().catch(() => null)))) return;
    this.leaning = true;
    this.zoomTarget = 3.4;
    this.zoomAt = { x, y };
    this.canvas.classList.add("woven-lean");
    this.stepBack.classList.add("on");
    window.getSelection()?.removeAllRanges();
  }

  private leanOut(instant = false) {
    if (!this.leaning) return;
    this.zoomTarget = 1;
    this.zoomAt = { x: this.W / 2, y: this.H / 2 };
    this.stepBack.classList.remove("on");
    this.canvas.classList.remove("woven-lean");
    if (instant) {
      this.zoom = 1;
      this.panX = this.panY = 0;
      this.leaning = false;
      this.mode = 0;
    }
  }

  private setZoom(z: number, sx: number, sy: number) {
    const bx = sx / this.zoom + this.panX, by = sy / this.zoom + this.panY;
    this.zoom = Math.min(6, Math.max(1, z));
    this.panX = bx - sx / this.zoom;
    this.panY = by - sy / this.zoom;
    this.clampPan();
  }

  private clampPan() {
    this.panX = Math.min(this.W - this.W / this.zoom, Math.max(0, this.panX));
    this.panY = Math.min(this.H - this.H / this.zoom, Math.max(0, this.panY));
  }

  // ---------- frame ----------

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;

    // zoom easing; once back at 1 the snapshot fades to the live page
    if (Math.abs(this.zoomTarget - this.zoom) > 0.002) {
      this.setZoom(this.zoom + (this.zoomTarget - this.zoom) * 0.16, this.zoomAt.x, this.zoomAt.y);
      this.wake();
    } else if (this.leaning && this.zoomTarget === 1) {
      this.leaning = false;
      this.fading = true;
    }
    if (this.fading) {
      this.fade = Math.min(1, this.fade + dt * 3.5);
      if (this.fade >= 1) {
        this.mode = 0;
        this.fading = false;
        this.fade = 0;
        this.zoom = 1;
        this.panX = this.panY = 0;
      }
      this.wake();
    }

    // weaving line
    if (this.phase === "weaving") {
      this.front += this.speed * dt;
      if (this.front > this.H + 4) {
        this.front = 1e6;
        this.phase = "idle";
      }
      this.wake();
    } else if (this.phase === "unravel") {
      this.front -= 2600 * dt;
      if (this.front <= -4) {
        this.front = -4;
        this.unravelDone?.();
        this.unravelDone = null;
      }
      this.wake();
    }
    this.updateShuttle(dt);

    // pause all work when nothing moves (saves battery); the last frame stays on screen
    if (now - this.active > 1600 && !this.pulling && this.mode === 0) return;

    // the mouse brushes the cloth lightly
    if (this.hover && !this.press && this.mode === 0) {
      this.cloth.grab(this.hover.x, this.hover.y);
      this.cloth.drag(this.hover.x, this.hover.y + 6);
    }
    this.cloth.step();
    if (this.hover && !this.press && this.mode === 0) this.cloth.release();

    // velvet nap relaxes slowly
    this.bctx.fillStyle = "rgba(128,128,0,0.02)";
    this.bctx.fillRect(0, 0, 96, 96);

    this.draw();
  };

  private updateShuttle(dt: number) {
    const on = (this.phase === "weaving" || this.phase === "unravel") && this.front > -2 && this.front < this.H + 2;
    this.shuttle.classList.toggle("on", on);
    this.weft.classList.toggle("on", on);
    if (!on) return;
    this.shuttleT += (dt / 0.22) * this.shuttleDir;
    if (this.shuttleT >= 1 || this.shuttleT <= 0) {
      this.shuttleT = Math.max(0, Math.min(1, this.shuttleT));
      this.shuttleDir *= -1;
      this.sound.clack();
    }
    const x = this.shuttleT * (this.W - 64);
    this.shuttle.style.transform = `translate(${x}px, ${this.front - 14}px) scaleX(${this.shuttleDir})`;
    this.weft.style.transform = `translate(0px, ${this.front - 1}px)`;
    this.weft.style.width = `${x + 32}px`;
  }

  private draw() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pos);
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.norm);
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.normal, gl.DYNAMIC_DRAW);
    this.upload(1, this.tex.brush, this.brush);
    gl.uniform1i(this.u("uMode"), this.mode);
    gl.uniform2f(this.u("uView"), this.W, this.H);
    gl.uniform2f(this.u("uPan"), this.panX, this.panY);
    gl.uniform1f(this.u("uZoom"), this.zoom);
    gl.uniform1f(this.u("uScroll"), this.mode === 1 ? this.snapScroll : window.scrollY);
    gl.uniform1f(this.u("uThread"), THREAD);
    gl.uniform1f(this.u("uFront"), this.front);
    gl.uniform1f(this.u("uTime"), this.time);
    gl.uniform1f(this.u("uFade"), this.fade);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
  }
}
