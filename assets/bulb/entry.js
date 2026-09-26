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
import { poseAt, labelAt, SEPARATION } from './map.js';
export { poseAt, labelAt, MAP, ROTATION, seg } from './map.js';

export const GROUND = 0x0B0A09;
export const LINE = 0xE8DCC2;
export const LIVE = 0xFF5A1F;        // interactive only; to be matched to the reference on the phone
export const IMPACT = { x: 0.75, y: 0.75, z: 0.55 };   // where the glass was struck: upper right, facing the viewer. Cracks grow from here.

/* The four settled poses (world units, y up; the camera looks down −z). Hand placed: distinct depths, no grid, no ring,
   each label on the side that has room. Portrait keeps the lower fifth of the window empty for the thumb. */
export const POSES = {
  portrait: [
    { p: [-0.55, 1.55, 0.9], r: [0.20, 0.60, -0.10], side: 'right' },
    { p: [0.75, 0.45, 0.3], r: [-0.30, -0.50, 0.20], side: 'left' },
    { p: [-0.62, -0.50, -0.7], r: [0.25, 0.30, 0.20], side: 'right' },
    { p: [0.85, -1.66, -1.3], r: [-0.20, 0.80, 0.10], side: 'left' },
  ],
  landscape: [
    { p: [-1.9, 0.9, 0.8], r: [0.20, 0.60, -0.10], side: 'left' },
    { p: [1.8, 0.7, 0.2], r: [-0.30, -0.50, 0.20], side: 'right' },
    { p: [-1.5, -1.0, -0.8], r: [0.40, 0.30, 0.30], side: 'left' },
    { p: [1.6, -0.9, -1.4], r: [-0.20, 0.80, 0.10], side: 'right' },
  ],
};
export const NAV_SCALE = { portrait: 0.55, landscape: 0.65 };   // a settled fragment is a nav piece, not the bulb: smaller, so four fit with air between
export const PARALLAX = 0.32;        // world units of sideways travel per unit of view for a fragment at the nearest depth
export const DRIFT = 0.028;          // world units of slow drift on a settled fragment
export const HOVER_MS = 180;         // the ease of a fragment coming forward under the pointer or the focus (Emil: ease-out, under 300 ms)

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

/* ---------- runtime ---------- */
export function createEntry(root, opts = {}) {
  const still = !!opts.still;                                          // reduced motion: the settled frame, once, tappable, no drift, no hue
  const track = root.getElementById('track'), stage = root.getElementById('stage'), canvas = root.getElementById('bulb');
  const mark = root.querySelector('.mark');
  const labels = [...root.querySelectorAll('.nav a')];
  const mobile = window.matchMedia('(max-width: 760px)');
  const fine = window.matchMedia('(pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(GROUND, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GROUND, 6, 10);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  const group = new THREE.Group();                                     // the bulb; rotated as one for the turn
  scene.add(group);

  const cream = new THREE.Color(LINE), orange = new THREE.Color(LIVE);
  const lineMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.86, fog: true });
  const anchorMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.86, fog: true });   // base + filament: they fade at the settle
  const crackMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 1.0, fog: true });
  const dimMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.38, fog: true });
  const occluder = new THREE.MeshBasicMaterial({ color: GROUND, fog: false });

  const parts = { shells: [], frags: [], wire: null, cracks: null, crackSegs: 0, base: null, baseSolid: null, baseGeom: null, filament: null, dims: null, debris: null, points: null };
  const box = new THREE.Box3();
  let portrait = false, ratio = 1;

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
    camera.position.set(0, 0, z);
    scene.fog.near = z - 1.2; scene.fog.far = z + 2.6;
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
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 4), mat); lines.name = name; lines.visible = false;
        const outward = new THREE.Vector3(home.x, home.y * 0.35, home.z).normalize();
        parts.frags[i] = { i, obj: lines, mat, home, radius, bbox, outward, hover: 0, hoverT: 0, navQ: new THREE.Quaternion(), tumbleQ: new THREE.Quaternion() };
        parts.shells.push(lines); scene.add(lines);
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
    // hover / focus: ease forward, lines to orange. Time based, so it is the same at any frame rate.
    const a = 1 - Math.exp(-dt / (HOVER_MS / 3));
    f.hover += (f.hoverT - f.hover) * a; if (Math.abs(f.hoverT - f.hover) < 0.002) f.hover = f.hoverT;
    f.obj.position.z += f.hover * 0.22 * k;
    f.mat.color.lerpColors(cream, orange, f.hover);
    f.mat.opacity = 0.86 + 0.14 * f.hover;
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
      const op = labelAt(t, i);
      el.style.opacity = op.toFixed(3);
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(s.cy)}px, 0) translate(${pose.side === 'right' ? '0' : '-100%'}, -50%)`;
      el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
      el.setAttribute('aria-hidden', op > 0.5 ? 'false' : 'true');
      el.tabIndex = op > 0.5 ? 0 : -1;
      el.classList.toggle('is-live', f.hover > 0.5);
    });
  }

  function render(st, dt = 16, now = 0) {
    const t = st.scroll;
    const p = poseAt(t);
    clock = now / 1000;
    group.rotation.y = p.rot + st.view.x * 0.10;
    group.rotation.x = st.view.y * 0.06;
    if (mark) { mark.style.opacity = p.text.toFixed(3); mark.style.transform = `translate3d(0, ${((1 - p.text) * 10).toFixed(1)}px, 0)`; }
    dimMat.opacity = 0.38 * p.dims; if (parts.dims) parts.dims.visible = p.dims > 0.004;
    if (parts.cracks) { parts.cracks.geometry.setDrawRange(0, Math.round(parts.crackSegs * p.crack) * 2); parts.cracks.visible = !p.broken; }
    if (parts.wire) parts.wire.visible = !p.broken;
    anchorMat.opacity = 0.86 * p.anchor; if (parts.baseSolid) parts.baseSolid.visible = p.anchor > 0.5;
    if (parts.filament) parts.filament.visible = p.anchor > 0.004; if (parts.base) parts.base.visible = p.anchor > 0.004;
    // pointer over a fragment (fine pointers): screen-space test against last frame's projection
    if (fine && pointer && p.settle > 0.5) parts.frags.forEach((f, i) => { const s = screen[i]; const inside = s && pointer.x >= s.l && pointer.x <= s.rt && pointer.y >= s.t && pointer.y <= s.b; f.hoverT = inside ? 1 : (f.hoverT === 1 && !f.viaLabel ? 0 : f.hoverT); });
    let moving = false;
    parts.frags.forEach((f) => { if (!f) return; f.obj.visible = p.broken; place(f, p, st.view, p.settle, dt, now); if (f.hover !== f.hoverT) moving = true; });
    if (parts.points) {
      const u = parts.points.material.uniforms;
      parts.points.visible = p.broken && p.release > 0;
      u.uRelease.value = p.release;
      u.uAlpha.value = 0.28 * Math.min(1, p.release / 0.12);
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
    const off = () => { const f = parts.frags[i]; if (f) { f.hoverT = 0; f.viaLabel = false; wake(); } };
    if (fine) { el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off); }
    el.addEventListener('focus', on); el.addEventListener('blur', off);
  });
  if (fine) {
    stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; wake(); }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointer = null; parts.frags.forEach((f) => { if (!f.viaLabel) f.hoverT = 0; }); wake(); });
  }
  stage.addEventListener('click', (e) => {                            // a tap on a fragment goes where its label goes (Gate 4 adds the camera move)
    if (e.target.closest('a')) return;
    const r = stage.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    const hit = parts.frags.findIndex((f, i) => { const s = screen[i]; return s && labels[i] && labels[i].style.pointerEvents === 'auto' && x >= s.l && x <= s.rt && y >= s.t && y <= s.b; });
    if (hit >= 0) { const f = parts.frags[hit]; f.hoverT = 1; wake(); setTimeout(() => { location.href = labels[hit].href; }, 120); }
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
  return { engine, ready, parts, group, camera, scene, renderer, poseAt, screen, get portrait() { return portrait; } };
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
