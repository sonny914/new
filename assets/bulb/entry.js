/* Quiet Bands · Bulb Entry · runtime
   A wireframe lightbulb on near-black. Scroll is one progress value t (0..1); every pose is a pure function of t
   (map.js), so the sequence reverses by construction. Tilt and pointer come from the lab's spatial engine, unchanged.
   Gate 2: whole bulb, cracks growing across the glass from the impact point, rotation about the vertical axis.
   Gate 3: separation along the cracks, the four fragments settling into the nav at distinct depths with a label
   each, tilt parallax and a slow drift on the settled fragments, and the debris as GPU points whose hue shifts
   with the same view input. Selection (camera to fragment, then the section) is Gate 4. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpatialEngine } from '/assets/lab/spatial-engine.js';
import { poseAt, labelAt, settledAt, SEPARATION } from './map.js';
export { poseAt, labelAt, MAP, ROTATION, seg } from './map.js';

export const GROUND = 0x000000;      // brand black
export const LINE = 0xF2EEE5;        // brand cream: the wireframe on the glass, the labels, the rim light
export const LINE_NEAR = 0xF2EEE5;
export const LIVE = 0xFF5A00;        // brand orange: the light inside the fracture, and nothing else
export const WIRE_ALPHA = 0.62;      // the cream grid sits on the glass as a sparse drawing, not a cage: the glass carries the form
/* The broken edge has a body. At every cut a 45° chamfer drops from the surface (CHAMFER deep and wide) and a straight
   inner wall runs below it to CUT_DEPTH; both are the same dark glass as the shell, with no emission. The light is a
   band of unlit orange inside the piece, only ever seen through glass: it lies under the surface along the crack
   (STRIP_DEPTH below it) and is graded across its width, dim at the lip (STRIP_IN0), full a little way in (STRIP_PEAK),
   gone deeper in (STRIP_IN1), so it reads as light bleeding from the fracture into the thickness rather than a rim. A
   short riser at the peak faces the cut, so the wall shows it from the side. It sits inside the silhouette, not on it.
   The crack path on the surface is untouched. */
export const CHAMFER = 0.008, CUT_DEPTH = 0.030;
export const STRIP_DEPTH = 0.017, STRIP_IN0 = 0.004, STRIP_PEAK = 0.014, STRIP_IN1 = 0.048, RISER = 0.006;
export const STRIP_LIP = 0.30;       // the band's strength at the lip, so the perimeter stays dark
export const STRIP_REST = 1.0, STRIP_LIVE = 1.6;   // the strip's orange, as a multiple of brand orange: through smoked glass it lands below full; hover or touch pushes it past
/* The glass: physically based, transmissive, smoked. One material, cloned per fragment so a piece can fade on its own.
   Thickness is the volume the refraction sees; attenuation is the smoke. Clearcoat is the polish. Dark tint, no colour. */
export const GLASS = {
  color: 0x8C8780, roughness: 0.06, metalness: 0, transmission: 1, ior: 1.5, thickness: 0.16,
  attenuationColor: 0x1E1B18, attenuationDistance: 0.7, clearcoat: 0.35, clearcoatRoughness: 0.08,
  envMapIntensity: 1.0, specularIntensity: 1.0,
};
/* The unbroken envelope, for the whole bulb at rest: the same profile the bake lathes (tools/bulb.py glass_profile),
   revolved at runtime so the baked meshes stay byte for byte what they were. r against height, y up. */
export const LAT_STEP = 10, LONGS = 24, NECK_Y = -1.55, NECK_R = 0.36;
export function glassProfile() {
  const pts = [new THREE.Vector2(0, 1)];
  for (let lat = 90 - LAT_STEP; lat >= -30; lat -= LAT_STEP) { const a = THREE.MathUtils.degToRad(lat); pts.push(new THREE.Vector2(Math.cos(a), Math.sin(a))); }
  const r0 = Math.cos(THREE.MathUtils.degToRad(-30)), y0 = Math.sin(THREE.MathUtils.degToRad(-30));
  const smooth = (k) => k * k * (3 - 2 * k);
  for (let i = 1; i <= 8; i++) { const k = i / 8, e = Math.pow(smooth(k), 0.8); pts.push(new THREE.Vector2(r0 + (NECK_R - r0) * e, y0 + (NECK_Y - y0) * k)); }
  return pts;
}
export const IMPACT = { x: 0.42, y: 0.60, z: 0.86 };   // where the glass was struck: upper right on the face toward the viewer, so the crack at rest reads at 1x. Cracks grow from here.

/* The four settled poses (world units, y up; the camera looks down −z). Hand placed: distinct depths, no grid, no ring,
   each label on the side that has room. Portrait keeps the lower fifth of the window empty for the thumb. */
export const POSES = {
  portrait: [
    { p: [-0.55, 1.55, 0.9], r: [0.20, 0.60, -0.10], side: 'right' },
    { p: [0.75, 0.45, 0.3], r: [-0.30, -0.50, 0.20], side: 'left' },
    { p: [-0.62, -0.50, -0.9], r: [0.25, 0.30, 0.20], side: 'right' },
    { p: [0.85, -1.66, -0.6], r: [-0.20, 0.80, 0.10], side: 'left' },
  ],
  landscape: [
    { p: [-1.9, 0.9, 0.8], r: [0.20, 0.60, -0.10], side: 'left' },
    { p: [1.8, 0.7, 0.2], r: [-0.30, -0.50, 0.20], side: 'right' },
    { p: [-1.5, -1.0, -1.0], r: [0.40, 0.30, 0.30], side: 'left' },
    { p: [1.6, -0.9, -0.5], r: [-0.20, 0.80, 0.10], side: 'right' },
  ],
};
export const NAV_SCALE = { portrait: 0.55, landscape: 0.65 };   // a settled fragment is a nav piece, not the bulb: smaller, so four fit with air between
export const PARALLAX = 0.32;        // world units of sideways travel per unit of view for a fragment at the nearest depth
export const DRIFT = 0.028;          // world units of slow drift on a settled fragment
export const HOVER_MS = 180;         // the ease of a fragment coming forward under the pointer or the focus (Emil: ease-out, under 300 ms)
export const SELECT_MS = 480;        // the camera's move to a chosen fragment: on-screen movement, strong ease-in-out, retargetable

/** A CSS cubic-bezier as a function of progress, so canvas motion can use the same curves as the stylesheet. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (u) => ((ax * u + bx) * u + cx) * u, dX = (u) => (3 * ax * u + 2 * bx) * u + cx, Y = (u) => ((ay * u + by) * u + cy) * u;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) { const d = dX(u); if (Math.abs(d) < 1e-6) break; const e = X(u) - x; if (Math.abs(e) < 1e-6) return Y(u); u -= e / d; }
    let lo = 0, hi = 1; u = x;
    while (hi - lo > 1e-6) { u = (lo + hi) / 2; if (X(u) < x) lo = u; else hi = u; }
    return Y(u);
  };
}
export const EASE_IN_OUT = bezier(0.77, 0, 0.175, 1);

/** Order crack segments by distance along the crack network from the impact point, so a draw range grows them outward.
    Pure: takes a flat position array of line segments (6 floats each), returns the same segments reordered. */
export function orderCracks(pos, origin) {
  const segs = [];
  for (let i = 0; i + 5 < pos.length; i += 6) segs.push([pos[i], pos[i + 1], pos[i + 2], pos[i + 3], pos[i + 4], pos[i + 5]]);
  const k = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const nodes = new Map();
  const nid = (x, y, z) => { const key = k(x, y, z); if (!nodes.has(key)) nodes.set(key, { x, y, z, adj: [] }); return nodes.get(key); };
  segs.forEach((s, n) => { const a = nid(s[0], s[1], s[2]), b = nid(s[3], s[4], s[5]); const len = Math.hypot(s[3] - s[0], s[4] - s[1], s[5] - s[2]); a.adj.push([b, len, n]); b.adj.push([a, len, n]); });
  const toOrigin = (nd) => Math.hypot(nd.x - origin.x, nd.y - origin.y, nd.z - origin.z);
  let start = null, best = Infinity;
  for (const nd of nodes.values()) { const d = toOrigin(nd); if (d < best) { best = d; start = nd; } }
  const dist = new Map(); const segDist = new Array(segs.length).fill(Infinity);
  const run = (s0, d0) => {
    dist.set(s0, d0); const open = [s0];
    while (open.length) {
      open.sort((a, b) => dist.get(a) - dist.get(b)); const u = open.shift(); const du = dist.get(u);
      for (const [v, len, n] of u.adj) { segDist[n] = Math.min(segDist[n], du); const dv = du + len; if (dv < (dist.get(v) ?? Infinity)) { dist.set(v, dv); if (!open.includes(v)) open.push(v); } }
    }
  };
  if (start) run(start, 0);
  for (const nd of nodes.values()) if (!dist.has(nd)) run(nd, toOrigin(nd) + 1.0);
  const order = segs.map((_, n) => n).sort((a, b) => segDist[a] - segDist[b]);
  const out = new Float32Array(pos.length);
  order.forEach((n, i) => { out.set(segs[n], i * 6); });
  return out;
}

/* ---------- the debris: one Points object, one shader. Position = seed + velocity × release; colour from the view angle. ---------- */
const POINT_VS = `
  attribute vec3 aVel; attribute float aSeed;
  uniform float uRelease; uniform float uSize; uniform float uRatio;
  varying float vSeed;
  void main() {
    vec3 p = position + aVel * uRelease * (0.85 + 0.5 * aSeed);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uRatio;
    vSeed = aSeed;
  }`;
const POINT_FS = `
  precision mediump float;
  uniform vec2 uView; uniform float uAlpha;
  varying float vSeed;
  vec3 hsv(float h, float s, float v) { vec3 k = vec3(1.0, 2.0 / 3.0, 1.0 / 3.0); vec3 p = abs(fract(vec3(h) + k) * 6.0 - 3.0); return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s); }
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float m = clamp(length(uView), 0.0, 1.0);                       /* how far off head-on the view is */
    float hue = fract(atan(uView.y, uView.x) / 6.2831853 + vSeed * 1.7 + m * 0.35);
    vec3 foil = hsv(hue, 0.85, 1.0);
    vec3 rest = vec3(0.78, 0.75, 0.70);                             /* cream-grey: what the foil is when you look straight at it */
    vec3 col = mix(rest, foil, smoothstep(0.06, 0.55, m));
    gl_FragColor = vec4(col, uAlpha * (0.72 + 0.28 * m));
  }`;

export function makeDebris(seedGeometry, count) {
  const src = seedGeometry.attributes.position.array;
  const n = Math.min(count, src.length / 3);
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), seed = new Float32Array(n);
  let s = 12345;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < n; i++) {
    const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2];
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    // outward from the bulb's axis, a little up, a little sideways: debris leaves the crack, it does not fall
    const r = Math.hypot(x, z) || 1;
    const ox = x / r, oz = z / r;
    const jx = (rnd() - 0.5) * 0.7, jy = (rnd() - 0.3) * 0.6, jz = (rnd() - 0.5) * 0.7;
    const speed = 0.35 + rnd() * 0.75;
    vel[i * 3] = (ox + jx) * speed; vel[i * 3 + 1] = (0.15 + jy) * speed; vel[i * 3 + 2] = (oz + jz) * speed;
    seed[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false,
    uniforms: { uRelease: { value: 0 }, uView: { value: new THREE.Vector2() }, uAlpha: { value: 0 }, uSize: { value: 1.6 }, uRatio: { value: 1 } },
  });
  const points = new THREE.Points(g, m); points.frustumCulled = false; points.visible = false;
  return points;
}

/* ---------- the light: an environment nobody sees, three cream emitters on black, prefiltered once ----------
   A tall narrow strip upper left toward the viewer gives the long rim highlight; a wide low strip behind and to the right
   gives the far edge its line; a small patch above fills the top of the dome. The background stays black: the environment
   is reflected by the glass and drawn nowhere. */
export function makeEnvironment(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const emit = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(LINE).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  emit(0.5, 8, -5, 2, 3, 2.2);      // key: thin and tall, so its reflection is a line, not a patch
  emit(7, 0.45, 4, -1, -4, 1.1);    // rim, behind right, low: the far edge
  emit(1, 1, 0, 7, 1, 0.5);         // a small patch above: the crown of the dome
  const tex = pm.fromScene(env, 0.03).texture;
  pm.dispose(); env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

/** Take a fragment apart into what the pass needs. The bake gave every open edge a strip 0.022 inward; here that strip
    is dropped and the cut rebuilt from the surface's own boundary: a chamfer, then a wall, both hung from the crack path
    on the surface, which does not move. The neck ring is glass meeting the base, not a break: no wall there. Pure.
    @returns {{ surface, grid, cut, strip }} four BufferGeometries: the glass faces, the cream lines (which end at the cut),
    the cut's chamfer and wall as one dark glass piece, and the orange strip set back inside it. */
export function buildCut(geo, home, neckY) {
  const P = geo.attributes.position.array, I = geo.index.array, nv = P.length / 3;
  const prof = glassProfile();
  const distToProfile = (r, y) => {                                     // distance in the (radius, height) plane to the lathe profile
    let best = Infinity;
    for (let i = 1; i < prof.length; i++) {
      const ax = prof[i - 1].x, ay = prof[i - 1].y, bx = prof[i].x, by = prof[i].y;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((r - ax) * dx + (y - ay) * dy) / L));
      best = Math.min(best, Math.hypot(r - (ax + t * dx), y - (ay + t * dy)));
    }
    return best;
  };
  const off = new Uint8Array(nv);                                      // 1: a vertex of the bake's rim strip, below the surface
  for (let v = 0; v < nv; v++) off[v] = distToProfile(Math.hypot(P[v * 3] + home.x, P[v * 3 + 2] + home.z), P[v * 3 + 1] + home.y) > 0.008 ? 1 : 0;
  const surfIdx = [];
  for (let i = 0; i < I.length; i += 3) if (!off[I[i]] && !off[I[i + 1]] && !off[I[i + 2]]) surfIdx.push(I[i], I[i + 1], I[i + 2]);
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', geo.attributes.position); surface.setIndex(surfIdx); surface.computeVertexNormals();
  const N = surface.attributes.normal.array;
  // the surface's open edges: each with its one face's third vertex, so the cut knows which way is into the piece
  const edges = new Map();
  const ek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  for (let i = 0; i < surfIdx.length; i += 3) for (let e = 0; e < 3; e++) {
    const a = surfIdx[i + e], b = surfIdx[i + (e + 1) % 3], c = surfIdx[i + (e + 2) % 3], key = ek(a, b);
    if (edges.has(key)) edges.delete(key); else edges.set(key, [a, b, c]);
  }
  const cut = [...edges.values()].filter(([a, b]) => !(P[a * 3 + 1] < neckY && P[b * 3 + 1] < neckY));   // the crack, not the neck ring
  // per cut vertex: an inward side (into the piece, along the surface), averaged over its two cut edges, so the strip is continuous
  const side = new Map(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _s = new THREE.Vector3();
  const at = (v, out) => out.set(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
  for (const [a, b, c] of cut) {
    at(a, _a); at(b, _b); at(c, _c);
    const dir = _b.clone().sub(_a).normalize();
    _s.copy(_c).sub(_a); _s.addScaledVector(dir, -_s.dot(dir));          // toward the third vertex, minus the along-edge part
    for (const v of [a, b]) {
      _n.set(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
      const t = _s.clone(); t.addScaledVector(_n, -t.dot(_n)).normalize();
      if (!side.has(v)) side.set(v, new THREE.Vector3()); side.get(v).add(t);
    }
  }
  for (const v of side.values()) v.normalize();
  // the strips: chamfer (surface → CHAMFER down and in) and wall (chamfer → CUT_DEPTH, straight down) as one glass piece;
  // the orange strip set back STRIP_IN inside it, STRIP_TOP to STRIP_BOT below the surface
  const cp = [], sp = [], sc = [];
  const at2 = (v, out, down, inward) => { at(v, out); _n.set(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); out.addScaledVector(_n, -down).addScaledVector(side.get(v), inward); return out; };
  const quad = (arr, p0, p1, p2, p3) => { arr.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z); };
  const A = new THREE.Vector3(), B = new THREE.Vector3(), A1 = new THREE.Vector3(), B1 = new THREE.Vector3(), A2 = new THREE.Vector3(), B2 = new THREE.Vector3();
  for (const [a, b] of cut) {
    at(a, A); at(b, B); at2(a, A1, CHAMFER, CHAMFER); at2(b, B1, CHAMFER, CHAMFER); at2(a, A2, CUT_DEPTH, CHAMFER); at2(b, B2, CUT_DEPTH, CHAMFER);
    quad(cp, A, B, B1, A1); quad(cp, A1, B1, B2, A2);
    const shade = (k0, k1, k2, k3) => { for (const k of [k0, k1, k2, k0, k2, k3]) sc.push(k, k, k); };
    at2(a, A1, STRIP_DEPTH, STRIP_IN0); at2(b, B1, STRIP_DEPTH, STRIP_IN0); at2(a, A2, STRIP_DEPTH, STRIP_PEAK); at2(b, B2, STRIP_DEPTH, STRIP_PEAK);
    quad(sp, A1, B1, B2, A2); shade(STRIP_LIP, STRIP_LIP, 1, 1);                                                     // the band: lip → peak
    at2(a, A1, STRIP_DEPTH, STRIP_PEAK); at2(b, B1, STRIP_DEPTH, STRIP_PEAK); at2(a, A2, STRIP_DEPTH, STRIP_IN1); at2(b, B2, STRIP_DEPTH, STRIP_IN1);
    quad(sp, A1, B1, B2, A2); shade(1, 1, 0, 0);                                                                     // peak → gone
    at2(a, A1, STRIP_DEPTH - RISER, STRIP_PEAK); at2(b, B1, STRIP_DEPTH - RISER, STRIP_PEAK); at2(a, A2, STRIP_DEPTH + RISER, STRIP_PEAK); at2(b, B2, STRIP_DEPTH + RISER, STRIP_PEAK);
    quad(sp, A1, B1, B2, A2); shade(0.7, 0.7, 0.7, 0.7);                                                             // the riser at the peak, facing the cut
  }
  const cutGeo = new THREE.BufferGeometry(); cutGeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cutGeo.computeVertexNormals();
  const strip = new THREE.BufferGeometry(); strip.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); strip.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  // the cream grid: the surface's edges, minus the crack itself (the lip is dark glass, not a line)
  const all = new THREE.EdgesGeometry(surface, 4);
  const pk = (v) => `${P[v * 3].toFixed(4)},${P[v * 3 + 1].toFixed(4)},${P[v * 3 + 2].toFixed(4)}`;
  const crackKeys = new Set(); for (const [a, b] of cut) { crackKeys.add(pk(a) + '|' + pk(b)); crackKeys.add(pk(b) + '|' + pk(a)); }
  const ap = all.attributes.position.array, gp = [];
  const sk = (i) => `${ap[i].toFixed(4)},${ap[i + 1].toFixed(4)},${ap[i + 2].toFixed(4)}`;
  for (let i = 0; i < ap.length; i += 6) if (!crackKeys.has(sk(i) + '|' + sk(i + 3))) for (let n = 0; n < 6; n++) gp.push(ap[i + n]);
  all.dispose();
  const grid = new THREE.BufferGeometry(); grid.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  return { surface, grid, cut: cutGeo, strip };
}

/* ---------- runtime ---------- */
export function createEntry(root, opts = {}) {
  const still = !!opts.still;                                          // reduced motion: the settled frame, once, tappable, no drift, no hue
  const track = root.getElementById('track'), stage = root.getElementById('stage'), canvas = root.getElementById('bulb');
  const mark = root.querySelector('.mark'), settled = root.querySelector('.settled');
  const labels = [...root.querySelectorAll('.nav a')];
  const mobile = window.matchMedia('(max-width: 760px)');
  const fine = window.matchMedia('(pointer: fine)').matches;

  const flat = /[?&]flat/.test(location.search);                      // ?flat=1: the lines without the glass, to compare cost on a device
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(GROUND, 1);
  renderer.transmissionResolutionScale = mobile.matches ? 0.6 : 0.85;  // the refraction buffer: what the glass sees through itself, at a fraction of the frame
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GROUND, 6, 10);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  if (!flat) {
    scene.environment = makeEnvironment(renderer);                    // no point or directional lights: a point light on glass is a hot dot, and a dot is a glow
  }

  const group = new THREE.Group();                                     // the bulb; rotated as one for the turn
  scene.add(group);

  const lineMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: flat ? 0.96 : WIRE_ALPHA, fog: true });
  const anchorMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.86, fog: true });   // base + filament: they fade at the settle
  const crackMat = new THREE.LineBasicMaterial({ color: LIVE, transparent: true, opacity: 1.0, fog: false });      // the crack is the fracture light from its first pixel
  const stripMat = new THREE.MeshBasicMaterial({ color: LIVE, vertexColors: true, side: THREE.DoubleSide, transparent: true, fog: false, toneMapped: false });   // unlit, graded by vertex: the light inside the cut
  const dimMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.38, fog: true });
  const occluder = new THREE.MeshBasicMaterial({ color: GROUND, fog: false });
  const glassMat = new THREE.MeshPhysicalMaterial({ ...GLASS, side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  glassMat.color.set(GLASS.color); glassMat.attenuationColor.set(GLASS.attenuationColor);

  const parts = { shells: [], frags: [], glass: null, wire: null, cracks: null, crackSegs: 0, base: null, baseSolid: null, baseGeom: null, filament: null, dims: null, debris: null, points: null };
  const box = new THREE.Box3();
  let portrait = false, ratio = 1;
  const camHome = new THREE.Vector3(0, 0, 8);
  let fogFar = 10;
  let sel = null, selK = 0;                                          // the move to a chosen fragment, then its section

  function frame() {
    const w = stage.clientWidth, h = stage.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.5 : 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (parts.points) parts.points.material.uniforms.uRatio.value = ratio;
    if (box.isEmpty()) return;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const size = new THREE.Vector3(); box.getSize(size);
    portrait = h > w;
    let z, vh;
    if (portrait) {
      const vw = size.x * 1.18; vh = vw / camera.aspect; z = vh / (2 * tan);
      group.position.set(-(box.min.x + box.max.x) / 2, 0.38 * vh - box.max.y, 0);
    } else {
      vh = size.y * 1.32; z = vh / (2 * tan);
      group.position.set(0, -(box.min.y + box.max.y) / 2 + 0.03 * vh, 0);
    }
    camHome.set(0, 0, z); if (!sel) camera.position.copy(camHome);
    scene.fog.near = z - 1.2; scene.fog.far = z + 2.6; fogFar = z + 2.6;
  }

  function build(gltf) {
    gltf.scene.traverse((o) => {
      if (!o.isMesh && !o.isLineSegments && !o.isPoints) return;
      const name = o.name || '';
      if (/^shell_\d+$/.test(name)) {
        const i = parseInt(name.slice(6), 10);
        const geo = o.geometry; geo.computeBoundingSphere();
        const home = geo.boundingSphere.center.clone(); const radius = geo.boundingSphere.radius;
        geo.translate(-home.x, -home.y, -home.z);                     // the fragment's origin is its own centre
        geo.computeBoundingBox(); const bbox = geo.boundingBox.clone();
        const mat = lineMat.clone();
        const { surface, grid, cut, strip } = buildCut(geo, home, NECK_Y + 0.04 - home.y);
        const piece = new THREE.Group(); piece.name = name; piece.visible = false;
        const lines = new THREE.LineSegments(grid, mat);                    // the cream grid, on the glass, ending at the cut
        const light = new THREE.Mesh(strip, stripMat.clone());              // the light, set back inside the thickness
        piece.add(lines, light);
        let glass = null, cutGlass = null;
        if (!flat) { glass = new THREE.Mesh(surface, glassMat.clone()); cutGlass = new THREE.Mesh(cut, glassMat.clone()); cutGlass.material.polygonOffset = false; piece.add(glass, cutGlass); }
        const outward = new THREE.Vector3(home.x, home.y * 0.35, home.z).normalize();
        const mats = [mat, light.material].concat(glass ? [glass.material, cutGlass.material] : []);
        parts.frags[i] = { i, obj: piece, mat, strip: light, glass, cutGlass, mats, home, radius, bbox, outward, hover: 0, hoverT: 0, navQ: new THREE.Quaternion(), tumbleQ: new THREE.Quaternion() };
        parts.shells.push(piece); scene.add(piece);
      } else if (name === 'shell_wire') {
        parts.wire = new THREE.LineSegments(o.geometry, lineMat); group.add(parts.wire);
      } else if (name === 'cracks') {
        const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        const ordered = orderCracks(src.attributes.position.array, IMPACT);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(ordered, 3));
        parts.crackSegs = ordered.length / 6;
        parts.cracks = new THREE.LineSegments(g, crackMat); parts.cracks.geometry.setDrawRange(0, 0); group.add(parts.cracks);
      } else if (name === 'base') {
        parts.baseSolid = new THREE.Mesh(o.geometry, occluder); parts.baseSolid.renderOrder = 0;
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 1), anchorMat); lines.renderOrder = 1;
        parts.base = new THREE.Group(); parts.base.add(parts.baseSolid, lines); parts.baseGeom = o.geometry; group.add(parts.base);
      } else if (name === 'filament') {
        parts.filament = new THREE.LineSegments(o.geometry, anchorMat); group.add(parts.filament);
      } else if (name === 'dims') {
        parts.dims = new THREE.LineSegments(o.geometry, dimMat); group.add(parts.dims);
      } else if (name === 'debris') {
        parts.debris = o.geometry;
      }
    });
    if (parts.debris) { parts.points = makeDebris(parts.debris, mobile.matches ? 600 : 1500); group.add(parts.points); }
    if (!flat) {                                                        // the whole envelope at rest: one lathe, the bake's own profile
      const lathe = new THREE.LatheGeometry(glassProfile(), LONGS);
      parts.glass = new THREE.Mesh(lathe, glassMat); group.add(parts.glass);
    }
    box.makeEmpty();
    for (const g of [parts.wire && parts.wire.geometry, parts.baseGeom, parts.dims && parts.dims.geometry]) if (g) { g.computeBoundingBox(); box.union(g.boundingBox); }
    frame();
  }

  /* ---------- per frame ---------- */
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _sepP = new THREE.Vector3(), _navP = new THREE.Vector3();
  const screen = [];                                                   // per fragment: centre and radius in CSS px, for the labels and the pointer
  let pointer = null, clock = 0;

  function place(f, p, view, k, dt, now) {
    const pose = (portrait ? POSES.portrait : POSES.landscape)[f.i];
    // separated pose: the fragment's home in the (turned) bulb, slid out along its own direction, with a small tumble
    _sepP.copy(f.home).addScaledVector(f.outward, SEPARATION * p.sep).applyQuaternion(group.quaternion).add(group.position);
    f.tumbleQ.setFromAxisAngle(f.outward, 0.35 * p.sep);
    _q.copy(group.quaternion).multiply(f.tumbleQ);
    // settled pose: hand placed, plus parallax by depth and a slow drift, both only once it has settled
    const depth = (pose.p[2] + 1.6) / 2.6;                            // 0 far … 1 near
    const drift = still ? 0 : DRIFT * k;
    _navP.set(
      pose.p[0] + view.x * PARALLAX * depth * k + drift * Math.sin(clock * 0.31 + f.i * 1.7),
      pose.p[1] + view.y * PARALLAX * 0.5 * depth * k + drift * Math.cos(clock * 0.23 + f.i * 2.3),
      pose.p[2]);
    _e.set(pose.r[0] + (still ? 0 : 0.03 * k * Math.sin(clock * 0.19 + f.i)), pose.r[1] + (still ? 0 : 0.03 * k * Math.cos(clock * 0.17 + f.i * 0.7)), pose.r[2]);
    f.navQ.setFromEuler(_e);
    f.obj.position.lerpVectors(_sepP, _navP, k);
    f.obj.quaternion.slerpQuaternions(_q, f.navQ, k);
    f.obj.scale.setScalar(1 + ((portrait ? NAV_SCALE.portrait : NAV_SCALE.landscape) - 1) * k);
    // hover / focus / touch: ease forward as before; the fracture light strengthens on this piece only. Time based.
    const a = 1 - Math.exp(-dt / (HOVER_MS / 3));
    f.hover += (f.hoverT - f.hover) * a; if (Math.abs(f.hoverT - f.hover) < 0.002) f.hover = f.hoverT;
    f.obj.position.z += f.hover * 0.22 * k;
    f.mat.opacity = flat ? 0.96 : WIRE_ALPHA;
    f.strip.material.color.set(LIVE).multiplyScalar(STRIP_REST + (STRIP_LIVE - STRIP_REST) * f.hover); f.strip.material.opacity = 1;
    if (f.glass) { f.glass.material.opacity = 1; f.cutGlass.material.opacity = 1; }
  }

  const _c = new THREE.Vector3();
  function project(f) {
    // the fragment's screen-space box, from the eight corners of its own bounding box through its current transform
    f.obj.updateMatrixWorld();
    const w = stage.clientWidth, h = stage.clientHeight; const b = f.bbox;
    let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity;
    for (let n = 0; n < 8; n++) {
      _c.set(n & 1 ? b.max.x : b.min.x, n & 2 ? b.max.y : b.min.y, n & 4 ? b.max.z : b.min.z).applyMatrix4(f.obj.matrixWorld).project(camera);
      const sx = (_c.x + 1) / 2 * w, sy = (1 - _c.y) / 2 * h;
      l = Math.min(l, sx); r = Math.max(r, sx); t = Math.min(t, sy); bt = Math.max(bt, sy);
    }
    return { cx: (l + r) / 2, cy: (t + bt) / 2, r: Math.max(r - l, bt - t) / 2, l, t, rt: r, b: bt };
  }

  function placeLabels(t, k) {
    parts.frags.forEach((f, i) => {
      const el = labels[i]; if (!el) return;
      const s = project(f); screen[i] = s;
      const pose = (portrait ? POSES.portrait : POSES.landscape)[i];
      const gap = 12;
      const x = pose.side === 'right' ? s.rt + gap : s.l - gap;
      const op = labelAt(t, i) * (sel && sel.i >= 0 && sel.i !== i ? 1 - selK : 1);
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(s.cy)}px, 0) translate(${pose.side === 'right' ? '0' : '-100%'}, -50%)`;
      el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
      el.classList.toggle('is-live', f.hover > 0.5);
    });
  }

  function select(i, href, now = performance.now()) {
    const f = parts.frags[i]; if (!f) { if (href) location.assign(href); return; }
    const to = new THREE.Vector3();
    const scale = f.obj.scale.x, dist = (f.radius * scale) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25;
    to.set(f.obj.position.x, f.obj.position.y, f.obj.position.z + dist);
    sel = { i, href, from: camera.position.clone(), to, start: now, done: false };
    f.hoverT = 1; wake();
  }
  function unselect(now = performance.now()) {                         // back: the camera returns the way it came
    if (!sel) return;
    sel = { i: -1, href: null, from: camera.position.clone(), to: camHome.clone(), start: now, done: false };
    parts.frags.forEach((f) => { f.hoverT = 0; f.viaLabel = false; }); wake();
  }

  function render(st, dt = 16, now = 0) {
    const t = st.scroll;
    const p = poseAt(t);
    clock = now / 1000;
    group.rotation.y = p.rot + st.view.x * 0.10;
    group.rotation.x = st.view.y * 0.06;
    if (mark) { mark.style.opacity = p.text.toFixed(3); mark.style.transform = `translate3d(0, ${((1 - p.text) * 10).toFixed(1)}px, 0)`; }
    dimMat.opacity = 0.38 * p.dims; if (parts.dims) parts.dims.visible = p.dims > 0.004;
    scene.fog.far = fogFar + 60 * p.settle;                             // the settled pieces leave the haze entirely: depth is parallax and scale, never dimness
    if (settled) { const k = still ? 1 : settledAt(t); settled.style.opacity = k.toFixed(3); settled.style.pointerEvents = k > 0.5 ? 'auto' : 'none'; }
    if (parts.cracks) { parts.cracks.geometry.setDrawRange(0, Math.round(parts.crackSegs * p.crack) * 2); parts.cracks.visible = !p.broken; }
    if (parts.wire) parts.wire.visible = !p.broken;
    if (parts.glass) parts.glass.visible = !p.broken;
    anchorMat.opacity = 0.86 * p.anchor; if (parts.baseSolid) parts.baseSolid.visible = p.anchor > 0.5;
    if (parts.filament) parts.filament.visible = p.anchor > 0.004; if (parts.base) parts.base.visible = p.anchor > 0.004;
    // pointer over a fragment (fine pointers): screen-space test against last frame's projection
    if (fine && pointer && p.settle > 0.5) parts.frags.forEach((f, i) => { const s = screen[i]; const inside = s && pointer.x >= s.l && pointer.x <= s.rt && pointer.y >= s.t && pointer.y <= s.b; f.hoverT = inside ? 1 : (f.hoverT === 1 && !f.viaLabel ? 0 : f.hoverT); });
    let moving = false;
    if (sel) {
      const k = EASE_IN_OUT(Math.min(1, (now - sel.start) / SELECT_MS));
      camera.position.lerpVectors(sel.from, sel.to, k);
      selK = sel.i >= 0 ? k : selK * (1 - k);
      if (k >= 1 && !sel.done) { sel.done = true; if (sel.href) location.assign(sel.href); else sel = null; }
      moving = true;
    }
    parts.frags.forEach((f) => { if (!f) return; f.obj.visible = p.broken; place(f, p, st.view, p.settle, dt, now); if (f.hover !== f.hoverT) moving = true; });
    if (selK > 0) parts.frags.forEach((f) => { if (sel && f.i === sel.i) return; f.mats.forEach((m) => { m.opacity *= 1 - selK; }); });
    if (parts.points) {
      const u = parts.points.material.uniforms;
      parts.points.visible = p.broken && p.release > 0;
      u.uRelease.value = p.release;
      u.uAlpha.value = 0.28 * Math.min(1, p.release / 0.12) * (1 - selK);
      u.uView.value.set(still ? 0 : st.view.x, still ? 0 : st.view.y);
    }
    renderer.render(scene, camera);
    placeLabels(t, p.settle);                                          // after the render, so the camera's matrices are this frame's
    return !still && (p.settle > 0.001 || moving);                     // the settled fragments drift on their own; nothing else does
  }

  /* ---------- input: labels and the fragments themselves ---------- */
  let wake = () => {};
  labels.forEach((el, i) => {
    const on = () => { const f = parts.frags[i]; if (f) { f.hoverT = 1; f.viaLabel = true; wake(); } };
    const reveal = () => { if (still || !engine) return; const end = track.offsetHeight - stage.offsetHeight; if (engine.state.scroll < 0.98 && window.scrollY < end - 2) window.scrollTo(0, end); };
    const off = () => { const f = parts.frags[i]; if (f) { f.hoverT = 0; f.viaLabel = false; wake(); } };
    if (fine) { el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off); }
    el.addEventListener('focus', () => { reveal(); on(); }); el.addEventListener('blur', off);
    el.addEventListener('click', (e) => { if (still || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); select(i, el.href); });
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted && sel) unselect(); });
  if (fine) {
    stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; wake(); }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointer = null; parts.frags.forEach((f) => { if (!f.viaLabel) f.hoverT = 0; }); wake(); });
  }
  stage.addEventListener('click', (e) => {                            // a tap on a fragment goes where its label goes (Gate 4 adds the camera move)
    if (e.target.closest('a')) return;
    const r = stage.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = parts.frags.findIndex((f, i) => { const s = screen[i]; return s && labels[i] && labels[i].style.pointerEvents === 'auto' && x >= s.l && x <= s.rt && y >= s.t && y <= s.b; });
    if (hit >= 0) { if (still) location.assign(labels[hit].href); else select(hit, labels[hit].href); }
  });

  let engine = null, ready;
  if (still) {
    const state = { scroll: 1, view: { x: 0, y: 0 } };
    let pending = false;
    wake = () => { if (!pending) { pending = true; requestAnimationFrame((now) => { pending = false; if (render(state, 16, now)) wake(); }); } };
    frame(); window.addEventListener('resize', () => { frame(); wake(); }, { passive: true });
    ready = new GLTFLoader().loadAsync('/assets/bulb/bulb.glb?v=3').then((gltf) => { build(gltf); wake(); return parts; });
  } else {
    engine = createSpatialEngine({ scene: stage, object: stage, track, stage, hint: null, render, hold: false, drag: 'relative', permission: 'gesture' });
    wake = engine.wake;
    frame(); window.addEventListener('resize', () => { frame(); engine.wake(); }, { passive: true });
    ready = new GLTFLoader().loadAsync('/assets/bulb/bulb.glb?v=3').then((gltf) => { build(gltf); engine.wake(); return parts; });
    if (/[?&]debug/.test(location.search)) {
      const d = document.createElement('div'); d.id = 'dbg';
      d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;font:11px/1.4 ui-monospace,monospace;color:#FF5A1F;pointer-events:none;white-space:pre';
      document.body.appendChild(d);
      const tick = () => { const s = engine.state; d.textContent = `sensor ${s.orientation}  view ${s.view.x.toFixed(2)} ${s.view.y.toFixed(2)}  t ${s.scroll.toFixed(3)}  ${s.mode}`; requestAnimationFrame(tick); };
      tick();
    }
  }
  return { engine, ready, parts, group, camera, scene, renderer, poseAt, screen, select, unselect, get portrait() { return portrait; }, get selecting() { return sel; } };
}

/* ---------- boot ---------- */
if (typeof window !== 'undefined' && document.getElementById('bulb')) {
  const html = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const fail = () => { html.classList.remove('live', 'rm'); html.classList.add('nogl'); };
  if (!gl) {
    html.classList.add('nogl');                                        // the SVG and the four links as a list
  } else {
    try {
      html.classList.add(reduced ? 'rm' : 'live');
      window.QB_ENTRY = createEntry(document, { still: reduced });     // reduced motion: the settled fragments, once, tappable; no drift, no hue
      window.QB_ENTRY.ready.catch(fail);
    } catch (err) { fail(); }
  }
}
