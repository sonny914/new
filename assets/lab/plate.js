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

/** Scroll timeline. Four beats: SEALED · OPEN · INSIDE · RESOLVED. */
export function timeline(p) {
  p = clamp(p);
  const sep = smooth((p - 0.10) / 0.16) * (1 - smooth((p - 0.72) / 0.16));
  const travel = smooth((p - 0.30) / 0.24) * (1 - smooth((p - 0.70) / 0.18));
  const camZ = travel * 700;
  const win = (a, b, f = 0.05) => smooth((p - a) / f) * (1 - smooth((p - b) / f));
  const caps = [win(0.12, 0.32), win(0.50, 0.68)];
  const wake = win(0.46, 0.74, 0.06);
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

/** How awake the real path is: from angle (the lenticular principle), from inspection, from the scroll timeline. */
export function wakeOf(viewX, viewW, inspection, tlWake) {
  const angle = smooth((Math.abs(viewX) * viewW - 0.18) / 0.5);
  return clamp(Math.max(angle * 0.7, inspection, tlWake));
}

export function createPlate(root) {
  const scene = root.querySelector('#scene'), object = root.querySelector('#plate');
  const track = root.querySelector('#track'), stage = root.querySelector('#stage');
  const hint = root.querySelector('#hint'), finalEl = root.querySelector('#final');
  const caps = [...root.querySelectorAll('.cap')];
  const lightEls = [...root.querySelectorAll('.holo, .spec')];
  const energyEls = [...root.querySelectorAll('[data-energy]')];
  const shadowEls = [root.querySelector('.l-security'), root.querySelector('.l-analysis'), root.querySelector('.l-evidence')].filter(Boolean);
  const nodes = [...root.querySelectorAll('.hidden-node')];
  const real = root.querySelector('#hidden'), documented = root.querySelector('#documented');
  const els = {}; LAYERS.forEach((L) => { els[L.id] = root.querySelector(`[data-layer="${L.id}"]`); });
  // everything else in the window is an object at a depth too: it parallaxes against the plate and is left behind when the camera enters
  const volume = root.querySelector('#volume');
  const world = [...root.querySelectorAll('.world')].map((el) => ({ el, depth: parseFloat(el.dataset.depth) || 0, cx: 0, cy: 0 }));
  let origin = { x: 0, y: 0 };
  function measure() {
    const r = volume.getBoundingClientRect(); origin = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.46 };
    world.forEach((w) => { const b = w.el.getBoundingClientRect(); w.cx = b.left + b.width / 2 - origin.x; w.cy = b.top + b.height / 2 - origin.y; });
  }
  const ROT_REST = 3.5, ROT_INSPECT = 5;
  const BOOT_MS = 700;                             // the one self-driven moment: light sweeps the laminate once when the plate powers on
  let holo = 0, born = 0;

  function render(st, dt, now) {
    if (!born) born = now;
    const boot = clamp((now - born) / BOOT_MS);
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
    // contact shadow only while the planes are apart
    const sS = clamp(sep).toFixed(2);
    shadowEls.forEach((el) => el.style.setProperty('--s', sS));

    // optical material on the laminate: a narrow spectral response that travels with the viewing angle
    holo += (clamp(st.viewSpeed * 1.4) - holo) * (st.viewSpeed > holo ? 0.35 : 1 - Math.exp(-dt / 420));
    const angle = Math.hypot(st.view.x, st.view.y);
    const q = (n) => (Math.round(n * 2) / 2).toFixed(1) + '%';
    const sweep = 1 - Math.pow(1 - boot, 3);
    const lx = boot < 1 ? q(-10 + sweep * 120) : q(50 + st.view.x * 30), ly = q(50 + st.view.y * 30);
    const holoV = HOLO_DEBUG ? 0.9 : Math.max(clamp(angle * 1.1) * 0.42 + holo * 0.18 + st.inspection * 0.1, boot < 1 ? 0.5 * (1 - boot) : 0);
    const holoS = (Math.round(holoV * 100) / 100).toFixed(2);
    const specS = (Math.round((0.02 + Math.abs(st.view.x) * 0.08 + holo * 0.05 + (boot < 1 ? 0.12 * (1 - boot) : 0)) * 100) / 100).toFixed(2);
    lightEls.forEach((el) => { el.style.setProperty('--lx', lx); el.style.setProperty('--ly', ly); el.style.setProperty('--holo', holoS); el.style.setProperty('--spec', specS); });

    // purple is energy: black at rest, apparent under interaction. Set on the elements that use it.
    const wake = wakeOf(st.view.x, viewW, st.inspection, tl.wake);
    const e = clamp(angle * 0.5 * viewW + st.inspection * 0.85 + tl.wake + holo * 0.25 + tl.sep * 0.25);
    const eS = (Math.round(e * 100) / 100).toFixed(2);
    energyEls.forEach((el) => el.style.setProperty('--e', eS));
    els.intel.style.setProperty('--e', eS);
    // the annotation is a sentence: it appears when the plate is opened or entered, never from a glance
    els.analysis.style.setProperty('--n', clamp(Math.max(st.inspection, tl.wake)).toFixed(2));

    // substitution, not addition: the documented path recedes as the real one lights, node by node from the side the viewer leans to
    const wS = wake.toFixed(3);
    if (real) real.style.setProperty('--w', wS);
    if (documented) documented.style.setProperty('--w', wS);
    const n = nodes.length, dir = st.view.x < 0 ? -1 : 1;
    nodes.forEach((node, i) => {
      const order = dir > 0 ? i : n - 1 - i;
      node.style.setProperty('--w', smooth((wake - (order / n) * 0.55) / 0.45).toFixed(3));
    });

    // world objects: parallax by depth, scaled so they project where they lay out, fading as the camera passes them
    const camZ = tl.camZ;
    world.forEach((w) => {
      const f = (w.depth - PIVOT) / RANGE, comp = (P - w.depth) / P;
      const x = st.view.x * K * f * viewW + w.cx * (comp - 1), y = st.view.y * K * 0.85 * f * viewW + w.cy * (comp - 1);
      const z = w.depth + camZ;
      w.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(1)}px) scale(${comp.toFixed(4)})`;
      w.el.style.setProperty('--dz', depthOpacity(z + 200).toFixed(3));
    });
    caps.forEach((c, i) => { const k = tl.caps[i]; c.style.opacity = k.toFixed(3); });
    finalEl.classList.toggle('on', tl.final > 0.6);
    return holo > 0.004 || boot < 1;
  }

  measure(); window.addEventListener('resize', measure, { passive: true });
  const engine = createSpatialEngine({ scene, object, track, stage, hint, render, labels: { ask: 'Enter spatial view →', ready: '' } });
  if (hint) {
    // the button exists only for the iOS sensor grant; once granted, or where no grant is needed, there is nothing to say
    const show = () => { hint.hidden = !hint.classList.contains('ask'); };
    new MutationObserver(show).observe(hint, { attributes: true, attributeFilter: ['class'] });
    show();
  }
  return { engine, LAYERS, timeline };
}

if (typeof window !== 'undefined' && document.getElementById('plate')) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) { document.documentElement.classList.add('js'); window.QB_PLATE = createPlate(document); }
}
