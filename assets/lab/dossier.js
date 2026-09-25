/* QUIET BANDS — SPATIAL DOSSIER v0.1 · controller
   One state, one frame loop. Touch exploration, press-and-hold inspection and scroll travel all resolve
   into the same per-layer transform, so they blend instead of fighting. No libraries. */

const P = 1100;                 // perspective distance (matches --P in CSS)
const K = 16;                   // px of layer parallax per unit tilt
const ROT_REST = 6, ROT_INSPECT = 8;   // degrees of whole-object tilt
const HOLD_MS = 320;            // press-and-hold arming time
const TAP_MS = 220, MOVE_PX = 8;

/* Layer configuration. px/py: parallax rate (1 = front). holdZ/X/Y: where the layer goes when the file opens.
   rot: how much more than the group this layer rotates (adds thickness to the parallax). */
const LAYERS = [
  { id: 'verdict',   baseZ: -150, px: -0.05, py: -0.05, holdZ: -20,  holdX: 0,   holdY: 0,   rot: 0.10 },
  { id: 'shadow',    baseZ: -80,  px: -0.12, py: -0.12, holdZ: -60,  holdX: 0,   holdY: 0,   rot: 0.15 },
  { id: 'stack',     baseZ: -62,  px: -0.22, py: -0.18, holdZ: -120, holdX: 14,  holdY: -70, rot: 0.35 },
  { id: 'acrylic',   baseZ: -40,  px: -0.30, py: -0.25, holdZ: -90,  holdX: 6,   holdY: -48, rot: 0.50 },
  { id: 'plate',     baseZ: -26,  px: -0.10, py: -0.10, holdZ: -60,  holdX: 18,  holdY: -40, rot: 0.60 },
  { id: 'photo',     baseZ: -8,   px:  0.30, py:  0.25, holdZ: -10,  holdX: -10, holdY: -64, rot: 0.80 },
  { id: 'glass',     baseZ:  10,  px:  0.60, py:  0.50, holdZ:  36,  holdX: 14,  holdY: -40, rot: 1.00 },
  { id: 'ink',       baseZ:  22,  px:  0.85, py:  0.75, holdZ:  70,  holdX: 16,  holdY: 72,  rot: 1.05 },
  { id: 'text',      baseZ:  30,  px:  1.00, py:  0.90, holdZ:  90,  holdX: 8,   holdY: 58,  rot: 1.10 },
  { id: 'front',     baseZ:  44,  px:  1.40, py:  1.20, holdZ: 120,  holdX: 6,   holdY: 0,   rot: 1.20 },
];

/* ---------- pure helpers ---------- */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
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
  const extra = (L.rot - 1) * 0.35;
  const rx = -s.tilt.y * s.rot * extra, ry = s.tilt.x * s.rot * extra;
  return { x, y, z, rx, ry, o: depthOpacity(z) };
}

/* ---------- runtime ---------- */
export function createDossier(root) {
  const scene = root.querySelector('#scene'), dossier = root.querySelector('#dossier');
  const track = root.querySelector('#track'), stage = root.querySelector('#stage');
  const lens = root.querySelector('#lens'), hint = root.querySelector('#hint'), finalEl = root.querySelector('#final');
  const caps = [...root.querySelectorAll('.cap')];
  const els = {}; LAYERS.forEach((L) => { els[L.id] = root.querySelector(`[data-layer="${L.id}"]`); });
  const fine = window.matchMedia('(pointer: fine)').matches;

  // state: targets and smoothed currents
  const st = {
    mode: 'REST',
    tilt: { x: 0, y: 0 }, tiltT: { x: 0, y: 0 },
    hold: 0, holdT: 0, holdFrom: 0, holdStart: 0, holdDur: 900, holdEase: outExpo,
    scroll: 0, scrollT: 0,
    hover: 0, hoverT: 0, holo: 0,
    pulse: 0, pulseAt: 0,
  };
  let running = false, lastFrame = 0, lastKey = '';

  function setMode(m) { if (st.mode === m) return; st.mode = m; dossier.dataset.mode = m; dossier.classList.toggle('is-inspect', m === 'INSPECT'); }

  /* ---------- frame ---------- */
  function frame(now) {
    const dt = Math.min(48, now - (lastFrame || now)); lastFrame = now;
    const a = 1 - Math.exp(-dt / 90), b = 1 - Math.exp(-dt / 140);
    const px0 = st.tilt.x, py0 = st.tilt.y;
    st.tilt.x += (st.tiltT.x - st.tilt.x) * a; st.tilt.y += (st.tiltT.y - st.tilt.y) * a;
    // material response: the spectral reflection is revealed by movement and decays at rest
    const v = Math.hypot(st.tilt.x - px0, st.tilt.y - py0) / Math.max(1, dt) * 1000; // tilt units per second
    st.holo += (clamp(v * 1.6) - st.holo) * (v > st.holo ? 0.35 : 1 - Math.exp(-dt / 420));
    st.scroll += (st.scrollT - st.scroll) * b;
    st.hover += (st.hoverT - st.hover) * a;
    // hold: time-based ease from holdFrom to holdT
    if (st.hold !== st.holdT) { const k = (now - st.holdStart) / st.holdDur; st.hold = k >= 1 ? st.holdT : lerp(st.holdFrom, st.holdT, st.holdEase(k)); }
    // tap pulse: a brief breath of separation
    let pulse = 0; if (st.pulseAt) { const k = (now - st.pulseAt) / 520; pulse = k >= 1 ? 0 : Math.sin(Math.PI * clamp(k)) * 0.22; if (k >= 1) st.pulseAt = 0; }

    const tl = timeline(st.scroll);
    const tiltW = 1 - tl.travel * 0.7;
    const sep = clamp(st.hold * (1 - tl.travel) + tl.sep + pulse + st.hover * 0.1, 0, 1.4);
    const rot = st.mode === 'INSPECT' ? ROT_INSPECT : ROT_REST;
    const s = { tilt: st.tilt, tiltW, sep, camZ: tl.camZ - st.hold * (1 - tl.travel) * 90, rot };

    // whole object
    const gx = -st.tilt.y * rot * tiltW, gy = st.tilt.x * rot * tiltW;
    dossier.style.transform = `rotateX(${gx.toFixed(2)}deg) rotateY(${gy.toFixed(2)}deg)`;
    // light: the same normalized coordinates drive the specular band and the spectral sweep
    dossier.style.setProperty('--lx', (50 + st.tilt.x * 38).toFixed(1) + '%');
    dossier.style.setProperty('--ly', (50 + st.tilt.y * 30).toFixed(1) + '%');
    dossier.style.setProperty('--holo', (st.holo * (0.17 + st.hold * 0.06) + 0.012).toFixed(4));
    dossier.style.setProperty('--spec', (0.04 + Math.abs(st.tilt.x) * 0.08 + st.holo * 0.08).toFixed(3));

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
    lens.style.setProperty('--lens', lensV.toFixed(3));
    lens.style.setProperty('--shift', (st.tilt.x * 6).toFixed(2) + 'px');

    // captions and final state
    caps.forEach((c, i) => { const v = tl.caps[i]; c.style.opacity = v.toFixed(3); c.style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0) scale(${(0.96 + v * 0.04).toFixed(3)})`; });
    finalEl.classList.toggle('on', tl.final > 0.6);
    if (hint) hint.classList.toggle('off', st.scroll > 0.02 && st.scroll < 0.98);

    // mode from scroll
    if (st.mode !== 'INSPECT' && st.mode !== 'EXPLORE') setMode(st.scroll > 0.02 && st.scroll < 0.98 ? 'SCROLLING' : (st.scroll >= 0.98 ? 'ASSEMBLED' : 'REST'));

    const moving = st.holo > 0.004 || Math.abs(st.tiltT.x - st.tilt.x) > 0.0008 || Math.abs(st.tiltT.y - st.tilt.y) > 0.0008 || Math.abs(st.scrollT - st.scroll) > 0.0004 || st.hold !== st.holdT || st.pulseAt || Math.abs(st.hoverT - st.hover) > 0.002;
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
    st.tiltT.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1) * range;
    st.tiltT.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1) * range;
  }
  function setHold(target, dur, ease) { st.holdFrom = st.hold; st.holdT = target; st.holdStart = performance.now(); st.holdDur = dur; st.holdEase = ease; wake(); }
  function beginInspect() {
    setMode('INSPECT'); setHold(1, 900, outExpo);
    try { navigator.vibrate && navigator.vibrate(8); } catch { /* not required */ }
  }
  function endInspect(snap = true) {
    if (st.mode === 'INSPECT') setHold(0, snap ? 650 : 900, outCubic);
    setMode(assembled() ? (st.scrollT > 0.5 ? 'ASSEMBLED' : 'REST') : 'SCROLLING');
  }
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, held: false };
    clearTimeout(holdTimer);
    if (assembled()) holdTimer = setTimeout(() => { if (ptr && !ptr.moved) { ptr.held = true; beginInspect(); try { dossier.setPointerCapture(e.pointerId); } catch { /* ignore */ } } }, HOLD_MS);
    if (!fine) tiltFrom(e, 0.6); else tiltFrom(e);
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
    if (ptr.held || st.mode === 'EXPLORE' || fine) tiltFrom(e, ptr.held ? 1 : 0.85);
    wake();
  }
  function up(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    clearTimeout(holdTimer);
    const dur = performance.now() - ptr.t;
    if (ptr.held) endInspect(true);
    else if (!ptr.moved && dur < TAP_MS) { st.pulseAt = performance.now(); setMode(assembled() ? 'REST' : 'SCROLLING'); }
    else setMode(assembled() ? 'REST' : 'SCROLLING');
    if (!fine) { st.tiltT.x = 0; st.tiltT.y = 0; }
    ptr = null; wake();
  }
  function cancel(e) { if (!ptr || e.pointerId !== ptr.id) return; clearTimeout(holdTimer); if (ptr.held) endInspect(false); else setMode('REST'); if (!fine) { st.tiltT.x = 0; st.tiltT.y = 0; } ptr = null; wake(); }
  dossier.addEventListener('pointerdown', down);
  dossier.addEventListener('pointermove', move);
  dossier.addEventListener('pointerup', up);
  dossier.addEventListener('pointercancel', cancel);
  dossier.addEventListener('lostpointercapture', (e) => { if (ptr && ptr.held) cancel(e); });
  dossier.addEventListener('contextmenu', (e) => e.preventDefault());
  if (fine) {
    scene.addEventListener('pointerleave', () => { if (!ptr) { st.tiltT.x = 0; st.tiltT.y = 0; st.hoverT = 0; wake(); } });
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
