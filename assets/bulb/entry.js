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
import { poseAt, labelAt, settledAt, captionAt, seg, SEPARATION, ROTATION as TURN, SETTLE, MAP as SEQ } from './map.js?v=7';   // versioned: /assets/* is cached for an hour, and the map changes with the sequence
export { poseAt, labelAt, MAP, ROTATION, seg } from './map.js?v=7';

export const GROUND = 0x000000;      // brand black
export const LINE = 0xF2EEE5;        // brand cream: the wireframe on the glass, the labels, the rim light
export const LINE_NEAR = 0xF2EEE5;
export const LIVE = 0xFF5A00;        // brand orange: the light inside the fracture, and nothing else
export const WIRE_ALPHA = 0.38;      // the cream grid sits on the glass as a faint drawing: the glass carries the form
/* The glass: physically based, transmissive, smoked. One material, cloned per fragment so a piece can fade on its own.
   Thickness is the volume the refraction sees; attenuation is the smoke. Dark tint, no colour. One interface, one lobe:
   no clearcoat (glass has a single surface; a second lobe doubles every highlight). ior 1.5 gives the real 4% head-on. */
export const GLASS = {
  color: 0x6E6A64, roughness: 0.02, metalness: 0, transmission: 1, ior: 1.5, thickness: 0.16,
  attenuationColor: 0x1E1B18, attenuationDistance: 0.6,
  envMapIntensity: 1.0, specularIntensity: 1.0,
};
/* The inside of the far wall. Light that passes the near wall reflects again off the inner surface behind it: a second,
   smaller, inverted image of every panel on the opposite side of the bulb, dimmer by what the near wall kept. It is the
   cue that says hollow glass rather than a black ball. Reflection only; it sits in the refraction buffer the near wall
   looks through. */
export const INNER = { color: 0x000000, roughness: 0.02, metalness: 0, ior: 1.5, specularIntensity: 1.0, envMapIntensity: 0.55 };
export const GLASS_LAT_STEP = 1.5, GLASS_NECK_N = 40, GLASS_LONGS = 160;   // the glass is revolved finely: a highlight bends where a facet does
/* The unbroken envelope, for the whole bulb at rest: the same profile the bake lathes (tools/bulb.py glass_profile),
   revolved at runtime so the baked meshes stay byte for byte what they were. r against height, y up. */
export const LAT_STEP = 10, LONGS = 24, NECK_Y = -1.55, NECK_R = 0.36;
export function glassProfile(step = LAT_STEP, neckN = 8) {
  const pts = [new THREE.Vector2(0, 1)];
  for (let lat = 90 - step; lat >= -30 - 1e-9; lat -= step) { const a = THREE.MathUtils.degToRad(lat); pts.push(new THREE.Vector2(Math.cos(a), Math.sin(a))); }
  const r0 = Math.cos(THREE.MathUtils.degToRad(-30)), y0 = Math.sin(THREE.MathUtils.degToRad(-30));
  const smooth = (k) => k * k * (3 - 2 * k);
  for (let i = 1; i <= neckN; i++) { const k = i / neckN, e = Math.pow(smooth(k), 0.8); pts.push(new THREE.Vector2(r0 + (NECK_R - r0) * e, y0 + (NECK_Y - y0) * k)); }
  return pts;
}
/** The whole envelope as glass: the profile revolved finely, with normals that turn smoothly through the join of the
    dome and the neck. The profile meets there at an angle (the neck leaves vertically), which a coarse mesh hid; blown
    glass has no crease, and a crease is exactly what a reflection shows up: the highlight kinks and the far wall's image
    breaks into steps. Positions are the profile's own, so the glass still sits on the grid; only the shading is smooth.
    The normal's angle is smoothed along the arc (Gaussian, `sigma` in bulb radii), which leaves the dome's exact sphere
    normals alone. The profile runs crown to neck; a lathe winds its faces outward only when the points run upward, so it
    is revolved reversed (else the front faces are the inside of the far wall). */
export function glassLathe(sigma = 0.1) {
  const prof = glassProfile(GLASS_LAT_STEP, GLASS_NECK_N), n = prof.length;
  const s = [0], ang = [];
  for (let j = 1; j < n; j++) s.push(s[j - 1] + prof[j].distanceTo(prof[j - 1]));
  for (let j = 0; j < n; j++) {                                        // the outward normal's angle in the (r, y) plane
    const a = prof[Math.max(0, j - 1)], b = prof[Math.min(n - 1, j + 1)];
    let t = Math.atan2(b.x - a.x, -(b.y - a.y));                        // normal = (-dy, dr) → angle from +r toward +y
    if (j) while (t - ang[j - 1] > Math.PI) t -= 2 * Math.PI; if (j) while (t - ang[j - 1] < -Math.PI) t += 2 * Math.PI;
    ang.push(t);
  }
  ang[0] = Math.PI / 2;
  const sm = ang.map((_, j) => {
    if (j === 0) return Math.PI / 2;
    let w = 0, acc = 0;
    for (let k = 1; k < n; k++) { const d = (s[k] - s[j]) / sigma; if (d * d > 16) continue; const g = Math.exp(-0.5 * d * d); w += g; acc += g * ang[k]; }
    return acc / w;
  });
  const geo = new THREE.LatheGeometry(prof.slice().reverse(), GLASS_LONGS), up = sm.slice().reverse();
  const nrm = geo.attributes.normal, segs = GLASS_LONGS;
  for (let i = 0; i <= segs; i++) {
    const phi = i / segs * Math.PI * 2, sp = Math.sin(phi), cp = Math.cos(phi);
    for (let j = 0; j < n; j++) { const c = Math.cos(up[j]), y = Math.sin(up[j]); nrm.setXYZ(i * n + j, sp * c, y, cp * c); }
  }
  nrm.needsUpdate = true;
  return geo;
}
/* The arrival pose. A lathe turned about its own axis does not change: the silhouette is the same at every angle and
   the reflections are fixed in the world, so a turn about the bulb's axis reads as nothing happening. The bulb therefore
   leans: crown to the upper right and a little toward the camera, a three-quarter view. The scroll turns it about the
   world's vertical, so the lean itself swings round and the light slides over the glass. The pivot is the centre of the
   bulb's bounding sphere, so it turns in place. */
export const TILT = { x: 0.34, z: -0.46 };
export const FRAME = { portrait: { fill: 0.9, y: 0.575 }, landscape: { fill: 0.8, x: 0.14, y: 0.52 } };
/* The settled composition was placed for a camera framing the bulb with its dimension marks: this span. As the pieces
   settle the camera eases from the arrival framing to this one, so the nav keeps its measured layout. */
export const SETTLED_SPAN = { portrait: 2.94, landscape: 4.73 };   // world units across (portrait) or up (landscape) at z = 0   // sphere diameter as a share of the short side's span; centre as a share of the window
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
export const NAV_SCALE = { portrait: 0.55, landscape: 0.65 };
export const SETTLED_R = { portrait: 0.8, landscape: 1.05 };   // a piece's bounding sphere against what shows on screen; landscape pieces sit turned further, so they need the whole sphere and a little more   // a settled fragment is a nav piece, not the bulb: smaller, so four fit with air between
export const PARALLAX = 0.32;        // world units of sideways travel per unit of view for a fragment at the nearest depth
export const DRIFT = 0.028;          // world units of slow drift on a settled fragment
/* Tilt turns each settled piece a little about its own centre, as an object turns when you move around it. Sliding a
   piece (parallax) never moves its reflections: those follow the surface's facing, so without a turn the light sits
   still on the glass however the phone is held. Radians per unit of view; the reflections move about twice as far. */
export const TILT_TURN = { yaw: 0.42, pitch: 0.28 };
export const HOVER_MS = 180;         // the ease of a fragment coming forward under the pointer or the focus (Emil: ease-out, under 300 ms)
/* The fracture's heat: the broken edge burns like a fresh break in hot glass. A capsule of light around every edge
   segment, drawn in screen pixels so it reads the same at any depth: a hot core (orange toward cream), a glow, and a
   faint spill onto the glass beside it. Max-blended, so overlapping segments join without beads. It burns where the
   orange already lives: along the cracks as they run, on every piece at the break, then on the one live piece. */
export const EMBER = { core: 1.2, glow: 4.5, spill: 12, reach: 30, flicker: 0.18, uneven: 0.45 };   // CSS px (every term is gone by the reach, so no edge shows), and how far the heat wavers
export const SMOLDER = 0;            // the other three pieces' edges at rest (0..1). 0 keeps orange to the live piece alone.
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

/* ---------- the debris: dust, not confetti ----------
   One Points object, one shader. At rest every point is a tiny, dim, warm-cream mote; sizes and brightness vary a little
   by seed so the field has depth without sparkle. Nothing flashes and nothing changes hue with the view. The only colour
   is heat: a point that the pointer or a tap has set moving warms toward brand orange in proportion to its speed, and
   cools back to cream as its spring returns it home. Heat is written by the flow integrator, so a still field is cream. */
const POINT_VS = `
  attribute vec3 aVel; attribute float aSeed; attribute vec3 aOff; attribute float aHeat;
  uniform float uRelease; uniform float uSize; uniform float uRatio;
  varying float vSeed; varying float vHeat;
  void main() {
    vec3 p = position + aVel * uRelease * (0.85 + 0.5 * aSeed) + aOff;   /* aOff: the flow, integrated on the CPU only while something moves */
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uRatio * (0.55 + 0.75 * aSeed * aSeed) * (1.0 + 0.5 * aHeat);   /* most points are the smallest size; a few are a little larger */
    vSeed = aSeed; vHeat = aHeat;
  }`;
const POINT_FS = `
  precision highp float;
  uniform float uAlpha;
  varying float vSeed; varying float vHeat;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float r = length(c);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.2, r);                            /* a soft round mote, no hard disc edge */
    vec3 cream = vec3(0.949, 0.933, 0.898), orange = vec3(1.0, 0.353, 0.0);
    vec3 col = mix(cream, orange, vHeat);
    float a = uAlpha * (0.45 + 0.55 * vSeed) + 0.45 * vHeat;         /* dim, varied by seed; warmer points are brighter while they move */
    gl_FragColor = vec4(col, min(1.0, a) * soft);
  }`;

/* The debris is two populations in one buffer: a share seeded on the cracks (the bake's `debris` points, which leave the
   glass along their own outward velocity as the release runs), and the rest spread through the whole hero volume, so the
   field reads as one organic scatter, a little denser at the fracture, with no emitter edges. */
export const CRACK_SHARE = 0.4;
export const SPREAD = { landscape: { x: 3.4, y: 3.0, z: 1.3 }, portrait: { x: 1.7, y: 3.6, z: 1.1 } };   // the ambient share fills the window's own shape, so a narrow phone does not spend half its motes off-screen
export function makeDebris(seedGeometry, count, spread = SPREAD.landscape) {
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
      pos[i * 3] = (rnd() * 2 - 1) * spread.x; pos[i * 3 + 1] = (rnd() * 2 - 1) * spread.y; pos[i * 3 + 2] = (rnd() * 2 - 1) * spread.z;
      vel[i * 3] = (rnd() - 0.5) * 0.3; vel[i * 3 + 1] = (rnd() - 0.5) * 0.3; vel[i * 3 + 2] = (rnd() - 0.5) * 0.3;
    }
    seed[i] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aOff', new THREE.BufferAttribute(off, 3).setUsage(THREE.DynamicDrawUsage));
  const heat = new Float32Array(n);
  g.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    vertexShader: POINT_VS, fragmentShader: POINT_FS, transparent: true, depthWrite: false,
    uniforms: { uRelease: { value: 0 }, uAlpha: { value: 0 }, uSize: { value: DUST_SIZE }, uRatio: { value: 1 } },
  });
  const points = new THREE.Points(g, m); points.frustumCulled = false; points.visible = false;
  points.userData.flow = { n, off, heat, v: new Float32Array(n * 3), energy: 0, hot: false };
  return points;
}

/* ---------- the flow: the field answers the pointer and a tap on empty space ----------
   Integrated on the CPU per frame, only while the pointer is moving, a push is live, or the field still has energy.
   Each point carries an offset from its own path with a spring back to zero (FLOW_K) and damping (FLOW_C). Under the
   pointer, points within FLOW_R follow its velocity and part a little around it; faster movement pushes harder, and the
   influence stays local. A tap is one gentle outward push inside PULSE_R over the first part of PULSE_MS: it moves the
   motes that are already there and adds none. Each point's heat is its speed, eased, so colour follows motion only. */
export const DUST = { desktop: 375, mobile: 150 };   // a quarter of the old field: atmosphere, not confetti
export const DUST_SIZE = 1.35, DUST_ALPHA = 0.3;
export const FLOW_K = 4.0, FLOW_C = 2.8, FLOW_R = 1.0, FLOW_FOLLOW = 4.5, FLOW_SPREAD = 0.45, FLOW_VMAX = 12;
export const PULSE_R = 1.2, PULSE_PUSH = 34, PULSE_MS = 900;
export const HEAT_SPEED = 0.55;                     // speed (units/s) at which a mote is fully orange
export function stepFlow(points, dt, ctx) {
  const F = points.userData.flow; if (!F) return false;
  const { n, off, v, heat } = F;
  const P = points.geometry.attributes.position.array, V = points.geometry.attributes.aVel.array, S = points.geometry.attributes.aSeed.array;
  const rel = points.material.uniforms.uRelease.value;
  const ptr = ctx.pointer, pulse = ctx.pulse;
  const active = !!ptr && ptr.speed > 0.02, live = !!pulse && pulse.k > 0.001;
  if (!active && !live && F.energy < 1e-5) {
    if (F.hot) { heat.fill(0); off.fill(0); v.fill(0); F.hot = false; points.geometry.attributes.aHeat.needsUpdate = true; points.geometry.attributes.aOff.needsUpdate = true; }
    return false;
  }
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const i3 = i * 3, g = rel * (0.85 + 0.5 * S[i]);
    const px = P[i3] + V[i3] * g + off[i3], py = P[i3 + 1] + V[i3 + 1] * g + off[i3 + 1], pz = P[i3 + 2] + V[i3 + 2] * g + off[i3 + 2];
    let ax = -FLOW_K * off[i3] - FLOW_C * v[i3], ay = -FLOW_K * off[i3 + 1] - FLOW_C * v[i3 + 1], az = -FLOW_K * off[i3 + 2] - FLOW_C * v[i3 + 2];
    if (active) {
      const dx = px - ptr.x, dy = py - ptr.y, dz = pz - ptr.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < FLOW_R) {
        const w = (1 - d / FLOW_R) ** 2, sp = ptr.speed * FLOW_SPREAD * w / (d + 0.08);
        ax += ptr.vx * FLOW_FOLLOW * w + dx * sp; ay += ptr.vy * FLOW_FOLLOW * w + dy * sp; az += ptr.vz * FLOW_FOLLOW * w + dz * sp;
      }
    }
    if (live) {
      const dx = px - pulse.x, dy = py - pulse.y, dz = pz - pulse.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < PULSE_R) { const w = (1 - d / PULSE_R) ** 2 * pulse.k * PULSE_PUSH / (d + 0.15); ax += dx * w; ay += dy * w; az += dz * w; }
    }
    v[i3] += ax * dt; v[i3 + 1] += ay * dt; v[i3 + 2] += az * dt;
    off[i3] += v[i3] * dt; off[i3 + 1] += v[i3 + 1] * dt; off[i3 + 2] += v[i3 + 2] * dt;
    const sp2 = v[i3] * v[i3] + v[i3 + 1] * v[i3 + 1] + v[i3 + 2] * v[i3 + 2];
    const target = Math.min(1, Math.sqrt(sp2) / HEAT_SPEED);
    heat[i] += (target - heat[i]) * (target > heat[i] ? 0.5 : 0.08);   // warms quickly, cools slowly back to cream
    energy += sp2 + off[i3] * off[i3] + off[i3 + 1] * off[i3 + 1] + off[i3 + 2] * off[i3 + 2] + heat[i] * heat[i] * 0.01;
  }
  F.energy = energy / n; F.hot = true;
  points.geometry.attributes.aOff.needsUpdate = true;
  points.geometry.attributes.aHeat.needsUpdate = true;
  return true;
}

/* ---------- the light: a studio nobody sees, prefiltered once ----------
   Lit panels on black, reflected by the glass and drawn nowhere. Glass returns about 4% of the light head-on and nearly
   all of it at a grazing angle, and a grazing ray off the silhouette points behind the object. The panels are HDR (the
   renderer's tone map rolls their cores off instead of clipping them) and each is lit the way the real thing is:
   - a broad warm-cream softbox, upper left toward the viewer: a crisp-edged diffuser with a hot centre, so its image on
     the glass has a shape, a core and a falloff, and bends with the curvature;
   - a tall backlight behind and to the left: the grazing rays off the left silhouette see it, a clean rim on one side;
   - a thin strip behind and to the right: the opposing rim, narrower and dimmer;
   - a small window high on the right: the one hard glint a studio always leaves on glass;
   - a wide scrim overhead and a faint floor: the crown picks up a dim shape and the lower body a faint horizon, which is
     what tells a black glass shell from a black hole (a soft card in front only ever read as haze);
   - a thin orange streak where the shell around the impact reflects at rest: a restrained bounce near the fracture.
   Nothing is drawn on the mesh; as the bulb turns, its normals sweep through this studio and the light moves with them. */
export function makeEnvironment(renderer, tiltQ) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  // a lit rectangle as a texture: an edge `edge` wide (share of the half-size), and a centre `core` times brighter than the rim
  const panelTex = (edge, core) => {
    const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); const img = g.createImageData(n, n);
    const ss = (k) => k * k * (3 - 2 * k);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = Math.abs((x + 0.5) / n * 2 - 1), v = Math.abs((y + 0.5) / n * 2 - 1);
      const e = ss(Math.min(1, Math.max(0, (1 - u) / edge))) * ss(Math.min(1, Math.max(0, (1 - v) / edge)));
      const r = Math.min(1, Math.hypot(u * 0.9, v));                    // the diffuser: brightest behind the lamp, falling to the frame
      const k = Math.round(255 * e * (1 / core + (1 - 1 / core) * (1 - ss(r)))); const i = (y * n + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = k; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  };
  const panel = (w, h, pos, color, k, edge, core = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: panelTex(edge, core), color: new THREE.Color(color).multiplyScalar(k * core), side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(0, 0, 0); env.add(m);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  panel(3.4, 8.5, V(-5, 2.2, 3.4), LINE, 3.2, 0.07, 2.6);   // key softbox: crisp frame, hot centre
  panel(3.6, 10, V(-2.6, 0.8, -5.2), LINE, 3.0, 0.12, 1.6);  // backlight: the left rim
  panel(0.5, 7, V(3.2, -0.4, -5), LINE, 1.6, 0.25, 1.4);     // opposing rim, thin
  panel(0.45, 0.8, V(4.6, 4.8, 3.6), LINE, 9.0, 0.2, 1.3);   // the window: one small hard glint
  panel(9, 5, V(0.5, 7.5, 1.5), LINE, 0.16, 0.25, 1.5);      // overhead scrim: a dim shape on the crown
  panel(24, 24, V(0, -8, 0), LINE, 0.045, 0.9, 1.0);         // the floor: a faint horizon on the lower body
  // the orange card sits on the reflection of the view ray off the shell at the impact point, in the arrival pose
  const n = new THREE.Vector3(IMPACT.x, IMPACT.y, IMPACT.z).normalize().applyQuaternion(tiltQ || new THREE.Quaternion());
  const d = V(0, 0, -1), r = d.clone().addScaledVector(n, -2 * d.dot(n)).normalize();
  panel(0.22, 1.4, r.multiplyScalar(6), LIVE, 0.9, 0.5);   // a thin streak, not a patch: a patch reflects as a stain in the dome
  const tex = pm.fromScene(env, 0.002).texture;
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
  // the break on the outer glass: surface edges used by one surface face only, both ends touching the break strip.
  // Keyed by position, so duplicated vertices at seams do not read as borders; the neck's open rim never touches the strip.
  const pk = (v) => `${P[v * 3].toFixed(4)},${P[v * 3 + 1].toFixed(4)},${P[v * 3 + 2].toFixed(4)}`;
  const onStrip = new Set(); for (const v of ri) onStrip.add(pk(v));
  const uses = new Map();
  for (let i = 0; i < si.length; i += 3) for (let e = 0; e < 3; e++) {
    const a = si[i + e], b = si[i + (e + 1) % 3], ka = pk(a), kb = pk(b), key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    const u = uses.get(key); if (u) u.n++; else uses.set(key, { n: 1, a, b });
  }
  const ep = [];
  for (const { n, a, b } of uses.values()) if (n === 1 && onStrip.has(pk(a)) && onStrip.has(pk(b))) ep.push(P[a * 3], P[a * 3 + 1], P[a * 3 + 2], P[b * 3], P[b * 3 + 1], P[b * 3 + 2]);
  const edge = new THREE.BufferGeometry(); edge.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
  return { surface, rim, grid, edge };
}

/** A capsule of fracture light around each segment of a LineSegments position array (pairs of points). Six vertices per
 *  segment, unindexed, so a draw range in segments maps to one in vertices (the cracks grow by draw range). */
export function emberGeometry(src) {
  const n = src.length / 6, pos = new Float32Array(n * 18), a = new Float32Array(n * 18), b = new Float32Array(n * 18), c = new Float32Array(n * 18);
  const corners = [[0, -1], [0, 1], [1, 1], [0, -1], [1, 1], [1, -1]];
  for (let s = 0; s < n; s++) {
    const o = s * 6, h = (Math.sin((src[o] + src[o + 3]) * 12.9898 + (src[o + 1] + src[o + 4]) * 78.233 + (src[o + 2] + src[o + 5]) * 37.719) * 43758.5453) % 1;
    corners.forEach(([end, side], k) => {
      const v = (s * 6 + k) * 3;
      for (let j = 0; j < 3; j++) { a[v + j] = src[o + j]; b[v + j] = src[o + 3 + j]; pos[v + j] = src[o + end * 3 + j]; }
      c[v] = end; c[v + 1] = side; c[v + 2] = Math.abs(h);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(a, 3));
  g.setAttribute('aB', new THREE.BufferAttribute(b, 3)); g.setAttribute('aC', new THREE.BufferAttribute(c, 3));
  return g;
}

function emberMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: { uRes: shared.uRes, uRatio: shared.uRatio, uTime: shared.uTime, uK: { value: 0 }, uLive: { value: new THREE.Color(LIVE) }, uHot: { value: new THREE.Color(LIVE).lerp(new THREE.Color(LINE), 0.55) } },
    vertexShader: `
      attribute vec3 aA; attribute vec3 aB; attribute vec3 aC;
      uniform vec2 uRes; uniform float uRatio; uniform float uTime;
      varying vec2 vA; varying vec2 vB; varying float vN;
      const float REACH = ${EMBER.reach.toFixed(1)}; const float FLICKER = ${EMBER.flicker.toFixed(3)}; const float UNEVEN = ${EMBER.uneven.toFixed(3)};
      void main() {
        vec4 ca = projectionMatrix * modelViewMatrix * vec4(aA, 1.0), cb = projectionMatrix * modelViewMatrix * vec4(aB, 1.0);
        vA = (ca.xy / ca.w * 0.5 + 0.5) * uRes; vB = (cb.xy / cb.w * 0.5 + 0.5) * uRes;
        vec2 d = vB - vA; float l = length(d); vec2 dir = l > 1e-4 ? d / l : vec2(1.0, 0.0); vec2 nrm = vec2(-dir.y, dir.x);
        vec4 c = aC.x < 0.5 ? ca : cb; vec2 p = aC.x < 0.5 ? vA : vB;
        float r = REACH * uRatio;
        p += nrm * aC.y * r + dir * (aC.x < 0.5 ? -r : r);
        gl_Position = vec4((p / uRes * 2.0 - 1.0) * c.w, c.z, c.w);
        // the break is not evenly hot: each stretch has its own heat, and it wavers slowly on its own phase, like an edge still cooling
        float h = aC.z * 6.2832, base = 1.0 - UNEVEN * (0.5 + 0.5 * sin(h * 13.0) * sin(h * 5.0 + 1.3));
        vN = base * (1.0 - FLICKER + FLICKER * (0.5 + 0.5 * sin(uTime * 1.7 + h * 3.0)) * (0.6 + 0.4 * sin(uTime * 0.63 + h * 7.0)));
      }`,
    fragmentShader: `
      uniform float uRatio; uniform float uK; uniform vec3 uLive; uniform vec3 uHot;
      varying vec2 vA; varying vec2 vB; varying float vN;
      const float CORE = ${EMBER.core.toFixed(2)}; const float GLOW = ${EMBER.glow.toFixed(2)}; const float SPILL = ${EMBER.spill.toFixed(2)};
      void main() {
        vec2 pa = gl_FragCoord.xy - vA, ba = vB - vA;
        float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
        float d = length(pa - ba * t) / uRatio;                      // CSS px from the break
        float core = exp(-pow(d / CORE, 2.0)), glow = exp(-pow(d / GLOW, 2.0)), spill = exp(-pow(d / SPILL, 2.0));
        vec3 col = mix(uLive, uHot, smoothstep(0.55, 1.0, vN)) * core + uLive * (0.55 * glow + 0.2 * spill);   // the hottest stretches run toward cream, the coolest stay orange
        gl_FragColor = vec4(col * uK * vN, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false, fog: false, side: THREE.DoubleSide,   // the quads are built in screen space; either winding is the front
    blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
}

/* ---------- runtime ---------- */
export function createEntry(root, opts = {}) {
  const still = !!opts.still;                                          // reduced motion: the settled frame, once, tappable, no drift, no hue
  const track = root.getElementById('track'), stage = root.getElementById('stage'), canvas = root.getElementById('bulb');
  const hero = root.querySelector('.hero'), settled = root.querySelector('.settled');
  const say = root.querySelector('.say'), saySetup = say && say.querySelector('.say-setup'), sayKill = say && say.querySelector('.say-kill');
  const why = settled && settled.querySelector('.why'), hint = settled && settled.querySelector('.hint');
  const settledRest = settled ? [...settled.children].filter((el) => el !== why) : [];
  const cue = root.querySelector('.cue'), cueMark = cue && cue.querySelector('.cue-rule i'), cueRule = cue && cue.querySelector('.cue-rule');
  const labels = [...root.querySelectorAll('.nav a')];
  const mobile = window.matchMedia('(max-width: 760px)');
  const fine = window.matchMedia('(pointer: fine)').matches;

  const flat = /[?&]flat/.test(location.search);                      // ?flat=1: the lines without the glass, to compare cost on a device
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(GROUND, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;                    // highlights roll off like film instead of clipping flat; hues kept
  renderer.toneMappingExposure = 1.0;
  renderer.transmissionResolutionScale = mobile.matches ? 0.6 : 0.85;  // the refraction buffer: what the glass sees through itself, at a fraction of the frame
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GROUND, 6, 10);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const TILT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT.x, 0, TILT.z, 'ZXY'));
  if (!flat) {
    scene.environment = makeEnvironment(renderer, TILT_Q);            // no point or directional lights: a point light on glass is a hot dot, and a dot is a glow
  }

  const group = new THREE.Group();                                     // the bulb; rotated as one for the turn
  scene.add(group);

  const lineMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: flat ? 0.96 : WIRE_ALPHA, fog: true, toneMapped: false });
  const anchorMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.86, fog: true, toneMapped: false });   // base + filament: they fade at the settle
  const crackMat = new THREE.LineBasicMaterial({ color: LIVE, transparent: true, opacity: 1.0, fog: false, toneMapped: false });      // the crack is the fracture light from its first pixel
  const dimMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.38, fog: true, toneMapped: false });
  const occluder = new THREE.MeshBasicMaterial({ color: GROUND, fog: false });
  const glassMat = new THREE.MeshPhysicalMaterial({ ...GLASS, side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  glassMat.color.set(GLASS.color); glassMat.attenuationColor.set(GLASS.attenuationColor);

  const parts = { shells: [], frags: [], glass: null, wire: null, cracks: null, crackSegs: 0, base: null, baseSolid: null, baseGeom: null, filament: null, dims: null, debris: null, points: null };
  const emberShared = { uRes: { value: new THREE.Vector2(1, 1) }, uRatio: { value: 1 }, uTime: { value: 0 } };   // one size and one clock for every ember
  const box = new THREE.Box3();
  const sphere = { c: new THREE.Vector3(), r: 1 };                     // the bulb's bounding sphere in its own space: the pivot and the framing
  const anchor = new THREE.Vector3();                                  // where the sphere's centre sits in the world
  let portrait = false, ratio = 1, cueW = 0, zArrive = 8, zSettle = 8, ySettle = 0;
  const camHome = new THREE.Vector3(0, 0, 8);
  let fogFar = 10;
  let sel = null, selK = 0, veilK = 0;                               // the move to a chosen fragment, then its section
  const head = root.querySelector('.top');                            // faded with the stage, so the section arrives out of black, not out of a cut

  function frame() {
    const w = stage.clientWidth, h = stage.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.5 : 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (parts.points) parts.points.material.uniforms.uRatio.value = ratio;
    renderer.getDrawingBufferSize(emberShared.uRes.value); emberShared.uRatio.value = ratio;
    if (box.isEmpty()) return;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    portrait = h > w;
    const D = 2 * sphere.r;
    let z, vh, vw;
    if (portrait) {
      vw = D / FRAME.portrait.fill; vh = vw / camera.aspect; z = vh / (2 * tan);
      anchor.set(0, vh * (0.5 - FRAME.portrait.y), 0);
    } else {
      vh = D / FRAME.landscape.fill; vw = vh * camera.aspect; z = vh / (2 * tan);
      anchor.set(vw * FRAME.landscape.x, vh * (0.5 - FRAME.landscape.y), 0);
    }
    if (cueRule) cueW = cueRule.getBoundingClientRect().width;
    zArrive = z; fitSettled(w, h, tan);
    camHome.set(0, 0, z); if (!sel) camera.position.copy(camHome);
    scene.fog.near = z - 0.75 * sphere.r; scene.fog.far = z + 1.6 * sphere.r; fogFar = scene.fog.far;
  }

  /* The settled framing: the pieces keep their hand-placed layout, scaled to the window's width (portrait) or height
     (landscape) as measured, but never into the band the header and the settled text use. A short window (an in-app
     browser, a phone with its toolbars down) pulls the camera back and centres the four pieces between the two, so the
     text's height, which does not scale, can never be landed on. */
  function fitSettled(w, h, tan) {
    const top = root.querySelector('.top'), headB = top ? top.getBoundingClientRect().bottom : 60;
    const textT = settled ? settled.getBoundingClientRect().top - (stage.getBoundingClientRect().top) : h;
    const bandT = headB + 12, bandB = Math.max(bandT + 120, textT - 18);
    const poses = portrait ? POSES.portrait : POSES.landscape, scale = portrait ? NAV_SCALE.portrait : NAV_SCALE.landscape;
    let H = portrait ? SETTLED_SPAN.portrait / camera.aspect : SETTLED_SPAN.landscape;   // visible height at z = 0
    const H0 = H; let yc = 0;
    for (let n = 0; n < 4; n++) {                                        // the depth of each piece changes its size on screen with the distance
      const z = H / (2 * tan); let yT = -Infinity, yB = Infinity;
      poses.forEach((ps, i) => { const f = parts.frags[i]; const r = (f ? f.radius : 0.5) * scale * (portrait ? SETTLED_R.portrait : SETTLED_R.landscape), k = z / (z - ps.p[2]); yT = Math.max(yT, (ps.p[1] + r) * k); yB = Math.min(yB, (ps.p[1] - r) * k); });
      H = Math.max(H0, (yT - yB) * h / (bandB - bandT)); yc = (yT + yB) / 2;
    }
    zSettle = H / (2 * tan);
    ySettle = yc - (0.5 - (bandT + bandB) / 2 / h) * H;                  // the pieces' centre on the band's centre
  }

  /* Every crack segment rides out on the piece it lies on, so the frame after the break draws exactly the light the frame
     before it did, dead-end cracks included (they split nothing, so no piece's broken edge carries them). Nearest piece by
     its vertices, through a coarse spatial hash; once, at load. */
  function carryCracks() {
    const C = 0.08, cell = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`, hash = new Map();
    parts.frags.forEach((f) => {
      if (!f) return; const a = f.glass ? f.glass.geometry.attributes.position.array : null; if (!a) return;
      for (let v = 0; v < a.length; v += 3) { const x = a[v] + f.home.x, y = a[v + 1] + f.home.y, z = a[v + 2] + f.home.z, k = cell(x, y, z); let b = hash.get(k); if (!b) hash.set(k, (b = [])); b.push(x, y, z, f.i); }
    });
    const src = parts.cracks.geometry.attributes.position.array, out = parts.frags.map(() => []);
    for (let s = 0; s < src.length; s += 6) {
      const mx = (src[s] + src[s + 3]) / 2, my = (src[s + 1] + src[s + 4]) / 2, mz = (src[s + 2] + src[s + 5]) / 2;
      const cx = Math.floor(mx / C), cy = Math.floor(my / C), cz = Math.floor(mz / C); let best = Infinity, who = -1;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const b = hash.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!b) continue;
        for (let n = 0; n < b.length; n += 4) { const d = (b[n] - mx) ** 2 + (b[n + 1] - my) ** 2 + (b[n + 2] - mz) ** 2; if (d < best) { best = d; who = b[n + 3]; } }
      }
      const f = parts.frags[who]; if (!f) continue;
      out[who].push(src[s] - f.home.x, src[s + 1] - f.home.y, src[s + 2] - f.home.z, src[s + 3] - f.home.x, src[s + 4] - f.home.y, src[s + 5] - f.home.z);
    }
    parts.frags.forEach((f, i) => {
      if (!f || !out[i].length) return;
      const e = f.edgeLines.geometry.attributes.position.array, all = new Float32Array(e.length + out[i].length); all.set(e); all.set(out[i], e.length);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(all, 3)); f.edgeLines.geometry.dispose(); f.edgeLines.geometry = g;
    });
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
        const { grid, edge } = splitFragment(geo, home);
        const piece = new THREE.Group(); piece.name = name; piece.visible = false;
        const lines = new THREE.LineSegments(grid, mat);                    // the cream grid, on the glass, ending at the break
        const edgeMat = crackMat.clone();                                     // the crack's light, carried out by the piece and let go as it separates
        const edgeLines = new THREE.LineSegments(edge, edgeMat); piece.add(edgeLines);
        piece.add(lines);
        let glass = null;
        if (!flat) { geo.computeVertexNormals(); glass = new THREE.Mesh(geo, glassMat.clone()); glass.material.depthWrite = false; piece.add(glass); }   // clear glass hides nothing behind it, as the whole bulb did the frame before   // the bake's own mesh, one glass, nothing added
        const outward = new THREE.Vector3(home.x, home.y * 0.35, home.z).normalize();
        const mats = [mat].concat(glass ? [glass.material] : []);
        parts.frags[i] = { i, obj: piece, mat, edgeMat, edgeLines, glass, mats, home, radius, bbox, outward, hover: 0, hoverT: 0, lit: 0, litT: 0, navQ: new THREE.Quaternion(), tumbleQ: new THREE.Quaternion() };
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
    if (parts.cracks) carryCracks();
    parts.frags.forEach((f) => {                                       // each piece's broken edge burns: built after the cracks are carried, so they burn too
      if (!f) return; f.ember = new THREE.Mesh(emberGeometry(f.edgeLines.geometry.attributes.position.array), emberMaterial(emberShared));
      f.ember.renderOrder = 3; f.ember.frustumCulled = false; f.ember.visible = false; f.obj.add(f.ember);
    });
    if (parts.cracks) {                                                // the cracks burn as they run, grown by the same draw range
      parts.crackEmber = new THREE.Mesh(emberGeometry(parts.cracks.geometry.attributes.position.array), emberMaterial(emberShared));
      parts.crackEmber.renderOrder = 3; parts.crackEmber.frustumCulled = false; parts.crackEmber.geometry.setDrawRange(0, 0); group.add(parts.crackEmber);
    }
    if (parts.debris) { parts.points = makeDebris(parts.debris, mobile.matches ? DUST.mobile : DUST.desktop, stage.clientHeight > stage.clientWidth ? SPREAD.portrait : SPREAD.landscape); group.add(parts.points); }
    if (!flat) {                                                        // the whole envelope at rest: one lathe, the bake's own profile
      const lathe = glassLathe();                                      // finer than the grid it carries, no crease at the neck
      const outer = glassMat.clone(); outer.side = THREE.FrontSide; outer.depthWrite = false;   // the near wall; clear glass hides nothing behind it
      parts.glass = new THREE.Mesh(lathe, outer); parts.glass.renderOrder = 2; group.add(parts.glass);
      const inner = new THREE.Mesh(lathe, new THREE.MeshPhysicalMaterial({ ...INNER, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      inner.renderOrder = 1; parts.glass.add(inner);                   // the far wall's inner face: reflection only, added to what is behind it
    }
    box.makeEmpty();
    for (const g of [parts.wire && parts.wire.geometry, parts.baseGeom]) if (g) { g.computeBoundingBox(); box.union(g.boundingBox); }   // the bulb only: the dimension marks are no longer part of the arrival
    box.getCenter(sphere.c); sphere.r = 0;
    for (const g of [parts.wire && parts.wire.geometry, parts.baseGeom]) if (g) { const a = g.attributes.position.array; for (let i = 0; i < a.length; i += 3) sphere.r = Math.max(sphere.r, Math.hypot(a[i] - sphere.c.x, a[i + 1] - sphere.c.y, a[i + 2] - sphere.c.z)); }
    if (parts.dims) parts.dims.visible = false;
    frame();
  }

  /* ---------- per frame ---------- */
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _pc = new THREE.Vector3(), _X = new THREE.Vector3(1, 0, 0), _Y = new THREE.Vector3(0, 1, 0);
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _sepP = new THREE.Vector3(), _navP = new THREE.Vector3();
  const _qRef = new THREE.Quaternion(), _qTum = new THREE.Quaternion(), _qTilt = new THREE.Quaternion(), _eTilt = new THREE.Euler(), _UP = new THREE.Vector3(0, 1, 0);
  /* Turn a piece from its separated orientation to its settled one without ever switching direction. A shortest-path
     slerp flips hemisphere whenever the two orientations pass 180° apart, and the separated one keeps moving (the tumble,
     tilt and pointer all feed it), so a piece could jump part of a turn in one frame. The direction is chosen once, from
     the separated pose with the view at rest, and kept. */
  function turnToward(out, a, b, k) {
    let c = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    if (c > 0.9995 || c < -0.9995) return out.slerpQuaternions(a, b, k);
    const th = Math.acos(Math.min(1, Math.max(-1, c))), sn = Math.sin(th), wa = Math.sin((1 - k) * th) / sn, wb = Math.sin(k * th) / sn;
    return out.set(a.x * wa + b.x * wb, a.y * wa + b.y * wb, a.z * wa + b.z * wb, a.w * wa + b.w * wb).normalize();
  }
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
    _qRef.setFromAxisAngle(_UP, TURN).multiply(TILT_Q).multiply(_qTum.setFromAxisAngle(f.outward, 0.35 * seg(SETTLE.from, SEQ.rotate, SEQ.separate)));
    if (_qRef.dot(f.navQ) < 0) f.navQ.set(-f.navQ.x, -f.navQ.y, -f.navQ.z, -f.navQ.w);   // the same orientation, on the reference's side
    f.navQ.premultiply(_qTilt.setFromEuler(_eTilt.set(view.y * TILT_TURN.pitch * k, view.x * TILT_TURN.yaw * k, 0, 'YXZ')));   // after the side is fixed, so tilt never flips it
    f.obj.position.lerpVectors(_sepP, _navP, k);
    turnToward(f.obj.quaternion, _q, f.navQ, k);
    f.obj.scale.setScalar(1 + ((portrait ? NAV_SCALE.portrait : NAV_SCALE.landscape) - 1) * k);
    // hover / focus / touch: ease forward as before; the fracture light strengthens on this piece only. Time based.
    const a = 1 - Math.exp(-dt / (HOVER_MS / 3));
    f.hover += (f.hoverT - f.hover) * a; if (Math.abs(f.hoverT - f.hover) < 0.002) f.hover = f.hoverT;
    f.obj.position.z += f.hover * 0.22 * k;
    f.mat.opacity = flat ? 0.96 : WIRE_ALPHA;
    // the live piece: the one under the pointer, the focus or the finger, or Work when none is. Its broken edges take the
    // crack's orange back, the one moment the visitor acts; the others stay cream. The crack light at the break still wins.
    f.lit += (f.litT - f.lit) * (still ? 1 : a); if (Math.abs(f.litT - f.lit) < 0.002) f.lit = f.litT;   // the still renders once: no ease
    const e = Math.max(p.glow, f.lit * labelAt(p.t, f.i), SMOLDER * labelAt(p.t, f.i));
    f.edgeMat.opacity = e; f.edgeMat.visible = e > 0.002;
    if (f.ember) { const k2 = e * (sel && sel.i >= 0 && sel.i !== f.i ? 1 - selK : 1); f.ember.material.uniforms.uK.value = k2; f.ember.visible = p.broken && k2 > 0.002; }
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
      el.classList.toggle('is-live', f.lit > 0.5 && op > 0.5);
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
    sel = { i: -1, href: null, from: camera.position.clone(), to: camHome.clone(), start: now, done: false, v0: veilK };
    parts.frags.forEach((f) => { f.hoverT = 0; f.viaLabel = false; }); wake();
  }

  function render(st, dt = 16, now = 0) {
    const t = st.scroll;
    const p = poseAt(t); p.t = t;
    // one live piece at a time: the pointed, focused or chosen one, else the first (Work), which takes the orange the ruler lets go
    { const hi = parts.frags.reduce((b, f, i) => (f && f.hoverT > 0 && (b < 0 || f.hoverT > parts.frags[b].hoverT) ? i : b), -1);
      const live = sel && sel.i >= 0 ? sel.i : hi >= 0 ? hi : 0;
      parts.frags.forEach((f, i) => { if (f) f.litT = i === live ? 1 : 0; });
      if (fine) stage.classList.toggle('is-pointing', hi >= 0 && !!pointer && p.settle > 0.5); }
    clock = now / 1000;
    camHome.set(0, ySettle * p.settle, zArrive + (zSettle - zArrive) * p.settle); if (!sel) camera.position.copy(camHome);   // the camera eases to the settled framing with the pieces
    // the pose: the arrival lean, turned about the world's vertical by the scroll, nudged by tilt; pivot at the sphere's centre
    _qa.setFromAxisAngle(_Y, p.rot + st.view.x * TILT_TURN.yaw * 0.5); _qb.setFromAxisAngle(_X, st.view.y * TILT_TURN.pitch * 0.5);   // half the settled turn: the whole bulb fills the frame, so less turn reads as much
    group.quaternion.copy(_qb).multiply(_qa).multiply(TILT_Q);
    group.position.copy(anchor).sub(_pc.copy(sphere.c).applyQuaternion(group.quaternion));
    if (hero && !still) {   // the headline is gone before it has travelled far enough to slide under the header, and never lingers as a grey half-state
      const k = Math.max(0, 1 - (1 - p.text) * 1.7);
      hero.style.opacity = k.toFixed(3); hero.style.transform = `translate3d(0, ${(-(1 - p.text) * 24).toFixed(1)}px, 0)`; hero.style.visibility = k < 0.002 ? 'hidden' : '';
    }
    if (say && !still) {   // the studio's line, said while the page does it; it leaves upward the way the headline did
      const c = captionAt(t);
      saySetup.style.opacity = c.setup.toFixed(3); sayKill.style.opacity = c.kill.toFixed(3);
      sayKill.style.transform = `translate3d(0, ${((1 - Math.min(1, c.kill / 0.999)) * 10).toFixed(1)}px, 0)`;
      say.style.transform = `translate3d(0, ${(-c.lift * 24).toFixed(1)}px, 0)`;
      say.style.visibility = c.setup + c.kill < 0.002 ? 'hidden' : 'visible';
      if (why) why.style.opacity = c.why.toFixed(3);
      if (hint) hint.style.opacity = c.hint.toFixed(3);
    }
    if (cue) {
      const k = 1 - seg(t, 0.74, 0.84);                                 // the cue is the page's progress until the pieces become the navigation
      cue.style.opacity = k.toFixed(3); cue.style.visibility = k < 0.002 ? 'hidden' : '';
      if (cueMark) cueMark.style.opacity = (k * k).toFixed(3);         // the orange mark goes first: it hands its colour to the live piece, never left alone on a faded ruler
      if (cueMark) cueMark.style.transform = `translate3d(${(Math.max(0, Math.min(1, t)) * Math.max(0, cueW - 2)).toFixed(1)}px, 0, 0)`;
    }
    scene.fog.far = fogFar + 60 * p.settle;                             // the settled pieces leave the haze entirely: depth is parallax and scale, never dimness
    if (settled) { const k = still ? 1 : settledAt(t); settledRest.forEach((el) => { el.style.opacity = k.toFixed(3); }); settled.style.pointerEvents = k > 0.5 ? 'auto' : 'none'; }
    if (parts.cracks) { parts.cracks.geometry.setDrawRange(0, Math.round(parts.crackSegs * p.crack) * 2); parts.cracks.visible = !p.broken; }
    if (parts.crackEmber) { parts.crackEmber.geometry.setDrawRange(0, Math.round(parts.crackSegs * p.crack) * 6); parts.crackEmber.material.uniforms.uK.value = p.heat; parts.crackEmber.visible = !p.broken && p.heat > 0.002; }
    emberShared.uTime.value = still ? 0 : clock;
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
      // the page goes to the ground over the back half of the move, so the section loads out of black; back reverses it
      veilK = sel.i >= 0 ? seg(k, 0.4, 1) : (sel.v0 || 0) * (1 - k);
      const o = veilK > 0.001 ? (1 - veilK).toFixed(3) : '';
      stage.style.opacity = o; if (head) head.style.opacity = o;
      if (k >= 1 && !sel.done) { sel.done = true; if (sel.href) location.assign(sel.href); else sel = null; }
      moving = true;
    }
    parts.frags.forEach((f) => { if (!f) return; f.obj.visible = p.broken; place(f, p, st.view, p.settle, dt, now); if (f.hover !== f.hoverT) moving = true; });
    if (selK > 0) parts.frags.forEach((f) => { if (sel && f.i === sel.i) return; f.mats.forEach((m) => { m.opacity *= 1 - selK; }); });
    if (parts.points) {
      const u = parts.points.material.uniforms;
      parts.points.visible = p.broken && p.release > 0;
      u.uRelease.value = p.release;
      u.uAlpha.value = DUST_ALPHA * Math.min(1, p.release / 0.12) * (1 - selK);
      // the flow: the pointer's velocity fades out 140 ms after its last move; a tap pushes once, gently, then lets go
      if (flow.pointer && now - flow.pointer.at > 140) flow.pointer = null;
      if (flow.pulse) {
        const uP = Math.min(1, (now - flow.pulse.born) / PULSE_MS);
        flow.pulse.k = Math.max(0, 1 - uP * 2.5);
        if (uP >= 1) flow.pulse = null; else moving = true;
      }
      if (!still && parts.points.visible && stepFlow(parts.points, Math.min(0.05, dt / 1000), flow)) moving = true;
    }
    renderer.render(scene, camera);
    placeLabels(t, p.settle);                                          // after the render, so the camera's matrices are this frame's
    return !still && (p.settle > 0.001 || moving || p.heat > 0.01);                     // the settled fragments drift on their own; nothing else does
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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { frame(); wake(); });   // the settled text's height is known once its face is in
  return { engine, ready, parts, group, camera, scene, renderer, poseAt, screen, select, unselect, flow, stepFlow, toLocal, renderOnce: () => renderer.render(scene, camera), renderAt: (t, vx = 0, vy = 0) => render({ scroll: t, view: { x: vx, y: vy } }, 16, performance.now()), get portrait() { return portrait; }, get selecting() { return sel; } };
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
