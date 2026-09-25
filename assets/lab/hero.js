/* Quiet Bands · QB Spatial Hero
   The screen is a window into an information volume. Nothing is painted on the glass: every object has a depth.
   The line REQUEST — COMPLETE is the fixed reference. Six words stand edge-on in it; a change of viewing angle turns
   them open and displaces each by its depth, so they fan out of the line. Return to the front and they close to nothing. */
import { createSpatialEngine, clamp, smooth } from './spatial-engine.js';

export const P = 900;              // perspective distance, matches --P in CSS
export const K = 70;               // px of parallax per unit view angle at depth ZREF
export const ZREF = 300;           // depth that gets K px; the line (depth 0) never moves
export const TILT_DEG = 18;        // phone tilt that maps to a full unit of view
export const OPEN_GAIN = 3.2;      // slat opening per degree of viewing angle (18° of tilt opens 58°)
export const APPROACH_GAIN = 8;    // the same, for the angle gained by moving closer to an off-axis slat
export const OPEN_MAX = 62;
export const TRAVEL = 1100;        // camera travel over the full scroll; the resolution sits at −1100
export const DRIFT = 0.6;
export const PAN = 0.5;            // fraction of the travel over which the camera pans to aim at the line, so the passage happens at the centre of the window         // the camera drifts slightly off-axis as it goes in, so the passage is seen from the side
export const SLATS = ['Email', 'Spreadsheet', 'Handoff', 'Wait', 'Exception', 'Rework'].map((word, i) => ({ word, depth: -70 * (i + 1), t: 0.16 + 0.14 * i }));

export function timeline(p) {
  const travel = smooth((clamp(p) - 0.04) / 0.9);
  // the viewer steps aside early on the way in, then goes straight: the drift is complete by 60% of the travel
  return { travel, camZ: travel * TRAVEL, drift: DRIFT * smooth(travel / 0.6), pan: smooth(travel / PAN) };
}
export function depthOpacity(z) { return 1 - smooth((z - 420) / 200); }
/** Parallax by depth relative to the camera: the plane the camera is on never moves under a change of angle. */
export function parallax(depth, viewX, viewY, camZ = 0) { const f = (depth + camZ) / ZREF; return { x: viewX * K * f, y: viewY * K * 0.85 * f }; }
/** Scale that makes an object project at its layout size and place when the camera is at `arrive` (0 = from the front). */
export function compensation(depth, arrive = 0) { return (P - depth - arrive) / P; }

/** How far a slat is open, in degrees, from the viewing angle and from the angle gained by approach. xw = its x from the camera axis. */
export function slatOpen(slat, sceneView, xw, camZ) {
  const tilt = Math.abs(sceneView) * TILT_DEG * OPEN_GAIN;
  const dist = Math.max(40, P - (slat.depth + camZ)), distRest = P - slat.depth;
  const approach = Math.abs(Math.atan2(xw, dist) - Math.atan2(xw, distRest)) * (180 / Math.PI) * APPROACH_GAIN;
  return clamp(tilt + approach, 0, OPEN_MAX);
}
/** Text on a plane reads from about 30°. Purple is the state of having become legible. */
export function slatState(open) { return { visible: open > 4, purple: smooth((open - 28) / 12), legible: open >= 30 }; }

export function createHero(root) {
  const volume = root.querySelector('#volume'), track = root.querySelector('#track'), stage = root.querySelector('#stage');
  const world = [...root.querySelectorAll('.world')].map((el) => ({ el, depth: parseFloat(el.dataset.depth) || 0, arrive: parseFloat(el.dataset.arrive) || 0, base: el.dataset.base == null ? 1 : parseFloat(el.dataset.base), cx: 0, cy: 0 }));
  const slats = [...root.querySelectorAll('.slat')].map((el, i) => ({ el, ...SLATS[i], cx: 0, cy: 0 }));
  const spec = root.querySelector('.spec');
  const finalEl = root.querySelector('.final'), res = root.querySelector('.res'), lineEl = root.querySelector('.line');
  let lineX = 0, lineY = 0;   // the line's layout position relative to the centre: where the camera aims as it goes in
  let origin = { x: 0, y: 0 };
  function measure() {
    const r = volume.getBoundingClientRect(); origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const at = (o) => { const b = o.el.getBoundingClientRect(); o.cx = b.left + b.width / 2 - origin.x; o.cy = b.top + b.height / 2 - origin.y; };
    world.forEach(at); slats.forEach(at);
    const l = world.find((w) => w.el === lineEl); lineX = l ? l.cx : 0; lineY = l ? l.cy : 0;
  }
  let sheen = 0;

  function render(st, dt) {
    const tl = timeline(st.scroll);
    const sceneView = st.view.x + tl.drift;           // the viewing angle, including the drift of the way in
    const camZ = tl.camZ, panX = lineX * tl.pan, panY = lineY * tl.pan;   // a camera pan is the same shift for every object before projection
    const q2 = (n) => n.toFixed(2);

    world.forEach((w) => {
      const comp = compensation(w.depth, w.arrive), px = parallax(w.depth, sceneView, st.view.y, camZ);
      const z = w.depth + camZ;
      const x = px.x + w.cx * (comp - 1) - panX, y = px.y + w.cy * (comp - 1) - panY;
      w.el.style.transform = `translate3d(${q2(x)}px, ${q2(y)}px, ${z.toFixed(1)}px) scale(${comp.toFixed(4)})`;
      let o = w.base * depthOpacity(z);
      if (w.el === finalEl) o = smooth((camZ - 250) / 700) * depthOpacity(z);   // nothing until the camera is well inside; contrast rises as it reaches it
      w.el.style.opacity = o.toFixed(3);
      w.el.style.visibility = o > 0.004 ? 'visible' : 'hidden';
    });

    const dir = sceneView < 0 ? -1 : 1;
    slats.forEach((s) => {
      const comp = compensation(s.depth), px = parallax(s.depth, sceneView, st.view.y, camZ);
      const z = s.depth + camZ;
      const xw = s.cx + px.x;                                   // where it stands relative to the camera axis
      const open = slatOpen(s, sceneView, xw, camZ), state = slatState(open);
      // the stratum shares one Y origin: it separates by X, depth, scale and occlusion, never by a per-depth Y step
      const x = px.x + s.cx * (comp - 1) - panX, y = s.cy * (comp - 1) - panY;
      s.el.style.transform = `translate3d(${q2(x)}px, ${q2(y)}px, ${z.toFixed(1)}px) rotateY(${(dir * (90 - open)).toFixed(2)}deg) scale(${comp.toFixed(4)})`;
      const o = state.visible ? depthOpacity(z) : 0;
      s.el.style.opacity = o.toFixed(3);
      s.el.style.visibility = o > 0.004 ? 'visible' : 'hidden';
      s.el.style.setProperty('--p', state.purple.toFixed(3));
    });

    // the glass: an anti-reflective coating whose specular travels with the viewing angle, brighter while the view moves
    sheen += (clamp(st.viewSpeed * 1.2) - sheen) * (st.viewSpeed > sheen ? 0.35 : 1 - Math.exp(-dt / 500));
    if (spec) { spec.style.setProperty('--lx', (50 + sceneView * 34).toFixed(1) + '%'); spec.style.setProperty('--ly', (50 + st.view.y * 30).toFixed(1) + '%'); spec.style.setProperty('--sp', (0.016 + Math.abs(sceneView) * 0.02 + sheen * 0.03).toFixed(3)); }

    if (finalEl) finalEl.classList.toggle('on', camZ > TRAVEL - 120);
    if (res) res.style.setProperty('--near', smooth((camZ - 700) / 380).toFixed(3));
    return sheen > 0.004;
  }

  measure(); window.addEventListener('resize', measure, { passive: true });
  const engine = createSpatialEngine({ scene: volume, object: volume, track, stage, hint: null, render, hold: false, drag: 'relative', permission: 'gesture' });
  return { engine, measure, SLATS, timeline };
}

if (typeof window !== 'undefined' && document.getElementById('volume')) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) { document.documentElement.classList.add('js'); window.QB_HERO = createHero(document); }
}
