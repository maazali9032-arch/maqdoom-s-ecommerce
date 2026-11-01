// A piece of real-feeling cloth in a canvas. Used two ways:
// - the Fabric Studio panel: a woven fabric picture to touch and pull, with "Look closer";
// - the home hero: a picture of the hero itself, pulled like cloth while a finger holds it.
// Let go and it springs back.

import { Cloth, FABRICS, type FabricKind } from "./cloth";
import { VERT, FRAG } from "./shaders";
import { paintSwatch } from "./swatches";

export class FabricStudio {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  private buf: { pos: WebGLBuffer; norm: WebGLBuffer; rest: WebGLBuffer; idx: WebGLBuffer };
  private snap: WebGLTexture;
  private count = 0;
  private cloth = new Cloth();
  private kind: FabricKind = "brocade";
  private W = 0;
  private H = 0;
  private dpr = 1;
  private raf = 0;
  private time = 0;
  private last = performance.now();
  private active = performance.now();
  private pointer: { id: number; x: number; y: number } | null = null;
  private zoom = 1;
  private zoomTarget = 1;
  private panX = 0;
  private panY = 0;
  private ro: ResizeObserver;
  private off: (() => void)[] = [];
  /** Called the first time the visitor touches the cloth (to hide the hint). */
  onTouch: (() => void) | null = null;
  /** Called once the cloth has sprung back after being let go. */
  onSettle: (() => void) | null = null;
  private picture: HTMLCanvasElement | null = null;
  private thread: number;
  private releasedAt = 0;

  constructor(private canvas: HTMLCanvasElement, opts: { thread?: number } = {}) {
    this.thread = opts.thread ?? 3.4;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.prog = this.program();
    gl.bindVertexArray(gl.createVertexArray());
    this.buf = { pos: gl.createBuffer()!, norm: gl.createBuffer()!, rest: gl.createBuffer()!, idx: gl.createBuffer()! };
    this.attrib(this.buf.pos, "aPos", 3);
    this.attrib(this.buf.norm, "aNormal", 3);
    this.attrib(this.buf.rest, "aRest", 2);
    this.snap = this.texture(0, [128, 128, 128, 255]);
    this.texture(1, [128, 128, 0, 255]); // flat nap: no velvet brushing
    gl.uniform1i(this.u("uSnap"), 0);
    gl.uniform1i(this.u("uBrush"), 1);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.listen();
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  setFabric(kind: FabricKind) {
    this.kind = kind;
    this.cloth.fabric = FABRICS[kind];
    this.paint();
    this.cloth.ripple(3); // a little wave so the new cloth settles in
    this.wake();
  }

  /** Use a picture (e.g. the hero) as the cloth instead of a woven fabric swatch. */
  setPicture(pic: HTMLCanvasElement, kind: FabricKind = "silk") {
    this.picture = pic;
    this.kind = kind;
    this.cloth.fabric = FABRICS[kind];
    this.paint();
    this.wake();
  }

  /** Start pulling from a finger that is already down (the hold began on the page). */
  pullFrom(pointerId: number, clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    this.pointer = { id: pointerId, x, y };
    this.releasedAt = 0;
    this.cloth.grab(x, y);
    this.cloth.drag(x, y);
    navigator.vibrate?.(8);
    this.wake();
  }

  /** Lean in to see the threads, or step back. */
  setCloser(on: boolean) {
    this.zoomTarget = on ? 3.2 : 1;
    if (on) {
      this.panX = this.W / 2 - this.W / 2 / 3.2;
      this.panY = this.H / 2 - this.H / 2 / 3.2;
    }
    this.wake();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    for (const f of this.off) f();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  // ---------- setup ----------

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

  private texture(unit: number, px: number[]) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(px));
    return t;
  }

  private paint() {
    if (!this.W) return;
    const gl = this.gl;
    const pic = this.picture ?? paintSwatch(this.kind, Math.round(this.W * this.dpr), Math.round(this.H * this.dpr));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.snap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic);
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const gl = this.gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.W = rect.width;
    this.H = rect.height;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.cloth.resize(this.W, this.H);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.rest);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.cloth.home), gl.STATIC_DRAW);
    const idx = this.cloth.indices();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf.idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.count = idx.length;
    this.paint();
    this.wake();
  }

  private wake() {
    this.active = performance.now();
  }

  // ---------- input: press on the cloth; moves and release are followed anywhere ----------

  private listen() {
    const c = this.canvas;
    const on = <K extends keyof HTMLElementEventMap>(t: K, f: (e: HTMLElementEventMap[K]) => void) => {
      c.addEventListener(t, f as EventListener);
      this.off.push(() => c.removeEventListener(t, f as EventListener));
    };
    const onWin = <K extends keyof WindowEventMap>(t: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
      window.addEventListener(t, f as EventListener, o);
      this.off.push(() => window.removeEventListener(t, f as EventListener, o));
    };
    // no page scrolling while the cloth is held
    onWin("touchmove", (e) => {
      if (this.pointer) e.preventDefault();
    }, { passive: false });
    const local = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    on("pointerdown", (e) => {
      if (this.pointer) return;
      e.preventDefault();
      try {
        c.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      const p = local(e);
      this.pointer = { id: e.pointerId, ...p };
      this.onTouch?.();
      this.onTouch = null;
      if (this.zoomTarget === 1) this.cloth.grab(p.x, p.y);
      navigator.vibrate?.(6);
      this.wake();
    });
    onWin("pointermove", (e) => {
      const p = this.pointer;
      if (!p || p.id !== e.pointerId) return;
      const q = local(e);
      if (this.zoomTarget > 1) {
        // looking closer: drag to move around
        this.panX -= (q.x - p.x) / this.zoom;
        this.panY -= (q.y - p.y) / this.zoom;
        this.clampPan();
      } else {
        this.cloth.drag(q.x, q.y);
      }
      p.x = q.x;
      p.y = q.y;
      this.wake();
    });
    const up = (e: PointerEvent) => {
      if (this.pointer?.id !== e.pointerId) return;
      this.pointer = null;
      this.releasedAt = performance.now();
      this.cloth.release();
      this.wake();
    };
    onWin("pointerup", up);
    onWin("pointercancel", up);
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

    if (Math.abs(this.zoomTarget - this.zoom) > 0.002) {
      const cx = this.W / 2, cy = this.H / 2;
      const bx = cx / this.zoom + this.panX, by = cy / this.zoom + this.panY;
      this.zoom += (this.zoomTarget - this.zoom) * 0.14;
      this.panX = bx - cx / this.zoom;
      this.panY = by - cy / this.zoom;
      this.clampPan();
      this.wake();
    }

    // rest when nothing moves (saves battery); the last frame stays on screen
    if (this.releasedAt && now - this.releasedAt > 750 && this.onSettle) {
      const f = this.onSettle;
      this.onSettle = null;
      f();
    }
    if (now - this.active > 1800 && !this.pointer) return;
    this.cloth.step();
    this.draw();
  };

  private draw() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.pos);
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf.norm);
    gl.bufferData(gl.ARRAY_BUFFER, this.cloth.normal, gl.DYNAMIC_DRAW);
    gl.uniform1i(this.u("uMode"), 1);
    gl.uniform2f(this.u("uView"), this.W, this.H);
    gl.uniform2f(this.u("uPan"), this.panX, this.panY);
    gl.uniform1f(this.u("uZoom"), this.zoom);
    gl.uniform1f(this.u("uScroll"), 0);
    gl.uniform1f(this.u("uThread"), this.thread);
    gl.uniform1f(this.u("uFront"), 1e6);
    gl.uniform1f(this.u("uTime"), this.time);
    gl.uniform1f(this.u("uFade"), 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
  }
}
