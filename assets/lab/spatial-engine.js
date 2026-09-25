/* Quiet Bands · spatial engine
   The input side of the 2.5D prototypes, separated from any visual system.
   Every input (device orientation, pointer/touch, press-and-hold, scroll) writes ONE conceptual state:
     view.x / view.y        normalized viewing angle, -1..1 (rubber-banded past the edge)
     inspection             0..1, the object opened for inspection (press-and-hold)
     scroll                 0..1, position on the scroll timeline (lagged)
     press                  0..1, finger down
   Rendering is the caller's job: `render(state, dt, now)` runs once per frame and returns true to keep animating. */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k)));

/** Past the limit, movement continues with diminishing returns instead of stopping dead. */
export function rubberband(v, limit = 1, c = 0.55) {
  const over = Math.abs(v) - limit; if (over <= 0) return v;
  return Math.sign(v) * (limit + (over * c) / (1 + c * over));
}

/** Critically damped spring, substepped so it is stable at any frame length. `response` is the settle time in seconds. */
export function springStep(x, v, target, dt, response = 0.42) {
  const w = 2 * Math.PI / response, k = w * w, c = 2 * w;
  let left = Math.min(dt, 0.1);
  while (left > 0) { const h = Math.min(left, 0.004); left -= h; v += (-k * (x - target) - c * v) * h; x += v * h; }
  return [x, v];
}

export function createSpatialEngine(opts) {
  const {
    scene, object, track, stage, hint,
    render,
    holdArm = 320, holdOpen = 900, holdClose = 380, holdCancel = 640,
    springFree = 0.42, springTouch = 0.2, scrollLag = 90,
    orientRange = 18, movePx = 8,
    assembledAt = (p) => p < 0.03 || p > 0.97,
    labels = { ask: 'Activate depth →', ready: 'Tilt · Hold · Scroll' },
    hold = true,               // press-and-hold inspection
    drag = 'absolute',         // 'absolute': the pointer's position in the scene is the angle. 'relative': a drag changes the angle from where it was (thumb exploration)
    permission = 'hint',       // iOS sensor grant: 'hint' = a button; 'gesture' = the first touch anywhere asks, no UI
  } = opts;
  const fine = window.matchMedia('(pointer: fine)').matches;

  const st = {
    mode: 'REST',
    view: { x: 0, y: 0 }, viewT: { x: 0, y: 0 }, viewV: { x: 0, y: 0 }, viewSpeed: 0,
    press: 0, pressT: 0,
    inspection: 0, inspT: 0, inspFrom: 0, inspStart: 0, inspDur: holdOpen, inspEase: outExpo,
    scroll: 0, scrollT: 0,
    hover: 0, hoverT: 0,
    fine,
  };
  let running = false, lastFrame = 0;

  function setMode(m) { if (st.mode === m) return; st.mode = m; object.dataset.mode = m; object.classList.toggle('is-inspect', m === 'INSPECT'); }

  function frame(now) {
    const dt = Math.min(48, now - (lastFrame || now)); lastFrame = now;
    const a = 1 - Math.exp(-dt / scrollLag);
    const px0 = st.view.x, py0 = st.view.y, sdt = dt / 1000;
    const resp = ptr ? springTouch : springFree;
    [st.view.x, st.viewV.x] = springStep(st.view.x, st.viewV.x, st.viewT.x, sdt, resp);
    [st.view.y, st.viewV.y] = springStep(st.view.y, st.viewV.y, st.viewT.y, sdt, resp);
    st.viewSpeed = Math.hypot(st.view.x - px0, st.view.y - py0) / Math.max(1, dt) * 1000;
    st.press += (st.pressT - st.press) * a;
    st.scroll += (st.scrollT - st.scroll) * a;
    st.hover += (st.hoverT - st.hover) * a;
    if (st.inspection !== st.inspT) { const k = (now - st.inspStart) / st.inspDur; st.inspection = k >= 1 ? st.inspT : lerp(st.inspFrom, st.inspT, st.inspEase(k)); }

    if (st.mode !== 'INSPECT' && st.mode !== 'EXPLORE') setMode(st.scroll > 0.02 && st.scroll < 0.98 ? 'SCROLLING' : (st.scroll >= 0.98 ? 'ASSEMBLED' : 'REST'));
    if (hint) hint.classList.toggle('off', st.scroll > 0.02 && st.scroll < 0.98);

    const keep = render(st, dt, now) === true;
    const moving = keep
      || Math.abs(st.viewT.x - st.view.x) > 0.0008 || Math.abs(st.viewT.y - st.view.y) > 0.0008
      || Math.abs(st.viewV.x) > 0.002 || Math.abs(st.viewV.y) > 0.002
      || Math.abs(st.pressT - st.press) > 0.002 || Math.abs(st.scrollT - st.scroll) > 0.0004
      || st.inspection !== st.inspT || Math.abs(st.hoverT - st.hover) > 0.002;
    if (moving) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (!running) { running = true; lastFrame = 0; requestAnimationFrame(frame); } }

  /* scroll */
  function readScroll() {
    const r = track.getBoundingClientRect(), range = track.offsetHeight - stage.offsetHeight;
    st.scrollT = range > 0 ? clamp(-r.top / range) : 0; wake();
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll, { passive: true });

  /* pointer / touch: a drag is a change of viewing angle, on the same model the sensors drive */
  let ptr = null, holdTimer = 0;
  const assembled = () => assembledAt(st.scrollT);
  function viewFrom(e) {
    const r = scene.getBoundingClientRect();
    if (drag === 'relative' && ptr && !fine) {
      // a drag across 60% of the width is the full range; beyond it the rubber-band
      st.viewT.x = rubberband(ptr.baseX + (e.clientX - ptr.x) / (r.width * 0.3));
      st.viewT.y = rubberband(ptr.baseY + (e.clientY - ptr.y) / (r.height * 0.3));
      return;
    }
    st.viewT.x = rubberband(((e.clientX - r.left) / r.width) * 2 - 1);
    st.viewT.y = rubberband(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  function setInspection(target, dur) { st.inspFrom = st.inspection; st.inspT = target; st.inspStart = performance.now(); st.inspDur = dur; wake(); }
  function beginInspect() {
    setMode('INSPECT'); setInspection(1, holdOpen);
    try { navigator.vibrate && navigator.vibrate(8); } catch { /* not required */ }
  }
  function endInspect(snap = true) {
    if (st.mode === 'INSPECT') setInspection(0, snap ? holdClose : holdCancel);
    setMode(assembled() ? (st.scrollT > 0.5 ? 'ASSEMBLED' : 'REST') : 'SCROLLING');
  }
  function restoreView() { if (!fine) { st.viewT.x = orient.x; st.viewT.y = orient.y; } }
  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (ptr) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, held: false, baseX: st.viewT.x, baseY: st.viewT.y };
    st.pressT = 1;
    clearTimeout(holdTimer);
    if (hold && assembled()) holdTimer = setTimeout(() => { if (ptr && !ptr.moved) { ptr.held = true; beginInspect(); try { object.setPointerCapture(e.pointerId); } catch { /* ignore */ } } }, holdArm);
    if (drag === 'absolute' || fine) viewFrom(e);
    wake();
  }
  function move(e) {
    if (!ptr || e.pointerId !== ptr.id) { if (fine && !ptr) { viewFrom(e); st.hoverT = 1; wake(); } return; }
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (!ptr.moved && !ptr.held && Math.hypot(dx, dy) > movePx) {
      ptr.moved = true; clearTimeout(holdTimer);
      if (Math.abs(dx) > Math.abs(dy)) { setMode('EXPLORE'); try { object.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    }
    if (ptr.held || st.mode === 'EXPLORE' || fine) viewFrom(e);
    wake();
  }
  function up(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    clearTimeout(holdTimer); st.pressT = 0;
    if (ptr.held) endInspect(true); else setMode(assembled() ? 'REST' : 'SCROLLING');
    restoreView(); ptr = null; wake();
  }
  function cancel(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    clearTimeout(holdTimer); st.pressT = 0;
    if (ptr.held) endInspect(false); else setMode('REST');
    restoreView(); ptr = null; wake();
  }
  object.addEventListener('pointerdown', down);
  object.addEventListener('pointermove', move);
  object.addEventListener('pointerup', up);
  object.addEventListener('pointercancel', cancel);
  object.addEventListener('lostpointercapture', (e) => { if (ptr && ptr.held) cancel(e); });
  object.addEventListener('contextmenu', (e) => e.preventDefault());
  if (fine) scene.addEventListener('pointerleave', () => { if (!ptr) { st.viewT.x = 0; st.viewT.y = 0; st.hoverT = 0; wake(); } });
  object.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.mode !== 'INSPECT') { e.preventDefault(); beginInspect(); } });
  object.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') endInspect(true); });

  function swapText(el, text) { el.classList.add('swap'); setTimeout(() => { el.textContent = text; el.classList.remove('swap'); }, 160); }

  /* device orientation: the phone itself is the viewing angle */
  const orient = { x: 0, y: 0, on: false, base: null };
  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return;
    if (!orient.base) orient.base = { g: e.gamma, b: e.beta };
    const gx = e.gamma - orient.base.g, gy = e.beta - orient.base.b;
    orient.base.g += (e.gamma - orient.base.g) * 0.004; orient.base.b += (e.beta - orient.base.b) * 0.004;
    orient.x = clamp(gx / orientRange, -1, 1); orient.y = clamp(gy / orientRange, -1, 1);
    if (!ptr) { st.viewT.x = orient.x; st.viewT.y = orient.y; wake(); }
  }
  function startOrientation() {
    if (orient.on) return; orient.on = true;
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    if (hint) { hint.classList.remove('ask'); swapText(hint, labels.ready); }
  }
  const DOE = window.DeviceOrientationEvent;
  if (DOE && !fine) {
    if (typeof DOE.requestPermission === 'function' && permission === 'gesture') {
      // no UI: the first touch anywhere is the gesture Safari needs
      let asked = false;
      const ask = async () => { if (asked) return; asked = true; window.removeEventListener('touchend', ask); window.removeEventListener('click', ask); try { if (await DOE.requestPermission() === 'granted') startOrientation(); } catch { /* touch remains the instrument */ } };
      window.addEventListener('touchend', ask, { passive: true }); window.addEventListener('click', ask);
    } else if (typeof DOE.requestPermission === 'function') {
      if (hint) {
        swapText(hint, labels.ask); hint.classList.add('ask');
        hint.addEventListener('click', async () => { try { const r = await DOE.requestPermission(); if (r === 'granted') startOrientation(); else hint.classList.remove('ask'); } catch { hint.classList.remove('ask'); } }, { once: true });
      }
    } else startOrientation();
  }

  readScroll(); wake();
  return { state: st, wake, beginInspect, endInspect, orient };
}
