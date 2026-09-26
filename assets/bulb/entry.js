/* Quiet Bands · Bulb Entry · runtime
   A wireframe lightbulb on near-black. Scroll is one progress value t (0..1); every pose is a pure function of t
   (map.js), so the sequence reverses by construction. Tilt and pointer come from the lab's spatial engine, unchanged.
   Gate 2: whole bulb, cracks growing across the glass from the impact point, rotation about the vertical axis.
   Later gates: separation along the cracks, settle, parallax on the fragments, the debris. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpatialEngine } from '/assets/lab/spatial-engine.js';
import { poseAt } from './map.js';
export { poseAt, MAP, ROTATION, seg } from './map.js';

export const GROUND = 0x0B0A09;
export const LINE = 0xE8DCC2;
export const LIVE = 0xFF5A1F;        // interactive only; fixed against the reference at Gate 2
export const IMPACT = { x: 0.75, y: 0.75, z: 0.55 };   // where the glass was struck: upper right, facing the viewer. Cracks grow from here.

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
  // Dijkstra over the crack graph; a component the impact cannot reach starts from its own nearest node, later
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

/* ---------- runtime ---------- */
export function createEntry(root) {
  const track = root.getElementById('track'), stage = root.getElementById('stage'), canvas = root.getElementById('bulb');
  const mark = root.querySelector('.mark');
  const mobile = window.matchMedia('(max-width: 760px)');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(GROUND, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GROUND, 6, 10);                            // depth as contrast: the far side of the bulb sits back. Set per camera distance in frame().
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  const group = new THREE.Group();                                     // the bulb; rotated as one for the turn
  scene.add(group);

  const lineMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.86, fog: true });
  const crackMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 1.0, fog: true });
  const dimMat = new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0.38, fog: true });
  const occluder = new THREE.MeshBasicMaterial({ color: GROUND, fog: false });   // the metal base is solid: it hides what is behind it

  const parts = { shells: [], wire: null, cracks: null, crackSegs: 0, base: null, baseGeom: null, filament: null, dims: null, debris: null };
  const box = new THREE.Box3();                                        // the bulb's own extent, before any rotation

  function frame() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (box.isEmpty()) return;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const size = new THREE.Vector3(); box.getSize(size);
    const portrait = h > w;
    let z, vh;
    if (portrait) {
      // fit the object and its dimension marks inside the width with a margin; the object sits in the upper part, the air is below
      const vw = size.x * 1.18; vh = vw / camera.aspect; z = vh / (2 * tan);
      group.position.set(-(box.min.x + box.max.x) / 2, 0.38 * vh - box.max.y, 0);
    } else {
      vh = size.y * 1.32; z = vh / (2 * tan);
      group.position.set(0, -(box.min.y + box.max.y) / 2 + 0.03 * vh, 0);   // the bulb's axis on the centre line; the marks hang to its right
    }
    camera.position.set(0, 0, z);
    scene.fog.near = z - 1.2; scene.fog.far = z + 2.6;                 // no haze on the near face; the far face sits back
  }

  function build(gltf) {
    gltf.scene.traverse((o) => {
      if (!o.isMesh && !o.isLineSegments && !o.isPoints) return;
      const name = o.name || '';
      if (/^shell_\d+$/.test(name)) {
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 4), lineMat); lines.name = name;
        lines.visible = false;                                         // the fragments take over at separation (Gate 3)
        parts.shells.push(lines); group.add(lines);
      } else if (name === 'shell_wire') {
        parts.wire = new THREE.LineSegments(o.geometry, lineMat); group.add(parts.wire);
      } else if (name === 'cracks') {
        const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
        const ordered = orderCracks(src.attributes.position.array, IMPACT);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(ordered, 3));
        parts.crackSegs = ordered.length / 6;
        parts.cracks = new THREE.LineSegments(g, crackMat); parts.cracks.geometry.setDrawRange(0, 0); group.add(parts.cracks);
      } else if (name === 'base') {
        const solid = new THREE.Mesh(o.geometry, occluder); solid.renderOrder = 0;
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 1), lineMat); lines.renderOrder = 1;
        parts.base = new THREE.Group(); parts.base.add(solid, lines); parts.baseGeom = o.geometry; group.add(parts.base);
      } else if (name === 'filament') {
        parts.filament = new THREE.LineSegments(o.geometry, lineMat); group.add(parts.filament);
      } else if (name === 'dims') {
        parts.dims = new THREE.LineSegments(o.geometry, dimMat); group.add(parts.dims);
      } else if (name === 'debris') {
        parts.debris = o.geometry;                                     // Gate 3: the particles
      }
    });
    box.makeEmpty();
    for (const g of [parts.wire && parts.wire.geometry, parts.baseGeom, parts.dims && parts.dims.geometry]) if (g) { g.computeBoundingBox(); box.union(g.boundingBox); }
    frame();
  }

  function render(st) {
    const t = st.scroll;
    const p = poseAt(t);
    group.rotation.y = p.rot + st.view.x * 0.10;                       // a restrained response to tilt: the whole object turns a little
    group.rotation.x = st.view.y * 0.06;
    if (mark) { mark.style.opacity = p.text.toFixed(3); mark.style.transform = `translate3d(0, ${((1 - p.text) * 10).toFixed(1)}px, 0)`; }
    dimMat.opacity = 0.38 * p.dims; if (parts.dims) parts.dims.visible = p.dims > 0.004;
    if (parts.cracks) parts.cracks.geometry.setDrawRange(0, Math.round(parts.crackSegs * p.crack) * 2);
    renderer.render(scene, camera);
    return false;                                                      // nothing keeps moving on its own yet
  }

  const engine = createSpatialEngine({ scene: stage, object: stage, track, stage, hint: null, render, hold: false, drag: 'relative', permission: 'gesture' });
  frame();
  window.addEventListener('resize', () => { frame(); engine.wake(); }, { passive: true });

  const loader = new GLTFLoader();
  const ready = loader.loadAsync('/assets/bulb/bulb.glb?v=2').then((gltf) => { build(gltf); engine.wake(); return parts; });

  if (/[?&]debug/.test(location.search)) {
    const d = document.createElement('div'); d.id = 'dbg';
    d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;font:11px/1.4 ui-monospace,monospace;color:#FF5A1F;pointer-events:none;white-space:pre';
    document.body.appendChild(d);
    const tick = () => { const s = engine.state; d.textContent = `sensor ${s.orientation}  view ${s.view.x.toFixed(2)} ${s.view.y.toFixed(2)}  t ${s.scroll.toFixed(3)}  ${s.mode}`; requestAnimationFrame(tick); };
    tick();
  }
  return { engine, ready, parts, group, camera, scene, renderer, poseAt };
}

/* ---------- boot ---------- */
if (typeof window !== 'undefined' && document.getElementById('bulb')) {
  const html = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (reduced || !gl) {
    html.classList.add(reduced ? 'rm' : 'nogl');                      // the still: the whole bulb as an SVG and the four links as a list
  } else {
    try {
      html.classList.add('live');
      window.QB_ENTRY = createEntry(document);
      window.QB_ENTRY.ready.catch(() => { html.classList.remove('live'); html.classList.add('nogl'); });
    } catch (err) {
      html.classList.remove('live'); html.classList.add('nogl');
    }
  }
}
