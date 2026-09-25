/* Quiet Bands · Secure Plate
   The visual system on top of the spatial engine. Four optical planes in one shallow volume.
   From the front they project as ONE object (each plane is scaled to cancel its perspective);
   change the viewing angle and the planes move relative to their depth. */
import { createSpatialEngine, clamp, smooth } from './spatial-engine.js';

export const P = 900;            // perspective distance, matches --P in CSS
export const K = 64;             // px of parallax per unit view angle at the front of the volume
export const PIVOT = -170;       // the depth that stays still under a change of angle: planes in front move with it, behind move against it
export const RANGE = 234;        // depth span that maps to one unit of parallax
export const HOLO_DEBUG = typeof location !== 'undefined' && /[?&]holo=1/.test(location.search);

export const LAYERS = [
  { id: 'intel',    depth: -240, parallaxX: 1, parallaxY: 0.85, rotationX: 0.4, rotationY: 0.4, holdDistance: -100, holdX: 0, holdY: 22,  material: 'ceramic',  lightingResponse: 0 },
  { id: 'evidence', depth: -120, parallaxX: 1, parallaxY: 0.85, rotationX: 0.7, rotationY: 0.7, holdDistance: -30,  holdX: 0, holdY: 7,   material: 'smoked',   lightingResponse: 0.3 },
  { id: 'analysis', depth: -36,  parallaxX: 1, parallaxY: 0.85, rotationX: 0.9, rotationY: 0.9, holdDistance: 40,   holdX: 0, holdY: -8,  material: 'film',     lightingResponse: 0 },
  { id: 'security', depth: 64,   parallaxX: 1, parallaxY: 0.85, rotationX: 1.1, rotationY: 1.1, holdDistance: 110,  holdX: 0, holdY: -24, material: 'laminate', lightingResponse: 1 },
];

/** Scroll timeline. Six states: SEALED · SEPARATION · ENTRY · INTELLIGENCE · REASSEMBLY · RESOLUTION. */
export function timeline(p) {
  p = clamp(p);
  const sep = smooth((p - 0.10) / 0.18) * (1 - smooth((p - 0.72) / 0.16));
  const travel = smooth((p - 0.28) / 0.26) * (1 - smooth((p - 0.70) / 0.18));
  const camZ = travel * 700;
  const win = (a, b, f = 0.05) => smooth((p - a) / f) * (1 - smooth((p - b) / f));
  const caps = [1 - smooth((p - 0.04) / 0.08), win(0.30, 0.46), win(0.54, 0.70)];
  const wake = win(0.48, 0.74, 0.06);
  const final = smooth((p - 0.9) / 0.1);
  return { sep, travel, camZ, caps, wake, final };
}

/** Planes that pass the camera fade out rather than clipping through it. */
export function depthOpacity(z) { return 1 - smooth((z - 420) / 200); }

/** Project one plane. v = { viewX, viewY, sep, camZ, rot, viewW } */
export function project(L, v) {
  const zLive = L.depth + v.sep * L.holdDistance;
  const f = (zLive - PIVOT) / RANGE;
  const x = v.viewX * K * f * L.parallaxX * v.viewW + v.sep * L.holdX;
  const y = v.viewY * K * f * L.parallaxY * v.viewW + v.sep * L.holdY;
  const z = zLive + v.camZ;
  const rx = -v.viewY * v.rot * (L.rotationX - 1) * 0.6, ry = v.viewX * v.rot * (L.rotationY - 1) * 0.6;
  const scale = (P - L.depth) / P;                 // cancels the rest perspective: all planes project to the same rectangle from the front
  return { x, y, z, rx, ry, scale, o: depthOpacity(z) };
}

/** How awake the hidden layer is: from angle (the lenticular principle), from inspection, from the scroll timeline. */
export function wakeOf(viewX, viewW, inspection, tlWake) {
  const angle = smooth((Math.abs(viewX) * viewW - 0.18) / 0.5);
  return clamp(Math.max(angle * 0.7, inspection, tlWake));
}

export function createPlate(root) {
  const scene = root.querySelector('#scene'), object = root.querySelector('#plate');
  const track = root.querySelector('#track'), stage = root.querySelector('#stage');
  const hint = root.querySelector('#hint'), finalEl = root.querySelector('#final'), env = root.querySelector('#env');
  const caps = [...root.querySelectorAll('.cap')];
  const lightEls = [...root.querySelectorAll('.holo, .spec')];
  const energyEls = [...root.querySelectorAll('[data-energy]')];
  const nodes = [...root.querySelectorAll('.hidden-node')];
  const hiddenPath = root.querySelector('#hidden');
  const els = {}; LAYERS.forEach((L) => { els[L.id] = root.querySelector(`[data-layer="${L.id}"]`); });
  const ROT_REST = 3.5, ROT_INSPECT = 5;
  let holo = 0;

  function render(st, dt) {
    const tl = timeline(st.scroll);
    const viewW = 1 - tl.travel * 0.7;
    const sep = clamp(st.inspection * (1 - tl.travel) + tl.sep + st.hover * 0.08 + st.press * 0.04, 0, 1.3);
    const rot = st.mode === 'INSPECT' ? ROT_INSPECT : ROT_REST;
    const v = { viewX: st.view.x, viewY: st.view.y, sep, camZ: tl.camZ - st.inspection * (1 - tl.travel) * 60, rot, viewW };

    // whole volume: restrained rotation; the depth comes from relative motion
    object.style.transform = `rotateX(${(-st.view.y * rot * viewW).toFixed(2)}deg) rotateY(${(st.view.x * rot * viewW).toFixed(2)}deg)`;

    LAYERS.forEach((L) => {
      const t = project(L, v), el = els[L.id];
      el.style.transform = `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, ${t.z.toFixed(1)}px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg) scale(${t.scale.toFixed(4)})`;
      el.style.opacity = t.o.toFixed(3);
      el.style.visibility = t.o > 0.005 ? 'visible' : 'hidden';
    });

    // optical material on the security plane: a narrow spectral response that travels with the viewing angle
    holo += (clamp(st.viewSpeed * 1.4) - holo) * (st.viewSpeed > holo ? 0.35 : 1 - Math.exp(-dt / 420));
    const angle = Math.hypot(st.view.x, st.view.y);
    const q = (n) => (Math.round(n * 2) / 2).toFixed(1) + '%';
    const lx = q(50 + st.view.x * 30), ly = q(50 + st.view.y * 30);   // the reflection stays on the visible part of the plate
    const holoV = HOLO_DEBUG ? 0.9 : clamp(angle * 1.1) * 0.42 + holo * 0.18 + st.inspection * 0.1;
    const holoS = (Math.round(holoV * 100) / 100).toFixed(2);
    const specS = (Math.round((0.02 + Math.abs(st.view.x) * 0.08 + holo * 0.05) * 100) / 100).toFixed(2);
    lightEls.forEach((el) => { el.style.setProperty('--lx', lx); el.style.setProperty('--ly', ly); el.style.setProperty('--holo', holoS); el.style.setProperty('--spec', specS); });

    // purple is energy: mostly black at rest, apparent under interaction
    const wake = wakeOf(st.view.x, viewW, st.inspection, tl.wake);
    const e = clamp(angle * 0.5 * viewW + st.inspection * 0.85 + tl.wake + holo * 0.25 + tl.sep * 0.25);
    const eS = (Math.round(e * 100) / 100).toFixed(2);
    energyEls.forEach((el) => el.style.setProperty('--e', eS));
    if (env) env.style.opacity = (e * 0.55).toFixed(3);

    // the hidden path wakes node by node from the side the viewer leans to; fully under inspection or in the timeline
    if (hiddenPath) hiddenPath.style.setProperty('--w', wake.toFixed(3));
    const n = nodes.length, dir = st.view.x < 0 ? -1 : 1;
    nodes.forEach((node, i) => {
      const order = dir > 0 ? i : n - 1 - i;
      const w = smooth((wake - (order / n) * 0.55) / 0.45);
      node.style.setProperty('--w', w.toFixed(3));
    });

    caps.forEach((c, i) => { const k = tl.caps[i]; c.style.opacity = k.toFixed(3); c.style.transform = `translate3d(0, ${((1 - k) * 14).toFixed(1)}px, 0)`; });
    finalEl.classList.toggle('on', tl.final > 0.6);
    return holo > 0.004;
  }

  const engine = createSpatialEngine({ scene, object, track, stage, hint, render, labels: { ask: 'Activate depth →', ready: 'Tilt · Hold · Scroll' } });
  return { engine, LAYERS, timeline };
}

if (typeof window !== 'undefined' && document.getElementById('plate')) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) { document.documentElement.classList.add('js'); window.QB_PLATE = createPlate(document); }
}
