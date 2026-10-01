/* QUIET BANDS — SPATIAL DOSSIER v0.1 · controller
   One state, one frame loop. Touch exploration, press-and-hold inspection and scroll travel all resolve
   into the same per-layer transform, so they blend instead of fighting. No libraries. */

const P = 1000;                 // perspective distance (matches --P in CSS)
const K = 46;                   // px of layer parallax per unit tilt (front plane); rear planes counter-move
const ROT_REST = 5, ROT_INSPECT = 7;   // degrees of whole-object tilt: the depth comes from relative motion, not from rotating the stack
/* Development aid: ?holo=1 exaggerates the optical reflection so its behaviour is unmistakable. Production: off. */
const HOLO_DEBUG = typeof location !== 'undefined' && /[?&]holo=1/.test(location.search);
const HOLD_MS = 320;            // press-and-hold arming time
const MOVE_PX = 8;

/* Layer configuration. px/py: parallax rate (1 = front). holdZ/X/Y: where the layer goes when the file opens.
   rot: how much more than the group this layer rotates (adds thickness to the parallax). */
const LAYERS = [
  /* px/py: parallax ratio (1 = front). Rear planes negative: they slide the other way, so the eye sees between the planes. */
  { id: 'verdict',   baseZ: -230, px: -0.28, py: -0.22, holdZ: -20,  holdX: 0,   holdY: 0,   rot: 0.10 },
  { id: 'shadow',    baseZ: -200, px: -0.25, py: -0.20, holdZ: -60,  holdX: 0,   holdY: 0,   rot: 0.10 },
  { id: 'stack',     baseZ: -170, px: -0.18, py: -0.15, holdZ: -110, holdX: 14,  holdY: -70, rot: 0.25 },
  { id: 'acrylic',   baseZ: -120, px: -0.02, py: -0.02, holdZ: -90,  holdX: 6,   holdY: -48, rot: 0.40 },
  { id: 'plate',     baseZ: -60,  px:  0.28, py:  0.22, holdZ: -60,  holdX: 18,  holdY: -40, rot: 0.60 },
  { id: 'photo',     baseZ:  0,   px:  0.55, py:  0.45, holdZ: -10,  holdX: -10, holdY: -64, rot: 0.80 },
  { id: 'glass',     baseZ:  55,  px:  0.80, py:  0.68, holdZ:  36,  holdX: 14,  holdY: -92, rot: 1.00 },
  { id: 'ink',       baseZ:  85,  px:  0.90, py:  0.78, holdZ:  70,  holdX: 16,  holdY: 72,  rot: 1.05 },
  { id: 'text',      baseZ:  105, px:  1.00, py:  0.88, holdZ:  90,  holdX: 8,   holdY: 58,  rot: 1.10 },
  { id: 'front',     baseZ:  135, px:  1.15, py:  1.00, holdZ: 120,  holdX: 6,   holdY: 0,   rot: 1.20 },
];

/* ---------- pure helpers ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Soft boundary: past ±1 the value keeps moving but with rising resistance (Apple's rubber-band). */
export function rubberband(v, limit = 1, c = 0.55) {
  const over = Math.abs(v) - limit; if (over <= 0) return v;
  return Math.sign(v) * (limit + (over * c) / (1 + c * over));
}
/** Critically damped spring step: no overshoot, carries velocity, settles by parameters not duration. */
export function springStep(x, v, target, dt, response = 0.42) {
  const w = 2 * Math.PI / response, k = w * w, c = 2 * w;   // damping ratio 1.0
  // semi-implicit Euler in ≤4ms substeps: stable for any frame length the browser hands us
  let left = Math.min(dt, 0.1);
  while (left > 0) {
    const h = Math.min(left, 0.004); left -= h;
    v += (-k * (x - target) - c * v) * h; x += v * h;
  }
  return [x, v];
}
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const outCubic = (k) => 1 - Math.pow(1 - clamp(k), 3);
const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k)));

/** Scroll timeline. p 0..1 → camera travel, scroll separation, travel weight, captions, final. */
export function timeline(p) {
  p = clamp(p);
  let camZ = 0, sep = 0;
  if (p < 0.12) { camZ = lerp(0, 120, smooth(p / 0.12)); }
  else if (p < 0.28) { const k = smooth((p - 0.12) / 0.16); camZ = lerp(120, 220, k); sep = k; }
  else if (p < 0.72) { const k = (p - 0.28) / 0.44; camZ = lerp(220, 760, k); sep = 1; }
  else if (p < 0.9) { const k = smooth((p - 0.72) / 0.18); camZ = lerp(760, 60, k); sep = lerp(1, 0.35, k); }
  else { const k = smooth((p - 0.9) / 0.1); camZ = lerp(60, 0, k); sep = lerp(0.35, 0, k); }
  const travel = smooth((p - 0.2) / 0.2) * (1 - smooth((p - 0.76) / 0.16));
  const win = (a, b) => smooth((p - a) / 0.05) * (1 - smooth((p - b) / 0.05));
  const caps = [win(0.36, 0.47), win(0.5, 0.61), win(0.63, 0.74)];
  const final = smooth((p - 0.9) / 0.1);
  return { camZ, sep, travel, caps, final };
}

/** Depth → opacity. Planes fade as they approach the camera and hide once past it. */
export function depthOpacity(z) {
  if (z < 0.55 * P) return 1;
  return 1 - smooth((z - 0.55 * P) / (0.27 * P));
}

/** One layer's transform for a given state. Exported so it can be unit-tested. */
export function layerTransform(L, s) {
  const S = s.sep;
  const x = s.tilt.x * L.px * K * s.tiltW + S * L.holdX;
  const y = s.tilt.y * L.py * K * s.tiltW + S * L.holdY;
  const z = L.baseZ + S * L.holdZ + s.camZ;
  const extra = (L.rot - 1) * 0.9;
  const rx = -s.tilt.y * s.rot * extra, ry = s.tilt.x * s.rot * extra;
  return { x, y, z, rx, ry, o: depthOpacity(z) };
}

/* ---------- runtime ---------- */
export function createDossier(root) {
  const scene = root.querySelector('#scene'), dossier = root.querySelector('#dossier');
  const track = root.querySelector('#track'), stage = root.querySelector('#stage');
  const lens = root.querySelector('#lens'), hint = root.querySelector('#hint'), finalEl = root.querySelector('#final');
  const caps = [...root.querySelectorAll('.cap')];
  const lightEls = [...root.querySelectorAll('.holo, .holo-edge, .spec')];
  const lensFaces = [...root.querySelectorAll('.lens-a, .lens-b')];
  const els = {}; LAYERS.forEach((L) => { els[L.id] = root.querySelector(`[data-layer="${L.id}"]`); });
  const fine = window.matchMedia('(pointer: fine)').matches;

  // state: targets and smoothed currents
  const st = {
    mode: 'REST',
    tilt: { x: 0, y: 0 }, tiltT: { x: 0, y: 0 }, tiltV: { x: 0, y: 0 },
    press: 0, pressT: 0,
    hold: 0, holdT: 0, holdFrom: 0, holdStart: 0, holdDur: 900, holdEase: outExpo,
    scroll: 0, scrollT: 0,
    hover: 0, hoverT: 0, holo: 0,
  };
  let running = false, lastFrame = 0, lastKey = '';

  function setMode(m) { if (st.mode === m) return; st.mode = m; dossier.dataset.mode = m; dossier.classList.toggle('is-inspect', m === 'INSPECT'); }

  /* ---------- frame ---------- */
  function frame(now) {
    const dt = Math.min(48, now - (lastFrame || now)); lastFrame = now;
    const a = 1 - Math.exp(-dt / 90), b = 1 - Math.exp(-dt / 90);
    const px0 = st.tilt.x, py0 = st.tilt.y;
    // the tilt is a critically damped spring per axis: a release carries the finger's velocity; an interruption re-targets from the live value
    const sdt = dt / 1000;
    [st.tilt.x, st.tiltV.x] = springStep(st.tilt.x, st.tiltV.x, st.tiltT.x, sdt, ptr ? 0.2 : 0.42);
    [st.tilt.y, st.tiltV.y] = springStep(st.tilt.y, st.tiltV.y, st.tiltT.y, sdt, ptr ? 0.2 : 0.42);
    st.press += (st.pressT - st.press) * a;
    // material response: the spectral reflection is revealed by movement and decays at rest
    const v = Math.hypot(st.tilt.x - px0, st.tilt.y - py0) / Math.max(1, dt) * 1000; // tilt units per second
    st.holo += (clamp(v * 1.6) - st.holo) * (v > st.holo ? 0.35 : 1 - Math.exp(-dt / 420));
    st.scroll += (st.scrollT - st.scroll) * b;
    st.hover += (st.hoverT - st.hover) * a;
    // hold: time-based ease from holdFrom to holdT
    if (st.hold !== st.holdT) { const k = (now - st.holdStart) / st.holdDur; st.hold = k >= 1 ? st.holdT : lerp(st.holdFrom, st.holdT, st.holdEase(k)); }
    const pulse = 0;

    const tl = timeline(st.scroll);
    const tiltW = 1 - tl.travel * 0.7;
    const sep = clamp(st.hold * (1 - tl.travel) + tl.sep + pulse + st.hover * 0.1 + st.press * 0.05, 0, 1.4);
    const rot = st.mode === 'INSPECT' ? ROT_INSPECT : ROT_REST;
    const s = { tilt: st.tilt, tiltW, sep, camZ: tl.camZ - st.hold * (1 - tl.travel) * 90, rot };

    // whole object
    const gx = -st.tilt.y * rot * tiltW, gy = st.tilt.x * rot * tiltW;
    dossier.style.transform = `rotateX(${gx.toFixed(2)}deg) rotateY(${gy.toFixed(2)}deg)`;
    // light: the same normalized coordinates drive the specular band and the spectral sweep.
    // Written to the light elements themselves, never to the parent: a variable on the parent recalculates every child.
    const q = (v) => (Math.round(v * 2) / 2).toFixed(1) + '%';
    const ly = q(50 + st.tilt.y * 30);
    const angle = Math.hypot(st.tilt.x, st.tilt.y);            // distance from the neutral viewing angle
    const holoV = HOLO_DEBUG ? 0.85 : clamp(angle * 0.9) * 0.34 + st.holo * 0.16 + st.hold * 0.08;
    const lx = q(50 + st.tilt.x * 46);
    const holoS = (Math.round(holoV * 100) / 100).toFixed(2), specS = (Math.round((0.03 + Math.abs(st.tilt.x) * 0.1 + st.holo * 0.06) * 100) / 100).toFixed(2);
    lightEls.forEach((el) => { el.style.setProperty('--lx', lx); el.style.setProperty('--ly', ly); el.style.setProperty('--holo', holoS); el.style.setProperty('--spec', specS); });

    // layers
    LAYERS.forEach((L) => {
      const t = layerTransform(L, s), el = els[L.id];
      el.style.transform = `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, ${t.z.toFixed(1)}px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg) rotateZ(var(--tilt))`;
      const o = t.o;
      if (L.id === 'verdict') el.style.setProperty('--reveal', clamp(Math.max(sep * 1.3 - 0.1, tl.travel * 1.2)).toFixed(3));   // the method only exists once the file is opened
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o > 0.005 ? 'visible' : 'hidden';
    });

    // lenticular: horizontal viewing angle reveals what actually happens
    const lensV = clamp(smooth((st.tilt.x * tiltW - 0.12) / 0.5), 0, 1);
    const lensS = lensV.toFixed(3), shiftS = (st.tilt.x * 6).toFixed(2) + 'px';
    lensFaces.forEach((el) => { el.style.setProperty('--lens', lensS); el.style.setProperty('--shift', shiftS); });

    // captions and final state
    caps.forEach((c, i) => { const v = tl.caps[i]; c.style.opacity = v.toFixed(3); c.style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0) scale(${(0.96 + v * 0.04).toFixed(3)})`; });
    finalEl.classList.toggle('on', tl.final > 0.6);
    if (hint) hint.classList.toggle('off', st.scroll > 0.02 && st.scroll < 0.98);

    // mode from scroll
    if (st.mode !== 'INSPECT' && st.mode !== 'EXPLORE') setMode(st.scroll > 0.02 && st.scroll < 0.98 ? 'SCROLLING' : (st.scroll >= 0.98 ? 'ASSEMBLED' : 'REST'));

    const moving = st.holo > 0.004 || Math.abs(st.tiltT.x - st.tilt.x) > 0.0008 || Math.abs(st.tiltT.y - st.tilt.y) > 0.0008 || Math.abs(st.tiltV.x) > 0.002 || Math.abs(st.tiltV.y) > 0.002 || Math.abs(st.pressT - st.press) > 0.002 || Math.abs(st.scrollT - st.scroll) > 0.0004 || st.hold !== st.holdT || Math.abs(st.hoverT - st.hover) > 0.002;
    if (moving) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (!running) { running = true; lastFrame = 0; requestAnimationFrame(frame); } }

  /* ---------- scroll ---------- */
  function readScroll() {
    const r = track.getBoundingClientRect(), range = track.offsetHeight - stage.offsetHeight;
    st.scrollT = range > 0 ? clamp(-r.top / range) : 0; wake();
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll, { passive: true });

  /* ---------- touch / pointer ---------- */
  let ptr = null, holdTimer = 0;
  const assembled = () => st.scrollT < 0.03 || st.scrollT > 0.97;
  function tiltFrom(e, range = 1) {
    const r = scene.getBoundingClientRect();
    st.tiltT.x = rubberband(((e.clientX - r.left) / r.width) * 2 - 1) * range;
    st.tiltT.y = rubberband(((e.clientY - r.top) / r.height) * 2 - 1) * range;
  }
  function setHold(target, dur, ease) { st.holdFrom = st.hold; st.holdT = target; st.holdStart = performance.now(); st.holdDur = dur; st.holdEase = ease; wake(); }
  function beginInspect() {
    setMode('INSPECT'); setHold(1, 900, outExpo);
    try { navigator.vibrate && navigator.vibrate(8); } catch { /* not required */ }
  }
  function endInspect(snap = true) {
    if (st.mode === 'INSPECT') setHold(0, snap ? 420 : 700, outExpo);
    setMode(assembled() ? (st.scrollT > 0.5 ? 'ASSEMBLED' : 'REST') : 'SCROLLING');
  }
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (ptr) return;                                   // a second finger never steals the gesture
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, held: false };
    st.pressT = 1;                                     // feedback on the press, not the release
    clearTimeout(holdTimer);
    if (assembled()) holdTimer = setTimeout(() => { if (ptr && !ptr.moved) { ptr.held = true; beginInspect(); try { dossier.setPointerCapture(e.pointerId); } catch { /* ignore */ } } }, HOLD_MS);
    tiltFrom(e);
    wake();
  }
  function move(e) {
    if (!ptr || e.pointerId !== ptr.id) { if (fine && !ptr) { tiltFrom(e); st.hoverT = 1; wake(); } return; }
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (!ptr.moved && !ptr.held && Math.hypot(dx, dy) > MOVE_PX) {
      ptr.moved = true; clearTimeout(holdTimer);
      // a mostly-vertical drag on touch is the page scrolling; the browser will cancel us. Horizontal: explore.
      if (Math.abs(dx) > Math.abs(dy)) { setMode('EXPLORE'); try { dossier.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    }
    if (ptr.held || st.mode === 'EXPLORE' || fine) tiltFrom(e);
    wake();
  }
  function up(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    clearTimeout(holdTimer);
    st.pressT = 0;
    if (ptr.held) endInspect(true);
    else setMode(assembled() ? 'REST' : 'SCROLLING');
    if (!fine) { st.tiltT.x = orient.x; st.tiltT.y = orient.y; }
    ptr = null; wake();
  }
  function cancel(e) { if (!ptr || e.pointerId !== ptr.id) return; clearTimeout(holdTimer); st.pressT = 0; if (ptr.held) endInspect(false); else setMode('REST'); if (!fine) { st.tiltT.x = orient.x; st.tiltT.y = orient.y; } ptr = null; wake(); }
  dossier.addEventListener('pointerdown', down);
  dossier.addEventListener('pointermove', move);
  dossier.addEventListener('pointerup', up);
  dossier.addEventListener('pointercancel', cancel);
  dossier.addEventListener('lostpointercapture', (e) => { if (ptr && ptr.held) cancel(e); });
  dossier.addEventListener('contextmenu', (e) => e.preventDefault());
  if (fine) {
    scene.addEventListener('pointerleave', () => { if (!ptr) { st.tiltT.x = 0; st.tiltT.y = 0; st.hoverT = 0; wake(); } });
  }
  /** Content never teleports: dip, swap, return. */
  function swapText(el, text) { el.classList.add('swap'); setTimeout(() => { el.textContent = text; el.classList.remove('swap'); }, 160); }

  /* ---------- device orientation: the same spatial model, driven by the phone ---------- */
  const orient = { x: 0, y: 0, on: false, base: null };
  const RANGE = 18; // degrees of device tilt that map to the full viewing range
  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return;
    if (!orient.base) orient.base = { g: e.gamma, b: e.beta };   // the angle the phone is held at when it starts is neutral
    let gx = e.gamma - orient.base.g, gy = e.beta - orient.base.b;
    // slowly re-centre so a change of posture does not leave the object permanently skewed
    orient.base.g += (e.gamma - orient.base.g) * 0.004; orient.base.b += (e.beta - orient.base.b) * 0.004;
    orient.x = clamp(gx / RANGE, -1, 1); orient.y = clamp(gy / RANGE, -1, 1);
    if (!ptr) { st.tiltT.x = orient.x; st.tiltT.y = orient.y; wake(); }
  }
  function startOrientation() {
    if (orient.on) return; orient.on = true;
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    if (hint) { hint.classList.remove('ask'); swapText(hint, 'Tilt · Hold · Scroll'); }
  }
  const DOE = window.DeviceOrientationEvent;
  if (DOE && !fine) {
    if (typeof DOE.requestPermission === 'function') {
      // iOS: sensors need an explicit grant, only after a real gesture
      if (hint) { swapText(hint, 'Move through it →'); hint.classList.add('ask');
        hint.addEventListener('click', async () => { try { const r = await DOE.requestPermission(); if (r === 'granted') startOrientation(); else hint.classList.remove('ask'); } catch { hint.classList.remove('ask'); } }, { once: true }); }
    } else startOrientation();
  }

  // keyboard: Enter/Space opens the file while held
  dossier.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.mode !== 'INSPECT') { e.preventDefault(); beginInspect(); } });
  dossier.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') endInspect(true); });

  readScroll(); wake();
  return { state: st, LAYERS };
}

/* ---------- boot ---------- */
if (typeof window !== 'undefined' && document.getElementById('dossier')) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) { document.documentElement.classList.add('js'); window.QB_DOSSIER = createDossier(document); }
}
