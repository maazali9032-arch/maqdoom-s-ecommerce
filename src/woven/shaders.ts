// Woven Mode shaders. Midday light only.
// Mode 0 (texture): velvet thread relief drawn as light/dark tint over the live website, which
//   stays sharp and clickable underneath. Rows not yet woven show bare loom threads.
// Mode 1 (snapshot): a picture of the screen woven into cloth that can be pulled and zoomed into.

export const VERT = /* glsl */ `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec2 aRest;
uniform vec2 uView;
uniform vec2 uPan;
uniform float uZoom;
out vec2 vRest;
out vec3 vNormal;
out vec2 vScreen;
void main() {
  vec2 c = uView * 0.5;
  vec2 p = c + (aPos.xy - c) * (1100.0 / (1100.0 + aPos.z));
  vec2 s = (p - uPan) * uZoom;
  vScreen = s / uView;
  vRest = aRest;
  vNormal = aNormal;
  gl_Position = vec4(s.x / uView.x * 2.0 - 1.0, 1.0 - s.y / uView.y * 2.0, 0.0, 1.0);
}`;

export const FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vRest;
in vec3 vNormal;
in vec2 vScreen;
out vec4 outColor;

uniform int uMode;            // 0 texture over the live page, 1 woven snapshot
uniform sampler2D uSnap;      // screen snapshot (mode 1)
uniform sampler2D uBrush;     // velvet nap direction brushed by the pointer
uniform vec2 uView;
uniform float uScroll;        // page scroll (CSS px) so threads travel with the page
uniform float uThread;        // thread width in CSS px
uniform float uZoom;
uniform float uFront;         // weaving line on screen (CSS px); below it the loom is bare
uniform float uTime;
uniform float uFade;          // mode 1: fade back to the live page

const vec3 L = normalize(vec3(-0.1, -0.35, 0.93));   // midday, true colour
const vec3 LC = vec3(1.0, 0.99, 0.96);
const float AMB = 0.6;
const float PI = 3.14159265;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Shading of one round strand: returns brightness factor (about 0..1.3) and a highlight.
vec2 strand(float across, float along, vec2 dir, float gloss, float detail) {
  float x = (across - 0.5) / 0.4;
  if (abs(x) > 1.0) return vec2(mix(0.85, 0.25, detail), 0.0);
  float h = sqrt(1.0 - x * x);
  float dip = 0.72 + 0.28 * sin(PI * along);
  vec2 side = vec2(-dir.y, dir.x);
  vec3 n = normalize(vec3(side * x * 0.9, h * dip + 0.15) + vec3(vNormal.xy * 0.8, 0.0));
  float diff = max(dot(n, L), 0.0);
  vec3 H = normalize(L + vec3(0, 0, 1));
  float th = dot(normalize(vec3(dir, 0.0)), H);
  float spec = pow(sqrt(max(0.0, 1.0 - th * th)), 22.0 + gloss * 80.0) * (0.12 + gloss);
  float relief = mix(0.18, 0.45, detail);
  return vec2((AMB + diff * 0.55) * (1.0 - relief + relief * h * dip), spec * mix(0.35, 1.0, detail));
}

// Bare loom: warp threads over a dark backing.
vec3 bareLoom(vec2 page, float t) {
  vec2 cp = page / t;
  vec2 cell = floor(cp), f = fract(cp);
  float sway = sin(uTime * 1.3 + cell.x * 0.7) * 0.06;
  vec2 s = strand(fract(f.x + sway), fract(page.y / (t * 6.0)), vec2(0, 1), 0.1, 1.0);
  vec3 warp = vec3(0.90, 0.86, 0.78) * s.x + s.y * 0.3;
  return mod(cell.x, 2.0) < 1.0 ? warp : vec3(0.09, 0.08, 0.07);
}

void main() {
  vec2 screen = vRest;                                   // CSS px on screen (rest position)
  vec2 page = vec2(screen.x, screen.y + uScroll);
  float t = uThread;
  float detail = clamp((t * uZoom - 2.4) / 5.0, 0.0, 1.0);

  // Not yet woven (opening / changing page): opaque bare loom below the weaving line.
  if (screen.y > uFront) {
    vec3 loom = bareLoom(page, max(t, 2.6));
    float tail = step(hash(vec2(floor(page.y / t), 3.0)), 0.5) * step(screen.y - uFront, 16.0) *
                 step(screen.x, hash(vec2(floor(page.y / t), 7.0)) * 260.0);
    outColor = vec4(mix(loom, vec3(0.70, 0.55, 0.30), tail * 0.8), 1.0);
    return;
  }

  // Twill weave: warp (vertical) on top two of three crossings.
  vec2 cp = page / t;
  vec2 cell = floor(cp), f = fract(cp);
  bool warpTop = mod(cell.x + cell.y, 3.0) < 2.0;
  vec2 s = warpTop
    ? strand(f.x, fract((cell.y + f.y) / 2.0 + hash(vec2(cell.x, 1.0))), vec2(0, 1), 0.05, detail)
    : strand(f.y, fract((cell.x + f.x) / 2.0 + hash(vec2(1.0, cell.y))), vec2(1, 0), 0.08, detail);

  // Velvet: short upright fibres, and a nap that changes shade where it is brushed.
  vec2 nap = texture(uBrush, vScreen).rg * 2.0 - 1.0;
  float fuzz = noise(page * 2.6 / t) * 0.6 + noise(page * 7.0 / t) * 0.4;
  float napShade = dot(nap, L.xy) * 0.55 - length(nap) * 0.12;
  float fold = dot(normalize(vNormal), L) - L.z;               // folds from the cloth simulation
  float rim = pow(1.0 - abs(normalize(vNormal).z), 2.0);         // velvet glows at folds

  if (uMode == 0) {
    // Tint only: brighten or darken the real page underneath.
    float m = (s.x - 0.9) * 0.55 + s.y * 0.25 + (fuzz - 0.5) * 0.22 + napShade * 0.9 + fold * 1.4 + rim * 0.35;
    float a = clamp(abs(m), 0.0, 0.55);
    outColor = m > 0.0 ? vec4(1.0, 0.97, 0.9, a) : vec4(0.05, 0.03, 0.02, a);
    return;
  }

  // Snapshot cloth: weave the picture itself.
  vec2 cellCenter = (cell + 0.5) * t;
  vec2 snapUV = screen / uView;
  vec3 picture = texture(uSnap, snapUV).rgb;
  vec3 wool = texture(uSnap, (cellCenter - vec2(0.0, uScroll)) / uView).rgb;   // one colour per crossing
  // gold = warm and bright: woven as long glossy floats
  float gold = smoothstep(0.35, 0.7, dot(wool, vec3(0.3, 0.59, 0.11))) * clamp(((wool.r + wool.g) * 0.5 - wool.b - 0.06) * 5.0, 0.0, 1.0);
  if (gold > 0.5) {
    bool weft = mod(cell.x * 2.0 + cell.y, 5.0) > 0.5;
    s = weft ? strand(f.y, fract((cell.x + f.x) / 4.0), vec2(1, 0), 0.9, detail) : s;
  }
  float clothDiff = max(dot(normalize(vNormal), L), 0.0);
  vec3 woven = wool * (s.x + (fuzz - 0.5) * 0.25 * (1.0 - gold) + napShade) + s.y * mix(LC, wool * 1.6, gold);
  woven += rim * wool * 0.6;
  vec3 crisp = picture * (0.72 + 0.38 * clothDiff);
  float vis = mix(0.45, 1.0, detail);
  vec3 col = mix(crisp, woven, vis);
  outColor = vec4(col, 1.0 - uFade);
}`;
