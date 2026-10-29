// A sheet of cloth stretched over the screen: a grid of points joined by springs (Verlet
// integration). The edges are held by the frame; a finger can grab and pull any point.
// Each fabric has its own weight, stiffness, springiness and memory for creases.

export type FabricKind = "cotton" | "velvet" | "silk" | "linen" | "brocade";

export type Fabric = {
  label: string;
  damping: number;      // how long it keeps moving (higher = keeps rippling)
  anchor: number;       // pull back toward its flat shape
  stiffness: number;    // how firmly neighbouring points hold their distance
  grabRadius: number;   // how wide an area the finger drags (px)
  depth: number;        // how far the pulled cloth lifts toward the viewer
  crease: number;       // how much of a pull is kept as a crease (linen)
  scrollWeight: number; // momentum when flicking: heavy cloth stops sooner
  sheen: number;
  pile: number;
  metal: number;
  slub: number;
  ripple: number;       // waves sent across the cloth when it feeds (scroll)
};

export const FABRICS: Record<FabricKind, Fabric> = {
  cotton: { label: "Cotton", damping: 0.9, anchor: 0.045, stiffness: 0.9, grabRadius: 90, depth: 70, crease: 0, scrollWeight: 0.93, sheen: 0.1, pile: 0, metal: 0, slub: 0.2, ripple: 0.5 },
  velvet: { label: "Velvet", damping: 0.82, anchor: 0.03, stiffness: 0.85, grabRadius: 130, depth: 110, crease: 0, scrollWeight: 0.86, sheen: 0.05, pile: 1, metal: 0, slub: 0, ripple: 0.25 },
  silk: { label: "Silk", damping: 0.975, anchor: 0.018, stiffness: 0.55, grabRadius: 150, depth: 60, crease: 0, scrollWeight: 0.965, sheen: 0.9, pile: 0, metal: 0, slub: 0, ripple: 1.2 },
  linen: { label: "Linen", damping: 0.84, anchor: 0.06, stiffness: 1, grabRadius: 70, depth: 50, crease: 0.55, scrollWeight: 0.9, sheen: 0.04, pile: 0, metal: 0, slub: 1, ripple: 0.35 },
  brocade: { label: "Brocade", damping: 0.8, anchor: 0.08, stiffness: 1, grabRadius: 80, depth: 35, crease: 0, scrollWeight: 0.88, sheen: 0.35, pile: 0, metal: 1, slub: 0, ripple: 0.2 },
};

export class Cloth {
  cols = 0;
  rows = 0;
  w = 0;
  h = 0;
  pos = new Float32Array(0);    // x, y, z
  prev = new Float32Array(0);
  rest = new Float32Array(0);   // x, y (flat shape; linen creases move this a little)
  home = new Float32Array(0);   // original flat shape
  normal = new Float32Array(0);
  pinned = new Uint8Array(0);
  rest2 = 0;                    // rest spacing squared, per axis
  dx = 0;
  dy = 0;
  fabric: Fabric = FABRICS.cotton;
  private grabbed: { cx: number; cy: number; tx: number; ty: number } | null = null;

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    // ~14 px between points on phones, a little coarser on big screens
    this.cols = Math.max(24, Math.min(72, Math.round(w / 14)));
    this.rows = Math.max(32, Math.min(96, Math.round(h / 14)));
    const n = (this.cols + 1) * (this.rows + 1);
    this.pos = new Float32Array(n * 3);
    this.prev = new Float32Array(n * 3);
    this.rest = new Float32Array(n * 2);
    this.home = new Float32Array(n * 2);
    this.normal = new Float32Array(n * 3);
    this.pinned = new Uint8Array(n);
    this.dx = w / this.cols;
    this.dy = h / this.rows;
    for (let j = 0; j <= this.rows; j++)
      for (let i = 0; i <= this.cols; i++) {
        const k = j * (this.cols + 1) + i;
        const x = i * this.dx;
        const y = j * this.dy;
        this.pos.set([x, y, 0], k * 3);
        this.prev.set([x, y, 0], k * 3);
        this.rest.set([x, y], k * 2);
        this.home.set([x, y], k * 2);
        this.pinned[k] = i === 0 || j === 0 || i === this.cols || j === this.rows ? 1 : 0;
      }
    this.computeNormals();
  }

  /** Index buffer for the triangle mesh. */
  indices() {
    const out: number[] = [];
    const c = this.cols + 1;
    for (let j = 0; j < this.rows; j++)
      for (let i = 0; i < this.cols; i++) {
        const a = j * c + i;
        out.push(a, a + 1, a + c, a + 1, a + c + 1, a + c);
      }
    return new Uint32Array(out);
  }

  grab(x: number, y: number) {
    this.grabbed = { cx: x, cy: y, tx: x, ty: y };
  }
  drag(x: number, y: number) {
    if (this.grabbed) {
      this.grabbed.tx = x;
      this.grabbed.ty = y;
    }
  }
  release() {
    this.grabbed = null;
  }

  /** A wave travelling down the cloth, used when the cloth feeds through the loom. */
  ripple(strength: number) {
    const amp = strength * this.fabric.ripple;
    if (!amp) return;
    const c = this.cols + 1;
    for (let j = 1; j < this.rows; j++)
      for (let i = 1; i < this.cols; i++) {
        const k = j * c + i;
        this.pos[k * 3 + 2]! += Math.sin(j * 0.45 + i * 0.08) * amp;
      }
  }

  step() {
    const f = this.fabric;
    const c = this.cols + 1;
    const n = c * (this.rows + 1);
    const g = this.grabbed;
    for (let k = 0; k < n; k++) {
      if (this.pinned[k]) continue;
      const p = k * 3;
      for (let a = 0; a < 3; a++) {
        const cur = this.pos[p + a]!;
        const v = (cur - this.prev[p + a]!) * f.damping;
        this.prev[p + a] = cur;
        this.pos[p + a] = cur + v;
      }
      // spring back toward the flat shape
      const rx = this.rest[k * 2]!, ry = this.rest[k * 2 + 1]!;
      this.pos[p] = this.pos[p]! + (rx - this.pos[p]!) * f.anchor;
      this.pos[p + 1] = this.pos[p + 1]! + (ry - this.pos[p + 1]!) * f.anchor;
      this.pos[p + 2] = this.pos[p + 2]! * (1 - f.anchor * 1.5);
      // finger pull: points near the grab spot follow the finger, falling off with distance
      if (g) {
        const hx = this.home[k * 2]!, hy = this.home[k * 2 + 1]!;
        const d = Math.hypot(hx - g.cx, hy - g.cy);
        if (d < f.grabRadius) {
          // smooth bell-shaped falloff, and a limited reach so the cloth stretches rather than folds over
          const q = 1 - d / f.grabRadius;
          const w = q * q * (3 - 2 * q);
          let ox = g.tx - g.cx, oy = g.ty - g.cy;
          const reach = Math.hypot(ox, oy);
          const max = f.grabRadius * 0.55;
          if (reach > max) { ox *= max / reach; oy *= max / reach; }
          const pull = Math.min(1, reach / 160);
          this.pos[p] = this.pos[p]! + (hx + ox * w - this.pos[p]!) * 0.22 * w;
          this.pos[p + 1] = this.pos[p + 1]! + (hy + oy * w - this.pos[p + 1]!) * 0.22 * w;
          this.pos[p + 2] = this.pos[p + 2]! + (-f.depth * w * (0.35 + pull) - this.pos[p + 2]!) * 0.25 * w;
        }
      }
    }
    // keep neighbours at their spacing (structural springs); compression buckles into z
    for (let it = 0; it < 3; it++) {
      for (let j = 0; j <= this.rows; j++)
        for (let i = 0; i <= this.cols; i++) {
          const k = j * c + i;
          if (i < this.cols) this.link(k, k + 1, this.dx, f.stiffness);
          if (j < this.rows) this.link(k, k + c, this.dy, f.stiffness);
        }
    }
    // linen keeps a little of a strong pull as a crease, then slowly relaxes
    if (f.crease > 0) {
      for (let k = 0; k < n; k++) {
        if (this.pinned[k]) continue;
        const p = k * 3, r = k * 2;
        const strain = Math.abs(this.pos[p + 2]!);
        if (strain > 18) {
          this.rest[r] = this.rest[r]! + (this.pos[p]! - this.rest[r]!) * 0.02 * f.crease;
          this.rest[r + 1] = this.rest[r + 1]! + (this.pos[p + 1]! - this.rest[r + 1]!) * 0.02 * f.crease;
        }
        this.rest[r] = this.rest[r]! + (this.home[r]! - this.rest[r]!) * 0.006;
        this.rest[r + 1] = this.rest[r + 1]! + (this.home[r + 1]! - this.rest[r + 1]!) * 0.006;
      }
    } else {
      this.rest.set(this.home);
    }
    this.computeNormals();
  }

  private link(a: number, b: number, len: number, stiff: number) {
    const pa = a * 3, pb = b * 3;
    const dx = this.pos[pb]! - this.pos[pa]!;
    const dy = this.pos[pb + 1]! - this.pos[pa + 1]!;
    const dz = this.pos[pb + 2]! - this.pos[pa + 2]!;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const diff = ((d - len) / d) * 0.5 * stiff;
    const wa = this.pinned[a] ? 0 : 1, wb = this.pinned[b] ? 0 : 1;
    const s = wa + wb;
    if (!s) return;
    const ka = (wa / s) * 2, kb = (wb / s) * 2;
    this.pos[pa] = this.pos[pa]! + dx * diff * ka;
    this.pos[pa + 1] = this.pos[pa + 1]! + dy * diff * ka;
    this.pos[pa + 2] = this.pos[pa + 2]! + dz * diff * ka;
    this.pos[pb] = this.pos[pb]! - dx * diff * kb;
    this.pos[pb + 1] = this.pos[pb + 1]! - dy * diff * kb;
    this.pos[pb + 2] = this.pos[pb + 2]! - dz * diff * kb;
    // when squashed, nudge sideways in depth so it wrinkles instead of overlapping
    if (d < len * 0.92) {
      const kick = (len - d) * 0.25;
      if (wa) this.pos[pa + 2] = this.pos[pa + 2]! - kick;
      if (wb) this.pos[pb + 2] = this.pos[pb + 2]! - kick * 0.6;
    }
  }

  computeNormals() {
    const c = this.cols + 1;
    for (let j = 0; j <= this.rows; j++)
      for (let i = 0; i <= this.cols; i++) {
        const k = j * c + i;
        const l = j * c + Math.max(0, i - 1), r = j * c + Math.min(this.cols, i + 1);
        const u = Math.max(0, j - 1) * c + i, d = Math.min(this.rows, j + 1) * c + i;
        const ax = this.pos[r * 3]! - this.pos[l * 3]!, ay = this.pos[r * 3 + 1]! - this.pos[l * 3 + 1]!, az = this.pos[r * 3 + 2]! - this.pos[l * 3 + 2]!;
        const bx = this.pos[d * 3]! - this.pos[u * 3]!, by = this.pos[d * 3 + 1]! - this.pos[u * 3 + 1]!, bz = this.pos[d * 3 + 2]! - this.pos[u * 3 + 2]!;
        // cross(b, a) so a flat sheet faces the viewer (+z)
        let nx = by * az - bz * ay, ny = bz * ax - bx * az, nz = bx * ay - by * ax;
        nz = -nz; nx = -nx; ny = -ny;
        const len = Math.hypot(nx, ny, nz) || 1;
        this.normal[k * 3] = nx / len;
        this.normal[k * 3 + 1] = ny / len;
        this.normal[k * 3 + 2] = Math.abs(nz / len);
      }
  }
}
