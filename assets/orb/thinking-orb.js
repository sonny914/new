/* Thinking orb — the `thinking-orbs` component (MIT, Jakub Antalik) ported to a site with no React.
   Same nine states, same hand-tuned 64 / 32 / 20 presets, same painter: ./engine.js is the library's own
   geometry, vendored verbatim. Only the React wrapper is replaced, by `mountOrb()` and a <thinking-orb> element.

     Library, JSX:      <ThinkingOrb state="searching" size={64} />
     Here, in HTML:     <thinking-orb state="searching" size="64"></thinking-orb>
     Here, in JS:       const orb = mountOrb(host, { state: 'searching', size: 64 });
                        orb.set({ state: 'working', speed: 1.5 });  orb.pause();  orb.play();  orb.destroy();

   Kept from the library: role="img" with a per-state label; prefers-reduced-motion paints one still frame and
   keeps following the theme; every instance pauses offscreen (IntersectionObserver) and when the tab is hidden and
   resumes in phase, since all instances share one clock; device-pixel-ratio capped at 2; theme "auto" reads an
   ancestor data-theme / .dark / .light, then prefers-color-scheme, and updates live. Plain 2D canvas arcs only.

   Props (attributes on the element use the same names; `dotSize` is `dot-size`):
     state    one of STATES                              default 'working'
     size     64 | 32 | 20 CSS px (snapped to nearest)   default 64
     theme    'auto' | 'dark' | 'light'                  default 'auto'   (dark = light ink for dark backgrounds)
     speed    multiplier on the preset's baked speed     default 1
     paused   freeze on the current frame                default false
     color    optional ink tint, #rgb / #rrggbb / rgb()  default grayscale ink
     dots     density multiplier                         default 1
     dotSize  radius multiplier                          default 1
     opts     raw engine knobs merged over the preset    default none
     label    aria-label; undefined = per-state default, null (or the `decorative` attribute) = aria-hidden
     interactive  grab it: holding stops it, dragging sideways spins it through its own motion, letting go flings it
              and it coasts back to its own pace. Arrow keys nudge it, Home resets.        default false
     zoom     draw the chosen preset larger: geometry at size × zoom, the preset's dot count and tuning kept  default 1

   Manipulation is time, not a transform: every state turns as its clock runs, so a drag moves this one orb's clock
   forward or back. Shading, depth order and each state's own motion stay exactly what the engine draws. */
import { resolvePreset, scaleCounts, scaleRadii, MODE_FRAMES, paintFrame } from './engine.js';

export const STATES = Object.freeze(['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping']);
export const SIZES = Object.freeze([64, 32, 20]);
export const LABELS = Object.freeze({
  working: 'Working…', searching: 'Searching…', solving: 'Solving…', listening: 'Listening…', connecting: 'Connecting…',
  weaving: 'Weaving…', composing: 'Composing…', breathing: 'Thinking…', shaping: 'Shaping…',
});
export const DEFAULTS = Object.freeze({ state: 'working', size: 64, theme: 'auto', speed: 1, paused: false, dots: 1, dotSize: 1, interactive: false, zoom: 1 });
/** Orb-time a drag across the orb's full width moves it: enough to turn a globe about a quarter, never a blur. */
export const GRAB = 8;
/** How fast a fling dies away, per second. */
export const DECAY = 3.2;
/** Orb-time per CSS px of drag, for an orb drawn `displayPx` wide. */
export const grabPerPx = (displayPx) => GRAB / Math.max(1, displayPx);
/** Exact coast over `dt` seconds of exponential decay: returns [distance moved, new velocity]; tiny speeds stop. */
export function inertiaStep(vel, dt, k = DECAY) {
  if (!vel || !(dt > 0)) return [0, vel || 0];
  const f = Math.exp(-k * dt);
  const v = vel * f;
  return [(vel * (1 - f)) / k, Math.abs(v) < 0.02 ? 0 : v];
}
/** The instant a reduced-motion user sees: the library's representative still frame. */
export const STILL_T = 0.6;

/** `#rgb`, `#rrggbb` or `rgb()` → { r, g, b }; anything else → undefined (stock grayscale ink). */
export function parseTint(color) {
  if (typeof color !== 'string') return undefined;
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1]; if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const fn = color.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) };
  return undefined;
}

/** Snap any number to the nearest tuned preset; ties and nonsense go to 64. */
export function nearestSize(n) {
  const v = Number(n); if (!Number.isFinite(v)) return 64;
  return SIZES.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), 64);
}

const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const truthy = (v) => v === true || v === '' || v === 'true' || v === 'paused' || v === 'interactive';

/** Fill defaults, drop undefined, validate every prop. Pure. */
export function normalizeProps(raw = {}) {
  const p = { ...DEFAULTS };
  for (const [k, v] of Object.entries(raw)) if (v !== undefined) p[k] = v;
  return {
    state: STATES.includes(p.state) ? p.state : DEFAULTS.state,
    size: nearestSize(p.size),
    theme: p.theme === 'dark' || p.theme === 'light' ? p.theme : 'auto',
    speed: Math.max(0, num(p.speed, 1)),
    paused: truthy(p.paused),
    color: typeof p.color === 'string' && p.color.trim() ? p.color.trim() : undefined,
    dots: Math.max(0.1, num(p.dots, 1)),
    dotSize: Math.max(0.1, num(p.dotSize, 1)),
    opts: p.opts && typeof p.opts === 'object' ? p.opts : undefined,
    label: p.label === null ? null : typeof p.label === 'string' ? p.label : undefined,
    interactive: truthy(p.interactive),
    zoom: Math.min(8, Math.max(0.25, num(p.zoom, 1))),
  };
}

/** Walk up from `el`: data-theme="dark|light" or a .dark/.light class decides; null when nothing does. */
export function ancestorTheme(el) {
  for (let node = el; node; node = node.parentElement) {
    const attr = node.getAttribute && node.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    const cl = node.classList;
    if (cl && cl.contains('dark')) return true;
    if (cl && cl.contains('light')) return false;
  }
  return null;
}
export function systemDark() { return typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches; }
/** true = dark substrate (paint light ink). Pinned theme wins, then the tree, then the system. */
export function resolveDark(theme, el, system = systemDark) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  const fromTree = el ? ancestorTheme(el) : null;
  return fromTree ?? system();
}

/** Build the per-configuration painter: (ctx, dpr, tSec, dark) → paints one frame. Pure over its inputs. */
export function makePainter(props) {
  const { state, size, speed, color, dots, dotSize, opts: over } = props;
  const px = size * (props.zoom || 1);
  const { mode, speed: base, opts: preset } = resolvePreset(state, size);
  let opts = dots !== 1 ? scaleCounts(preset, dots) : preset;
  if (dotSize !== 1) opts = scaleRadii(opts, dotSize);
  if (over) opts = { ...opts, ...over };
  const frameFn = MODE_FRAMES[mode];
  const tint = parseTint(color);
  return {
    px, opts,
    effSpeed: base * speed,
    frame: (tSec) => frameFn(px, tSec, opts),
    paint(ctx, dpr, tSec, dark) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, px, px);
      paintFrame(ctx, frameFn(px, tSec, opts), dark, tint);
    },
  };
}

/** Mount an orb on `target`: a <canvas> is painted in place, anything else gets a <canvas> appended. */
export function mountOrb(target, raw = {}) {
  if (typeof document === 'undefined') throw new Error('mountOrb needs a DOM');
  const own = !(target && target.tagName === 'CANVAS');
  const canvas = own ? document.createElement('canvas') : target;
  if (own && target) target.appendChild(canvas);
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const mqDark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  const mqRm = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  let props = normalizeProps(raw);
  let dark = resolveDark(props.theme, canvas);
  let reduced = !!(mqRm && mqRm.matches);
  let visible = true, running = false, raf = 0, painter = null, dpr = 1;
  // The orb's own clock. It starts on the shared clock so every orb mounted together is in phase, then integrates,
  // so speed changes never jump and an offscreen orb catches up when it comes back. `scrub` is what hands added.
  let t = 0, last = performance.now(), scrub = 0, vel = 0, held = false, lastX = 0, lastMove = 0, sample = 0;

  const frameT = () => (reduced ? STILL_T : t) + scrub;
  const paintNow = () => { if (ctx && painter) painter.paint(ctx, dpr, frameT(), dark); };
  const advance = () => {
    const n = performance.now(); const dt = (n - last) / 1000; last = n;
    if (!props.paused && !reduced && !held) t += dt * painter.effSpeed;
    if (vel && !held) { const [d, v] = inertiaStep(vel, dt); scrub += d; vel = v; }
  };
  const wantRun = () => visible && document.visibilityState !== 'hidden' && (held || vel !== 0 || (!props.paused && !reduced));
  const loop = () => { advance(); paintNow(); if (wantRun()) raf = requestAnimationFrame(loop); else running = false; };
  const start = () => { if (running || !wantRun()) return; running = true; raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const configure = () => {
    const { state, label, interactive } = props;
    dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
    painter = makePainter(props);
    const px = painter.px;
    canvas.width = Math.round(px * dpr); canvas.height = Math.round(px * dpr);
    canvas.style.width = `${px}px`; canvas.style.height = `${px}px`;
    if (label === null) { canvas.setAttribute('aria-hidden', 'true'); canvas.removeAttribute('role'); canvas.removeAttribute('aria-label'); }
    else { canvas.removeAttribute('aria-hidden'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label ?? LABELS[state]); }
    if (interactive) {
      canvas.style.cursor = held ? 'grabbing' : 'grab'; canvas.style.touchAction = 'pan-y';
      if (label !== null) canvas.tabIndex = 0;
      canvas.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home');
    } else {
      held = false; vel = 0; canvas.style.cursor = ''; canvas.style.touchAction = '';
      canvas.removeAttribute('tabindex'); canvas.removeAttribute('aria-keyshortcuts');
    }
  };
  const refresh = () => { stop(); configure(); paintNow(); start(); };
  const retheme = () => { const d = resolveDark(props.theme, canvas); if (d !== dark) { dark = d; paintNow(); } };

  // hands: hold stops it, a sideways drag spins it through its own motion, a fling coasts and dies away
  const onDown = (e) => {
    if (!props.interactive || (e.button !== undefined && e.button > 0)) return;
    held = true; vel = 0; sample = 0; lastX = e.clientX; lastMove = performance.now();
    if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic */ } }
    canvas.style.cursor = 'grabbing'; start();
  };
  const onMove = (e) => {
    if (!held) return;
    const n = performance.now(); const d = (e.clientX - lastX) * grabPerPx(painter.px); lastX = e.clientX;
    const dt = Math.max(0.004, (n - lastMove) / 1000); lastMove = n;
    scrub += d; sample = 0.6 * (d / dt) + 0.4 * sample;
    if (!running) paintNow();
  };
  const onUp = () => {
    if (!held) return;
    held = false; canvas.style.cursor = props.interactive ? 'grab' : '';
    const fresh = performance.now() - lastMove < 90;
    vel = !reduced && fresh ? Math.max(-60, Math.min(60, sample)) : 0; sample = 0;
    start();
  };
  const onKey = (e) => {
    if (!props.interactive) return;
    const step = GRAB * 0.12;
    if (e.key === 'ArrowRight') scrub += step; else if (e.key === 'ArrowLeft') scrub -= step;
    else if (e.key === 'Home') { scrub = 0; vel = 0; } else return;
    e.preventDefault(); if (!running) paintNow();
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('lostpointercapture', onUp);
  canvas.addEventListener('keydown', onKey);

  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); }) : null;
  if (io) io.observe(canvas);
  const onVis = () => { if (document.visibilityState === 'hidden') stop(); else start(); };
  document.addEventListener('visibilitychange', onVis);
  const onRm = (e) => { reduced = e.matches; if (reduced) vel = 0; refresh(); };
  if (mqRm) mqRm.addEventListener('change', onRm);
  if (mqDark) mqDark.addEventListener('change', retheme);
  const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(retheme) : null;
  if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'], subtree: true });

  configure();
  t = (performance.now() / 1000) * painter.effSpeed;
  paintNow(); start();
  return {
    canvas,
    get props() { return props; },
    /** Where the orb is in its motion, in engine time; scrub moves it by hand. */
    get time() { return frameT(); },
    scrub(d) { scrub += Number(d) || 0; if (!running) paintNow(); },
    fling(v) { if (!reduced) { vel = Number(v) || 0; start(); } },
    reset() { scrub = 0; vel = 0; if (!running) paintNow(); },
    set(patch) { props = normalizeProps({ ...props, ...patch }); dark = resolveDark(props.theme, canvas); refresh(); },
    pause() { this.set({ paused: true }); },
    play() { this.set({ paused: false }); },
    destroy() {
      stop(); if (io) io.disconnect(); if (mo) mo.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (mqRm) mqRm.removeEventListener('change', onRm);
      if (mqDark) mqDark.removeEventListener('change', retheme);
      for (const [k, f] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp], ['lostpointercapture', onUp], ['keydown', onKey]]) canvas.removeEventListener(k, f);
      if (own) canvas.remove();
    },
  };
}

/* <thinking-orb state size theme speed paused color dots dot-size label decorative interactive zoom opts='{"thr":1}'>
   — the JSX, as HTML. */
const ATTRS = ['state', 'size', 'theme', 'speed', 'paused', 'color', 'dots', 'dot-size', 'label', 'decorative', 'interactive', 'zoom', 'opts'];
const parseOpts = (v) => { if (!v) return undefined; try { const o = JSON.parse(v); return o && typeof o === 'object' ? o : undefined; } catch { return undefined; } };
export const ThinkingOrbElement = typeof HTMLElement === 'undefined' ? null : class ThinkingOrbElement extends HTMLElement {
  static get observedAttributes() { return ATTRS; }
  #orb = null;
  #read() {
    const g = (k) => this.getAttribute(k) ?? undefined;
    return { state: g('state'), size: g('size'), theme: g('theme'), speed: g('speed'), paused: this.hasAttribute('paused'),
      color: g('color'), dots: g('dots'), dotSize: g('dot-size'), label: this.hasAttribute('decorative') ? null : g('label'),
      interactive: this.hasAttribute('interactive'), zoom: g('zoom'), opts: parseOpts(g('opts')) };
  }
  connectedCallback() {
    if (this.#orb) return;
    if (!this.style.display) this.style.display = 'inline-block';
    this.style.lineHeight = '0';
    this.#orb = mountOrb(this, this.#read());
  }
  disconnectedCallback() { if (this.#orb) this.#orb.destroy(); this.#orb = null; }
  attributeChangedCallback() { if (this.#orb) this.#orb.set(this.#read()); }
  get orb() { return this.#orb; }
};
if (ThinkingOrbElement && typeof customElements !== 'undefined' && !customElements.get('thinking-orb')) customElements.define('thinking-orb', ThinkingOrbElement);
