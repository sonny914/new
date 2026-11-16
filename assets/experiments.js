/* Experiments page: the bulb loads into a frame only when asked; the orb toy is one big orb, a dock of all nine,
   and the knobs that matter. Everything goes through mountOrb().set(), the component's own API. */
import { mountOrb, STATES } from '/assets/orb/thinking-orb.js';
import { track } from './qb.js';

/* ---------- the bulb ---------- */
const stage = document.getElementById('bulb-stage');
const start = document.getElementById('bulb-start');
if (stage && start) {
  start.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = '/experiments/bulb/';
    f.title = 'The bulb: scroll inside this frame to break it';
    stage.append(f); stage.classList.add('on');
    document.getElementById('bulb-hint').textContent = 'Scroll or swipe inside the frame.';
    f.addEventListener('load', () => { try { f.focus(); } catch { /* ignore */ } }, { once: true });
    track('experiment_open', { exp: 'bulb', how: 'inline' });
  }, { once: true });
}

/* ---------- the orb toy ---------- */
const host = document.getElementById('toy-orb');
if (host) {
  const DESC = {
    working: 'particles on tilted orbits', searching: 'a scan sweeps a globe', solving: 'bands scramble, then click back',
    listening: 'a waveform rolls the rings', connecting: 'a constellation wires itself', weaving: 'three strands plait a sphere',
    composing: 'an undulating sash', breathing: 'a ring slowly morphing', shaping: 'circle, triangle, square',
  };
  const DEFAULT = { state: 'connecting', color: '', speed: 1, dots: 1, dotSize: 1, paused: false };
  const st = { ...DEFAULT };
  const $ = (id) => document.getElementById(id);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const hexToRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return '255,90,31'; const n = parseInt(m[1], 16); return `${n >> 16},${(n >> 8) & 255},${n & 255}`; };

  // the big orb: zoom follows the stage, so it fills it on a phone and on a wide screen alike
  const zoomFor = () => Math.max(2.5, Math.min(6, Math.floor((Math.min(host.parentElement.clientWidth, host.parentElement.clientHeight) * 0.62) / 64 * 4) / 4));
  const big = mountOrb(host, { state: st.state, size: 64, zoom: zoomFor(), interactive: true, label: `${cap(st.state)} orb. Hold to stop, drag to spin.` });
  new ResizeObserver(() => big.set({ zoom: zoomFor() })).observe(host.parentElement);

  // the dock: all nine live at 32px, each a radio
  const dock = $('dock');
  const minis = STATES.map((s) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.state = s;
    b.innerHTML = `<span class="vh">${cap(s)}</span>`;
    const o = mountOrb(b, { state: s, size: 32, label: null });
    b.addEventListener('click', () => choose(s, 'dock'));
    dock.append(b);
    return { b, o };
  });
  dock.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault(); step(e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1, true);
  });

  function snippet() {
    const a = [`state="${st.state}"`, 'size="64"', 'interactive'];
    if (st.color) a.push(`color="${st.color}"`);
    if (st.speed !== 1) a.push(`speed="${st.speed}"`);
    if (st.dots !== 1) a.push(`dots="${st.dots}"`);
    if (st.dotSize !== 1) a.push(`dot-size="${st.dotSize}"`);
    return `<thinking-orb ${a.join(' ')}></thinking-orb>`;
  }
  function render() {
    const i = STATES.indexOf(st.state);
    $('toy-index').textContent = String(i + 1).padStart(2, '0');
    $('toy-name').textContent = cap(st.state);
    $('toy-desc').textContent = DESC[st.state];
    minis.forEach(({ b }) => { const on = b.dataset.state === st.state; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    const look = { color: st.color || undefined, speed: st.speed, dots: st.dots, dotSize: st.dotSize };
    big.set({ state: st.state, ...look, paused: st.paused, label: `${cap(st.state)} orb. Hold to stop, drag to spin.` });
    minis.forEach(({ o }) => o.set({ color: look.color, speed: st.speed, paused: st.paused }));
    document.querySelectorAll('[data-ink]').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.ink === st.color)));
    $('toy-stage').style.setProperty('--glow', st.color ? hexToRgb(st.color) : '232,220,194');
    for (const [k, id] of [['speed', 'speed'], ['dots', 'dots'], ['dotSize', 'dot']]) { $(`s-${id}`).value = st[k]; $(`o-${id}`).textContent = `${+st[k].toFixed(2)}×`; }
    $('toy-pause').setAttribute('aria-pressed', String(st.paused)); $('toy-pause').textContent = st.paused ? 'Play' : 'Pause';
    $('toy-code').textContent = snippet();
  }

  let swapT = 0;
  function choose(s, how) {
    if (s === st.state) return;
    st.state = s;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) render();
    else { host.classList.add('swap'); clearTimeout(swapT); swapT = setTimeout(() => { render(); host.classList.remove('swap'); }, 160); }
    track('orb_choose', { state: s, how });
  }
  function step(d, focusDock) {
    const i = (STATES.indexOf(st.state) + d + STATES.length) % STATES.length;
    choose(STATES[i], 'step');
    if (focusDock) minis[i].b.focus();
  }
  $('toy-prev').addEventListener('click', () => step(-1));
  $('toy-next').addEventListener('click', () => step(1));

  document.querySelectorAll('[data-ink]').forEach((b) => b.addEventListener('click', () => { st.color = b.dataset.ink; render(); }));
  $('ink-pick').addEventListener('input', (e) => { st.color = e.target.value; render(); });
  for (const [k, id] of [['speed', 'speed'], ['dots', 'dots'], ['dotSize', 'dot']]) $(`s-${id}`).addEventListener('input', (e) => { st[k] = Number(e.target.value); render(); });

  $('toy-pause').addEventListener('click', () => { st.paused = !st.paused; render(); });
  $('toy-reset').addEventListener('click', () => { Object.assign(st, DEFAULT, { state: st.state }); render(); });
  $('toy-shuffle').addEventListener('click', () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const inks = ['', '#F2EEE5', '#FF5A1F', '#7FB8FF', '#8FBF98', `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`];
    Object.assign(st, { color: pick(inks), speed: pick([0.5, 0.75, 1, 1.5, 2]), dots: pick([0.6, 1, 1.4, 2]), dotSize: pick([0.7, 1, 1.4, 1.8]) });
    choose(pick(STATES.filter((s) => s !== st.state)), 'shuffle');
    render();
  });
  $('toy-copy').addEventListener('click', async () => {
    const btn = $('toy-copy');
    try { await navigator.clipboard.writeText(snippet()); btn.textContent = 'Copied'; }
    catch { const r = document.createRange(); r.selectNodeContents($('toy-code')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected'; }
    setTimeout(() => { btn.textContent = 'Copy code'; }, 1400);
    track('orb_copy', { state: st.state });
  });

  let touched = false;
  host.addEventListener('pointerdown', () => { if (!touched) { touched = true; track('experiment_play', { exp: 'orb', state: st.state }); } });

  render();
}
