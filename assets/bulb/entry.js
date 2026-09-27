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
import { poseAt, labelAt, settledAt, SEPARATION } from './map.js?v=2';   // versioned: /assets/* is cached for an hour, and the map changes with the sequence
export { poseAt, labelAt, MAP, ROTATION, seg } from './map.js?v=2';

export const GROUND = 0x000000;      // brand black
export const LINE = 0xF2EEE5;        // brand cream: the wireframe on the glass, the labels, the rim light
export const LINE_NEAR = 0xF2EEE5;
export const LIVE = 0xFF5A00;        // brand orange: the light inside the fracture, and nothing else
export const WIRE_ALPHA = 0.38;      // the cream grid sits on the glass as a faint drawing: the glass carries the form
/* The glass: physically based, transmissive, smoked. One material, cloned per fragment so a piece can fade on its own.
   Thickness is the volume the refraction sees; attenuation is the smoke. Clearcoat is the polish. Dark tint, no colour. */
export const GLASS = {
  color: 0x6E6A64, roughness: 0.035, metalness: 0, transmission: 1, ior: 1.5, thickness: 0.16,
  attenuationColor: 0x1E1B18, attenuationDistance: 0.6, clearcoat: 0.4, clearcoatRoughness: 0.04,
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
  attribute vec3 aVel; attribute float aSeed; attribute vec3 aOff;
  uniform float uRelease; uniform float uSize; uniform float uRatio; uniform vec4 uPulse; uniform float uPulseR;
  varying float vSeed; varying vec3 vPos;
  void main() {
    vec3 p = position + aVel * uRelease * (0.85 + 0.5 * aSeed) + aOff;   /* aOff: the flow, integrated on the CPU only while something moves */
    vPos = p;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float lit = uPulse.w * smoothstep(uPulseR, uPulseR * 0.3, distance(p, uPulse.xyz));
    gl_PointSize = uSize * uRatio * (0.7 + 0.7 * aSeed) * (1.0 + 1.8 * lit);   /* sizes vary by seed; the lit points swell a little: a soft disc of light, not a change of colour alone */
    vSeed = aSeed;
  }`;
const POINT_FS = `
  precision highp float;                                          /* the same precision as the vertex stage: uPulse is read in both, and a mismatch fails the link */
  uniform vec2 uView; uniform float uAlpha; uniform vec4 uPulse; uniform float uPulseR;
  varying float vSeed; varying vec3 vPos;
  vec3 hsv(float h, float s, float v) { vec3 k = vec3(1.0, 2.0 / 3.0, 1.0 / 3.0); vec3 p = abs(fract(vec3(h) + k) * 6.0 - 3.0); return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s); }
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float m = clamp(length(uView), 0.0, 1.0);                       /* how far off head-on the view is */
    float hue = fract(atan(uView.y, uView.x) / 6.2831853 + vSeed * 1.7 + m * 0.35);
    vec3 foil = hsv(hue, 0.85, 1.0);
    vec3 rest = vec3(0.78, 0.75, 0.70);                             /* cream-grey: what the foil is when you look straight at it */
    vec3 col = mix(rest, foil, smoothstep(0.06, 0.55, m));
    float lit = uPulse.w * smoothstep(uPulseR, uPulseR * 0.3, distance(vPos, uPulse.xyz));   /* the tap: a soft disc of light, cream toward orange */
    col = mix(col, mix(vec3(0.95, 0.93, 0.90), vec3(1.0, 0.35, 0.0), 0.5 + 0.5 * vSeed), lit);
    gl_FragColor = vec4(col, min(1.0, uAlpha * (0.72 + 0.28 * m) + lit * 0.7));
  }`;

/* The debris is two populations in one buffer: a share seeded on the cracks (the bake's `debris` points, which leave the
   glass along their own outward velocity as the release runs), and the rest spread through the whole hero volume, so the
   field reads as one organic scatter, a little denser at the fracture, with no emitter edges. */
export const CRACK_SHARE = 0.4;
export const SPREAD = { x: 3.4, y: 3.0, z: 1.3 };
export function makeDebris(seedGeometry, count) {
  const src = seedGeometry.attributes.position.array;
  const nCrack = Math.min(Math.round(count * CRACK_SHARE), src.length / 3), n = count;
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), seed = new Float32Array(n), off = new Float32Array(n * 3);
  let s = 12345;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < n; i++) {
    if (i < nCrack) {
      const x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2];
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      // outward from the bulb's axis, a little up, a little sideways: debris leaves the crack, it does not fall
      const r = Math.hypot(x, z) || 1;
      const ox = x / r, oz = z / r;
      const jx = (rnd() - 0.5) * 0.7, jy = (rnd() - 0.3) * 0.6, jz = (rnd() - 0.5) * 0.7;
      const speed = 0.35 + rnd() * 0.75;
      vel[i * 3] = (ox + jx) * speed; vel[i * 3 + 1] = (0.15 + jy) * speed; vel[i * 3 + 2] = (oz + jz) * speed;
    } else {
      // the ambient share: anywhere in the hero volume, drifting a little as it arrives
      pos[i * 3] = (rnd() * 2 - 1) * SPREAD.x; pos[i * 3 + 1] = (rnd() * 2 - 1) * SPREAD.y; pos[i * 3 + 2] = (rnd() * 2 - 1) * SPREAD.z;
      vel[i * 3] = (rnd() - 0.5) * 0.3; vel[i * 3 + 1] = (rnd() - 0.5) * 0.3; vel[i * 3 + 2] = (rnd() - 0.5) * 0.3;
    }
    seed[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aOff', new THREE.BufferAttribute(off, 3).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false,
    uniforms: { uRelease: { value: 0 }, uView: { value: new THREE.Vector2() }, uAlpha: { value: 0 }, uSize: { value: 2.6 }, uRatio: { value: 1 }, uPulse: { value: new THREE.Vector4(0, 0, 0, 0) }, uPulseR: { value: 1 } },   // w = 0: no light until a tap (Vector4 defaults w to 1)
  });
  const points = new THREE.Points(g, m); points.frustumCulled = false; points.visible = false;
  points.userData.flow = { n, off, v: new Float32Array(n * 3), energy: 0 };
  return points;
}

/* ---------- the flow: the field answers the pointer and a tap on empty space ----------
   Integrated on the CPU per frame, only while the pointer is moving, a pulse is live, or the field still has energy.
   Each point carries an offset from its own path with a spring back to zero (FLOW_K) and damping (FLOW_C). Under the
   pointer, points within FLOW_R follow its velocity and spread a little from it, weighted by distance; faster movement
   pushes harder. A pulse is one outward impulse inside PULSE_R that decays over PULSE_MS, while the shader lights the
   same disc. Nothing runs at rest. */
export const FLOW_K = 4.0, FLOW_C = 2.6, FLOW_R = 1.45, FLOW_FOLLOW = 5.0, FLOW_SPREAD = 0.9, FLOW_VMAX = 14;
export const PULSE_R = 1.9, PULSE_PUSH = 70, PULSE_MS = 900;
export function stepFlow(points, dt, ctx) {
  const F = points.userData.flow; if (!F) return false;
  const { n, off, v } = F;
  const P = points.geometry.attributes.position.array, V = points.geometry.attributes.aVel.array, S = points.geometry.attributes.aSeed.array;
  const rel = points.material.uniforms.uRelease.value;
  const ptr = ctx.pointer, pulse = ctx.pulse;
  const active = !!ptr && ptr.speed > 0.02, live = !!pulse && pulse.k > 0.001;
  if (!active && !live && F.energy < 1e-5) return false;
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const i3 = i * 3, g = rel * (0.85 + 0.5 * S[i]);
    const px = P[i3] + V[i3] * g + off[i3], py = P[i3 + 1] + V[i3 + 1] * g + off[i3 + 1], pz = P[i3 + 2] + V[i3 + 2] * g + off[i3 + 2];
    let ax = -FLOW_K * off[i3] - FLOW_C * v[i3], ay = -FLOW_K * off[i3 + 1] - FLOW_C * v[i3 + 1], az = -FLOW_K * off[i3 + 2] - FLOW_C * v[i3 + 2];
    if (active) {
      const dx = px - ptr.x, dy = py - ptr.y, dz = pz - ptr.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < FLOW_R) {
        const w = (1 - d / FLOW_R) ** 2, sp = ptr.speed * FLOW_SPREAD * w / (d + 0.05);
        ax += ptr.vx * FLOW_FOLLOW * w + dx * sp; ay += ptr.vy * FLOW_FOLLOW * w + dy * sp; az += ptr.vz * FLOW_FOLLOW * w + dz * sp;
      }
    }
    if (live) {
      const dx = px - pulse.x, dy = py - pulse.y, dz = pz - pulse.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < PULSE_R) { const w = (1 - d / PULSE_R) * pulse.k * PULSE_PUSH / (d + 0.08); ax += dx * w; ay += dy * w; az += dz * w; }
    }
    v[i3] += ax * dt; v[i3 + 1] += ay * dt; v[i3 + 2] += az * dt;
    off[i3] += v[i3] * dt; off[i3 + 1] += v[i3 + 1] * dt; off[i3 + 2] += v[i3 + 2] * dt;
    energy += v[i3] * v[i3] + v[i3 + 1] * v[i3 + 1] + v[i3 + 2] * v[i3 + 2] + off[i3] * off[i3] + off[i3 + 1] * off[i3 + 1] + off[i3 + 2] * off[i3 + 2];
  }
  F.energy = energy / n;
  points.geometry.attributes.aOff.needsUpdate = true;
  return true;
}

/* ---------- the light: a studio nobody sees, prefiltered once ----------
   Three soft-edged panels on black, reflected by the glass and drawn nowhere. A broad vertical softbox upper left toward
   the viewer, warm cream, for the long reflection; a thin strip opposite, behind and to the right, for the rim; and a
   small, dim orange panel placed where the shell around the impact point reflects it, so a restrained orange bounce
   sits near the fracture and slides over the glass as the bulb turns. The panels are feathered, so their reflections
   have soft edges and a clear centre; the prefilter blur is near zero, so they stay crisp on the low roughness. */
export function makeEnvironment(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const feathered = (feather) => {                                       // a soft-edged rectangle as a texture: 1 in the middle, 0 at the border
    const n = 64, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); const img = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = Math.abs((x + 0.5) / n * 2 - 1), v = Math.abs((y + 0.5) / n * 2 - 1);
      const fu = Math.min(1, Math.max(0, (1 - u) / feather)), fv = Math.min(1, Math.max(0, (1 - v) / feather));
      const k = Math.round(255 * (fu * fu * (3 - 2 * fu)) * (fv * fv * (3 - 2 * fv))); const i = (y * n + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = k; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  };
  const panel = (w, h, x, y, z, color, k, feather) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: feathered(feather), color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(3.6, 8.5, -5, 2.5, 3.5, LINE, 5.5, 0.35);   // softbox: broad, vertical, upper left, toward the viewer. Glass returns ~4% head-on, so the panel is bright
  panel(0.6, 6.5, 5, -0.5, -3.5, LINE, 3.2, 0.5);   // rim: thin, opposite
  panel(1.3, 1.3, 3.5, 5, 2.3, LIVE, 0.6, 0.6);     // orange bounce: small and dim, where the glass around the impact reflects it
  const tex = pm.fromScene(env, 0.004).texture;
  pm.dispose(); env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.map.dispose(); o.material.dispose(); } });
  return tex;
}

/** Take a fragment apart: the bake gave every open edge a strip 0.022 inward (the thickness at the break). Faces of that
    strip are told from the surface by distance to the lathe profile. Nothing is added or moved.
    @returns {{ surface, rim, grid }} the surface faces, the rim faces (same vertices, their own index), and the cream lines:
    the surface's edges above 4°, minus the break itself, so the grid ends at the edge and the silhouette is the glass. Pure. */
export function splitFragment(geo, home) {
  const P = geo.attributes.position.array, I = geo.index.array, nv = P.length / 3;
  const prof = glassProfile();
  const distToProfile = (r, y) => {
    let best = Infinity;
    for (let i = 1; i < prof.length; i++) {
      const ax = prof[i - 1].x, ay = prof[i - 1].y, bx = prof[i].x, by = prof[i].y;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((r - ax) * dx + (y - ay) * dy) / L));
      best = Math.min(best, Math.hypot(r - (ax + t * dx), y - (ay + t * dy)));
    }
    return best;
  };
  const off = new Uint8Array(nv);
  for (let v = 0; v < nv; v++) off[v] = distToProfile(Math.hypot(P[v * 3] + home.x, P[v * 3 + 2] + home.z), P[v * 3 + 1] + home.y) > 0.015 ? 1 : 0;   // cut vertices lie on the flat facets, up to 0.010 inside the curve; rim vertices sit 0.022 in
  const si = [], ri = [];
  for (let i = 0; i < I.length; i += 3) (off[I[i]] || off[I[i + 1]] || off[I[i + 2]] ? ri : si).push(I[i], I[i + 1], I[i + 2]);
  const surface = new THREE.BufferGeometry(); surface.setAttribute('position', geo.attributes.position); surface.setIndex(si); surface.computeVertexNormals();
  const rim = new THREE.BufferGeometry(); rim.setAttribute('position', geo.attributes.position); rim.setIndex(ri); rim.computeVertexNormals();
  const all = new THREE.EdgesGeometry(surface, 4), sharp = new THREE.EdgesGeometry(geo, 60);   // the break: the rim's creases and its open edge
  const k = (a, i) => `${a[i].toFixed(4)},${a[i + 1].toFixed(4)},${a[i + 2].toFixed(4)}`;
  const keys = new Set(); const rp = sharp.attributes.position.array;
  for (let i = 0; i < rp.length; i += 6) { keys.add(k(rp, i) + '|' + k(rp, i + 3)); keys.add(k(rp, i + 3) + '|' + k(rp, i)); }
  const ap = all.attributes.position.array, gp = [];
  for (let i = 0; i < ap.length; i += 6) if (!keys.has(k(ap, i) + '|' + k(ap, i + 3))) for (let n = 0; n < 6; n++) gp.push(ap[i + n]);
  all.dispose(); sharp.dispose();
  const grid = new THREE.BufferGeometry(); grid.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  return { surface, rim, grid };
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
        const { grid } = splitFragment(geo, home);
        const piece = new THREE.Group(); piece.name = name; piece.visible = false;
        const lines = new THREE.LineSegments(grid, mat);                    // the cream grid, on the glass, ending at the break
        piece.add(lines);
        let glass = null;
        if (!flat) { geo.computeVertexNormals(); glass = new THREE.Mesh(geo, glassMat.clone()); piece.add(glass); }   // the bake's own mesh, one glass, nothing added
        const outward = new THREE.Vector3(home.x, home.y * 0.35, home.z).normalize();
        const mats = [mat].concat(glass ? [glass.material] : []);
        parts.frags[i] = { i, obj: piece, mat, glass, mats, home, radius, bbox, outward, hover: 0, hoverT: 0, navQ: new THREE.Quaternion(), tumbleQ: new THREE.Quaternion() };
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
  // the flow's inputs, in the bulb group's own space: the pointer with its velocity, and a pulse
  const flow = { pointer: null, pulse: null, lastP: null, lastT: 0 };
  const _fp = new THREE.Vector3(), _fd = new THREE.Vector3();
  function toLocal(cx, cy, out) {                                     // stage CSS px → the point on the world z = 0 plane → group space
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    _fd.set(cx / w * 2 - 1, -(cy / h) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    const k = -camera.position.z / (_fd.z || -1e-6);
    out.copy(camera.position).addScaledVector(_fd, k);
    return group.worldToLocal(out);
  }
  function feedPointer(cx, cy, now) {
    if (still || !parts.points || !parts.points.visible) return;
    const p = toLocal(cx, cy, new THREE.Vector3());
    if (flow.lastP) {
      const dt = Math.min(0.1, Math.max(0.008, (now - flow.lastT) / 1000));
      const vx = (p.x - flow.lastP.x) / dt, vy = (p.y - flow.lastP.y) / dt, vz = (p.z - flow.lastP.z) / dt;
      const sp = Math.hypot(vx, vy, vz), c = sp > FLOW_VMAX ? FLOW_VMAX / sp : 1;
      const prev = flow.pointer;
      flow.pointer = { x: p.x, y: p.y, z: p.z, vx: vx * c, vy: vy * c, vz: vz * c, speed: sp * c, at: now };
      if (prev) { flow.pointer.vx = prev.vx * 0.4 + flow.pointer.vx * 0.6; flow.pointer.vy = prev.vy * 0.4 + flow.pointer.vy * 0.6; flow.pointer.vz = prev.vz * 0.4 + flow.pointer.vz * 0.6; flow.pointer.speed = Math.hypot(flow.pointer.vx, flow.pointer.vy, flow.pointer.vz); }
    }
    flow.lastP = p; flow.lastT = now; wake();
  }
  function pulseAt(cx, cy, now) {
    if (still || !parts.points || !parts.points.visible) return;
    const p = toLocal(cx, cy, new THREE.Vector3());
    flow.pulse = { x: p.x, y: p.y, z: p.z, k: 1, born: now }; wake();
  }

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
    if (f.glass) f.glass.material.opacity = 1;
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
      u.uAlpha.value = 0.62 * Math.min(1, p.release / 0.12) * (1 - selK);   // the field is thin now, so each point must hold on its own on a phone
      u.uView.value.set(still ? 0 : st.view.x, still ? 0 : st.view.y);
      // the flow: the pointer's velocity fades out 140 ms after its last move; a pulse pushes once and lights for PULSE_MS
      if (flow.pointer && now - flow.pointer.at > 140) flow.pointer = null;
      if (flow.pulse) {
        const uP = Math.min(1, (now - flow.pulse.born) / PULSE_MS);
        flow.pulse.k = Math.max(0, 1 - uP * 2.5);                     // the push is over in the first 40%; the light outlasts it
        u.uPulse.value.set(flow.pulse.x, flow.pulse.y, flow.pulse.z, (1 - uP) * (1 - uP));
        u.uPulseR.value = 0.5 + 1.9 * uP;                             // the light widens as it fades
        if (uP >= 1) { flow.pulse = null; u.uPulse.value.w = 0; } else moving = true;
      }
      if (!still && parts.points.visible && stepFlow(parts.points, Math.min(0.05, dt / 1000), flow)) moving = true;
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
  // the field: every pointer, mouse or finger, feeds the flow; leaving or lifting ends it
  stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); feedPointer(e.clientX - r.left, e.clientY - r.top, e.timeStamp || performance.now()); }, { passive: true });
  stage.addEventListener('pointerdown', (e) => { const r = stage.getBoundingClientRect(); flow.lastP = null; feedPointer(e.clientX - r.left, e.clientY - r.top, e.timeStamp || performance.now()); }, { passive: true });
  const endFlow = () => { flow.pointer = null; flow.lastP = null; };
  stage.addEventListener('pointerleave', endFlow); stage.addEventListener('pointerup', endFlow); stage.addEventListener('pointercancel', endFlow);
  stage.addEventListener('click', (e) => {                            // a tap on a fragment goes where its label goes; a tap on empty space pulses the field
    if (e.target.closest('a,button')) return;
    const r = stage.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = parts.frags.findIndex((f, i) => { const s = screen[i]; return s && labels[i] && labels[i].style.pointerEvents === 'auto' && x >= s.l && x <= s.rt && y >= s.t && y <= s.b; });
    if (hit >= 0) { if (still) location.assign(labels[hit].href); else select(hit, labels[hit].href); }
    else pulseAt(x, y, e.timeStamp || performance.now());
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
  return { engine, ready, parts, group, camera, scene, renderer, poseAt, screen, select, unselect, flow, stepFlow, toLocal, renderOnce: () => renderer.render(scene, camera), get portrait() { return portrait; }, get selecting() { return sel; } };
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
