// Woven look over one section (the home hero): a twill thread relief drawn as light/dark tint on
// top of the real content, which stays sharp, readable and clickable underneath. The canvas is
// placed over the section from outside it (React owns the section), scrolls with the page, and
// only redraws when weaving in or resizing.

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uView;     // CSS px
uniform float uDpr;
uniform float uScroll;  // page scroll, so threads travel with the page
uniform float uFront;   // weaving line (CSS px from top); below it the loom is still bare
uniform float uThread;

const vec3 L = normalize(vec3(-0.1, -0.35, 0.93));
const float PI = 3.14159265;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 strand(float across, float along, vec2 dir) {
  float x = (across - 0.5) / 0.42;
  if (abs(x) > 1.0) return vec2(0.82, 0.0);
  float h = sqrt(1.0 - x * x);
  float dip = 0.72 + 0.28 * sin(PI * along);
  vec2 side = vec2(-dir.y, dir.x);
  vec3 n = normalize(vec3(side * x * 0.9, h * dip + 0.15));
  float diff = max(dot(n, L), 0.0);
  vec3 H = normalize(L + vec3(0, 0, 1));
  float th = dot(normalize(vec3(dir, 0.0)), H);
  float spec = pow(sqrt(max(0.0, 1.0 - th * th)), 30.0) * 0.18;
  return vec2((0.6 + diff * 0.55) * (0.78 + 0.22 * h * dip), spec);
}

void main() {
  vec2 screen = vec2(gl_FragCoord.x, uView.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 page = vec2(screen.x, screen.y + uScroll);
  float t = uThread;

  if (screen.y > uFront) {
    // bare loom: warp threads over a dark backing, just ahead of the weaving line
    vec2 cp = page / t;
    float on = mod(floor(cp.x), 2.0);
    vec2 s = strand(fract(cp.x), fract(page.y / (t * 6.0)), vec2(0, 1));
    vec3 warp = vec3(0.90, 0.86, 0.78) * s.x + s.y;
    outColor = vec4(mix(vec3(0.09, 0.08, 0.07), warp, on), 1.0);
    return;
  }

  // twill: warp over two, under one
  vec2 cp = page / t;
  vec2 cell = floor(cp), f = fract(cp);
  bool warpTop = mod(cell.x + cell.y, 3.0) < 2.0;
  vec2 s = warpTop
    ? strand(f.x, fract((cell.y + f.y) / 2.0 + hash(vec2(cell.x, 1.0))), vec2(0, 1))
    : strand(f.y, fract((cell.x + f.x) / 2.0 + hash(vec2(1.0, cell.y))), vec2(1, 0));
  float m = (s.x - 0.9) * 1.25 + s.y * 0.6 + (hash(cell) - 0.5) * 0.08;
  // the newest rows glow gold for a moment as they are woven
  float glow = smoothstep(26.0, 0.0, uFront - screen.y) * step(uFront, uView.y + 1.0);
  float a = clamp(abs(m), 0.0, 0.4);
  vec4 tint = m > 0.0 ? vec4(1.0, 0.97, 0.9, a) : vec4(0.05, 0.03, 0.02, a);
  outColor = mix(tint, vec4(0.85, 0.68, 0.33, 0.55), glow * 0.8);
}`;

export class WovenOverlay {
  private canvas = document.createElement("canvas");
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private W = 0;
  private H = 0;
  private dpr = 1;
  private front = 1e6;
  private weaving = false;
  private raf = 0;
  private dirty = true;
  private last = 0;
  private ro: ResizeObserver;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private host: HTMLElement) {
    const gl = this.canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.canvas.className = "woven-overlay";
    this.canvas.dataset.woven = "";
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(this.canvas);

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
    gl.useProgram(p);
    this.prog = p;
    for (const n of ["uView", "uDpr", "uScroll", "uFront", "uThread"]) this.u[n] = gl.getUniformLocation(p, n);
    gl.bindVertexArray(gl.createVertexArray());
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.ro.observe(document.body);
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Weave the section in from the top (fast; never blocks the page). */
  weaveIn() {
    if (this.reduced) return;
    this.front = -4;
    this.weaving = true;
    this.last = performance.now();
  }

  /** Hide while the hero is being pulled (the cloth shows its own weave). */
  setHidden(hidden: boolean) {
    this.canvas.style.opacity = hidden ? "0" : "";
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.remove();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  private resize() {
    const r = this.host.getBoundingClientRect();
    placeOver(this.canvas, r);
    this.dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 860 ? 1.25 : 1.5);
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.dirty = true;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (this.weaving) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.front += 1500 * dt;
      if (this.front > this.H + 30) {
        this.front = 1e6;
        this.weaving = false;
      }
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uView!, this.W, this.H);
    gl.uniform1f(this.u.uDpr!, this.dpr);
    gl.uniform1f(this.u.uScroll!, 0);
    gl.uniform1f(this.u.uFront!, this.front);
    gl.uniform1f(this.u.uThread!, this.W < 860 ? 2.6 : 2.4);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

/** Put a page-level canvas exactly over an element (absolute, so it scrolls with the page). */
export function placeOver(el: HTMLElement, r: DOMRect) {
  el.style.left = `${r.left + window.scrollX}px`;
  el.style.top = `${r.top + window.scrollY}px`;
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
}
