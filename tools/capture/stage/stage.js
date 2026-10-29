// QB Capture stage: builds every scene of one format from the storyboard and draws any frame on demand.
// window.stage.seek(frame) is a pure function of the frame number, so renders are repeatable frame for frame.
const QB = window.__QB__;
const W = QB.width, H = QB.height, FPS = QB.fps, OVER = 0.8;
const portrait = H > W;
const frame = document.getElementById('frame');
frame.className = portrait ? 'f9x16' : 'f16x9';
Object.assign(frame.style, { width: `${W}px`, height: `${H}px` });

// ---- helpers --------------------------------------------------------------------------------------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  outCubic: (x) => 1 - (1 - x) ** 3,
  outQuart: (x) => 1 - (1 - x) ** 4,
  inCubic: (x) => x * x * x,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2),
};
function h(tag, cls, html) { const el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; }
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const set = (el, styles) => Object.assign(el.style, styles);
const fade = (el, k, dy = 0) => set(el, { opacity: k, transform: dy ? `translateY(${(1 - k) * dy}px)` : '' });
let SVG = {};

// Split text into masked words. Words inside `accent` (a substring) are orange.
function words(el, text, accent) {
  const spans = [];
  const a0 = accent ? text.indexOf(accent) : -1, a1 = a0 >= 0 ? a0 + accent.length : -1;
  let pos = 0;
  for (const w of text.split(/(\s+)/)) {
    if (/^\s+$/.test(w)) { el.append(document.createTextNode(' ')); pos += w.length; continue; }
    if (!w) continue;
    const outer = h('span', 'word'), inner = h('span', a0 >= 0 && pos >= a0 && pos < a1 ? 'accent' : '', esc(w));
    outer.append(inner); el.append(outer); spans.push(inner); pos += w.length;
  }
  return spans;
}
function rise(spans, t, t0, stagger = 0.05, dur = 0.7) {
  spans.forEach((s, i) => { const k = E.outExpo(P(t, t0 + i * stagger, t0 + i * stagger + dur)); s.style.transform = `translateY(${(1 - k) * 108}%)`; });
}
function kicker(sc) {
  const el = h('div', 'kicker mono', `<span class="n">${String(sc.stageIndex).padStart(2, '0')}</span><span class="rule"></span><span>${esc(sc.stageLabel)}</span>`);
  const rule = el.querySelector('.rule');
  return { el, update: (t) => { fade(el, E.outCubic(P(t, 0.25, 0.85)), 14); rule.style.transform = `scaleX(${E.outExpo(P(t, 0.35, 1.3))})`; } };
}
const fit = (len, sizes) => sizes.find(([n]) => len <= n)?.[1] ?? sizes[sizes.length - 1][1];

// Frame sequences (real footage) are stepped one decoded JPEG at a time.
const imgCache = new Map();
function frameImage(asset, i) {
  const n = clamp(Math.floor(i), 0, asset.frames.count - 1) + 1;
  const url = `${asset.frames.base}${String(n).padStart(4, '0')}.jpg`;
  if (!imgCache.has(url)) {
    const img = new Image(); img.src = url;
    imgCache.set(url, img.decode().then(() => img));
    if (imgCache.size > 24) imgCache.delete(imgCache.keys().next().value);
  }
  return imgCache.get(url);
}
function drawCover(ctx, img, w, hgt) {
  const r = Math.max(w / img.naturalWidth, hgt / img.naturalHeight), dw = img.naturalWidth * r, dh = img.naturalHeight * r;
  ctx.drawImage(img, (w - dw) / 2, 0, dw, dh);
}
let pending = [];

// ---- templates ------------------------------------------------------------------------------------
const T = {};

T.intro = (sc) => {
  const p = sc.props, el = h('div', 'intro');
  const mk = h('div', 'mk', SVG.mark), eb = h('div', 'eyebrow mono', esc(p.eyebrow)), title = h('h1', 'title h-display');
  const ws = words(title, p.title);
  const rl = h('div', 'rl', '<i></i><b></b>'), meta = h('div', 'meta mono', p.meta.map((m) => `<span>${esc(m)}</span>`).join(''));
  el.append(mk, eb, title, rl, meta);
  const metas = [...meta.children];
  return { el, update(t) {
    const k = E.outQuart(P(t, 0.15, 1.1));
    set(mk, { clipPath: `inset(${(1 - k) * 100}% 0 0 0)`, transform: `translateY(${(1 - k) * 30}px)` });
    fade(eb, E.outCubic(P(t, 0.5, 1.1)), 12);
    rise(ws, t, 0.7, 0.07, 0.9);
    const r = E.outExpo(P(t, 1.1, 2.4));
    rl.firstChild.style.transform = `scaleX(${r})`;
    set(rl.lastChild, { left: `${r * 100}%`, opacity: 1 - P(t, 2.2, 2.8) });
    metas.forEach((m, i) => fade(m, E.outCubic(P(t, 1.7 + i * 0.12, 2.3 + i * 0.12)), 10));
  } };
};

T.hook = (sc) => {
  const el = h('div', 'hook');
  const lines = sc.props.lines.map((l, i) => { const d = h('div', 'ln h-display' + (i === sc.props.accent ? ' accent' : '')); el.append(d); return words(d, l); });
  return { el, update(t) { lines.forEach((ws, i) => rise(ws, t, 0.25 + i * 0.75, 0.06, 0.8)); } };
};

T.quote = (sc) => {
  const p = sc.props, el = h('div', 'quote'), kk = kicker(sc);
  const q = h('blockquote', 'q');
  q.style.fontSize = `${portrait ? fit(p.quote.length, [[50, 84], [110, 66], [190, 56], [999, 48]]) : fit(p.quote.length, [[50, 104], [110, 82], [190, 66], [999, 54]])}px`;
  const open = h('span', 'open', '“'); q.append(open);
  const ws = words(q, p.quote, p.accent);
  const attr = h('div', 'attr mono', `<span class="rule"></span><span>${esc(p.who)}</span><span>${esc(p.when)}</span>${p.via ? `<span>${esc(p.via)}</span>` : ''}`);
  el.append(kk.el, q, attr);
  const span = Math.min(3.2, ws.length * 0.055);
  return { el, update(t) {
    kk.update(t);
    fade(open, E.outCubic(P(t, 0.35, 0.9)));
    rise(ws, t, 0.45, span / Math.max(1, ws.length), 0.75);
    fade(attr, E.outCubic(P(t, 0.9 + span, 1.5 + span)), 10);
  } };
};

T.stats = (sc) => {
  const p = sc.props, el = h('div', 'stats'), kk = kicker(sc);
  const top = h('div', 'top'), hd = h('h2', 'headline h-head'); top.append(kk.el, hd);
  const hw = words(hd, p.headline);
  const nums = h('div', 'nums');
  const cells = p.items.map((it) => { const c = h('div', 'num', `<span class="ln"></span><b>${it.prefix ?? ''}0</b><span class="u mono">${esc(it.unit)}</span><span class="l mono">${esc(it.label)}</span>`); nums.append(c); return { c, it, b: c.querySelector('b'), ln: c.querySelector('.ln') }; });
  const files = h('div', 'files mono');
  const max = Math.max(1, ...p.files.map((f) => f.added + f.deleted));
  const rows = p.files.map((f) => {
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/') + 1) : '', base = f.path.slice(dir.length);
    const r = h('div', 'row', `<span class="p"><span class="d">${esc(dir)}</span>${esc(base)}</span><span class="bar"><i class="a"></i><i class="r"></i></span><span class="n">${f.binary ? esc(f.size ?? 'bin') : f.status === 'D' ? `−${f.deleted}` : `+${f.added}`}</span>`);
    const a = r.querySelector('.a'), d = r.querySelector('.r');
    const wa = f.binary ? 0.22 : Math.sqrt(f.added / max), wd = f.binary ? 0 : Math.sqrt(f.deleted / max);
    set(a, { width: `${wa * 100}%` }); set(d, { left: `${wa * 100}%`, width: `${wd * 100}%` });
    files.append(r); return { r, a, d };
  });
  const more = h('div', 'more mono', p.total > p.files.length ? `Top ${p.files.length} of ${p.total} files · commit ${esc(p.sha)}` : `commit ${esc(p.sha)}`);
  files.append(more);
  el.append(top, nums, files);
  return { el, update(t) {
    kk.update(t); rise(hw, t, 0.5, 0.035, 0.7);
    cells.forEach(({ c, it, b, ln }, i) => {
      const t0 = 1.0 + i * 0.18, k = E.outExpo(P(t, t0, t0 + 1.6));
      fade(c, E.outCubic(P(t, t0 - 0.1, t0 + 0.4)), 18);
      ln.style.transform = `scaleX(${E.outExpo(P(t, t0, t0 + 1.0))})`;
      b.textContent = `${it.prefix ?? ''}${Math.round(it.value * k)}`;
    });
    rows.forEach(({ r, a, d }, i) => { const t0 = 1.5 + i * 0.09; fade(r, E.outCubic(P(t, t0, t0 + 0.5)), 10); const k = E.outExpo(P(t, t0 + 0.2, t0 + 1.1)); a.style.transform = d.style.transform = `scaleX(${k})`; });
    fade(more, E.outCubic(P(t, 2.4, 3.0)));
  } };
};

function screenCanvas(asset, cv, t, t0, speed = 1) {
  const i = Math.max(0, (t - t0) * asset.frames.fps * speed);
  const ctx = cv.getContext('2d');
  pending.push(frameImage(asset, i).then((img) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); drawCover(ctx, img, cv.width, cv.height); }));
  return i / asset.frames.count;
}

T.device = (sc) => {
  const p = sc.props, a = QB.assets[p.asset], el = h('div', 'device');
  const phone = h('div', 'phone'), cv = h('canvas'), prog = h('div', 'prog', '<i></i>');
  phone.append(cv, prog);
  const side = h('div', 'side'), kk = kicker({ ...sc, stageLabel: p.kicker });
  const hd = h('h2', 'h-head'), hw = words(hd, p.headline);
  const ul = h('ul', 'notes'), lis = p.notes.map((n, i) => { const li = h('li', i === p.notes.length - 1 && /\//.test(n) ? 'm' : '', `<span class="tick"></span>${esc(n)}`); ul.append(li); return li; });
  side.append(kk.el, hd, ul); el.append(phone, side);
  return { el, mount() { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }, update(t, D) {
    const k = E.outQuart(P(t, 0, 1.4));
    phone.style.transform = portrait ? `translateY(${(1 - k) * 160}px) rotateX(${(1 - k) * 18}deg) scale(${0.94 + 0.06 * k + 0.02 * P(t, 0, D)})`
      : `translateX(${(1 - k) * 220}px) rotateY(${lerp(-26, -9, k) + 4 * P(t, 1.4, D)}deg) rotateX(3deg)`;
    phone.style.opacity = E.outCubic(P(t, 0, 0.6));
    const played = screenCanvas(a, cv, t, 0.35);
    prog.firstChild.style.transform = `scaleX(${clamp(played)})`;
    kk.update(t - 0.3); rise(hw, t, 0.7, 0.05, 0.8);
    lis.forEach((li, i) => { const t0 = 1.3 + i * 0.55; fade(li, E.outCubic(P(t, t0, t0 + 0.6)), 12); li.firstChild.style.transform = `scaleX(${E.outExpo(P(t, t0, t0 + 1.2))})`; });
  } };
};

T.browser = (sc) => {
  const p = sc.props, a = QB.assets[p.asset], el = h('div', 'browser');
  const win = h('div', 'win'), bar = h('div', 'bar', `<span class="lock"></span><span class="url">${esc(p.url.replace(/^([^/]+)/, '<b>$1</b>')).replace(/&lt;(\/?)b&gt;/g, '<$1b>')}</span>`), cv = h('canvas');
  win.append(bar, cv);
  const side = h('div', 'side'), kk = kicker({ ...sc, stageLabel: p.kicker });
  const hd = h('h2', 'h-head'), hw = words(hd, p.headline.replace(/\//g, '/\u200b'));
  const ul = h('ul', 'notes'), lis = p.notes.map((n) => { const li = h('li', '', `<span class="tick"></span>${esc(n)}`); ul.append(li); return li; });
  side.append(kk.el, hd, ul); el.append(win, side);
  return { el, mount() { cv.width = cv.clientWidth; cv.height = Math.round(cv.clientWidth / (a.aspect || 1.6)); cv.style.height = `${cv.height}px`; }, update(t, D) {
    const k = E.outQuart(P(t, 0, 1.5));
    win.style.transform = portrait ? `translateY(${(1 - k) * 140}px) rotateX(${(1 - k) * 14}deg) scale(${0.96 + 0.04 * k})`
      : `translateX(${(1 - k) * 240}px) rotateY(${lerp(16, 5, k) - 3 * P(t, 1.5, D)}deg) scale(${0.97 + 0.03 * P(t, 0, D)})`;
    win.style.opacity = E.outCubic(P(t, 0, 0.6));
    screenCanvas(a, cv, t, 0.3, Math.max(1, (a.frames.count / a.frames.fps) / Math.max(1, D - 0.8)));
    kk.update(t - 0.2); rise(hw, t, 0.6, 0.05, 0.8);
    lis.forEach((li, i) => { const t0 = 1.2 + i * 0.5; fade(li, E.outCubic(P(t, t0, t0 + 0.6)), 12); li.firstChild.style.transform = `scaleX(${E.outExpo(P(t, t0, t0 + 1.2))})`; });
  } };
};

// The timeline zooms like a camera: into the first burst of work, out across the wait, into the ending.
T.timeline = (sc) => {
  const p = sc.props, el = h('div', 'timeline'), kk = kicker(sc);
  const hd = h('h2', 'headline h-display'), hw = words(hd, p.headline);
  const track = h('div', 'track'); set(track, { top: portrait ? '230px' : '170px', height: portrait ? '600px' : '330px', overflow: 'hidden' });
  const AY = portrait ? 360 : 165, CH = portrait ? 26 : 34;
  const axis = h('div', 'axis'); axis.style.top = `${AY}px`;
  const ticks = h('div'); const gap = h('div', 'gap'); gap.style.top = `${AY - 1}px`;
  const gapl = h('div', 'gapl', `<b>${esc(p.gap.label)}</b><span class="mono">${esc(p.gap.sub)}</span>`); gapl.style.top = `${AY - (portrait ? 330 : 140)}px`;
  track.append(axis, ticks, gap, gapl);
  const ms = (iso) => Date.parse(iso);
  const pts = p.points.map((pt, i) => {
    const d = h('div', `pt k-${pt.kind}`); d.style.top = `${AY}px`;
    const up = i % 2 === 0;
    const stem = h('div', 'stem'); set(stem, up ? { bottom: '0px', height: '34px' } : { top: '0px', height: '34px' });
    const lb = h('div', 'lb', `<span class="tm">${esc(pt.day)} · ${esc(pt.time)}</span>${esc(pt.label.length > CH ? pt.label.slice(0, CH - 1).trimEnd() + '…' : pt.label)}`);
    set(lb, up ? { bottom: '42px', left: '-8px' } : { top: '42px', left: '-8px' });
    d.append(stem, h('div', 'dot'), lb); track.append(d);
    return { d, lb, stem, at: ms(pt.t) };
  });
  const tq = h('div', 'tq'), tqw = words(tq, `“${p.quote?.text ?? ''}”`);
  const tqs = h('div', 'w2 mono', p.quote ? `Founder · ${esc(p.quote.when)}` : ''); tq.append(tqs);
  if (!p.quote) tq.style.display = 'none';
  el.append(kk.el, hd, track, tq);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: QB.tz, day: 'numeric', month: 'short' });
  const fmtT = new Intl.DateTimeFormat('en-GB', { timeZone: QB.tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const at = pts.map((x) => x.at).sort((a, b) => a - b);
  const dayOf = (v) => fmt.format(new Date(v));
  const c0 = at.filter((v) => dayOf(v) === dayOf(at[0])), c2 = at.filter((v) => dayOf(v) === dayOf(at[at.length - 1]));
  const dom = (xs, padMin) => { const lo = Math.min(...xs), hi = Math.max(...xs), pad = Math.max(padMin * 6e4, (hi - lo) * 0.28); return [lo - pad, hi + pad]; };
  const D0 = dom(c0, 5), D2 = dom(c2, 3), span = at[at.length - 1] - at[0], D1 = [at[0] - span * 0.07, at[at.length - 1] + span * 0.07];
  const g0 = ms(p.gap.from), g1 = ms(p.gap.to);
  const tickEls = [];
  let TW = 1;
  return { el, mount() { TW = track.clientWidth; pts.forEach((q) => (q.w = q.lb.offsetWidth)); }, update(t, D) {
    kk.update(t); rise(hw, t, 0.45, 0.06, 0.8);
    // camera: hold the first burst, pull out across the wait, push into the ending
    const z1 = E.inOutQuint(P(t, 2.7, 4.9)), z2 = E.inOutQuint(P(t, 6.6, 8.6));
    const wd = (d) => d[1] - d[0], mid = (d) => (d[0] + d[1]) / 2, at1 = (v) => (v - D1[0]) / wd(D1);
    // each move keeps one anchor (the burst it leaves or the burst it heads for) gliding to its place on screen
    let w, lo;
    if (z2 <= 0) { const a = mid(D0); w = Math.exp(lerp(Math.log(wd(D0)), Math.log(wd(D1)), z1)); lo = a - lerp(0.5, at1(a), z1) * w; }
    else { const b = mid(D2); w = Math.exp(lerp(Math.log(wd(D1)), Math.log(wd(D2)), z2)); lo = b - lerp(at1(b), 0.5, z2) * w; }
    const X = (v) => ((v - lo) / w) * TW;
    axis.style.transform = `scaleX(${E.outExpo(P(t, 0.4, 1.6))})`; axis.style.transformOrigin = '0 50%';
    // ticks: days when wide, ten-minute marks when close
    const step = w > 36e5 * 30 ? 864e5 : w > 36e5 * 3 ? 36e5 : 6e5;
    const first = Math.ceil(lo / step) * step;
    let n = 0;
    for (let v = first; v < lo + w && n < 40; v += step, n++) {
      let tk = tickEls[n]; if (!tk) { tk = h('div', 'tick', '<span class="mono"></span>'); tk.style.top = `${AY}px`; ticks.append(tk); tickEls[n] = tk; }
      const label = step === 864e5 ? dayOf(v - 0).toUpperCase() : '';
      tk.style.display = ''; tk.style.left = `${X(v)}px`; tk.firstChild.textContent = label;
      tk.style.opacity = E.outCubic(P(t, 0.8, 1.4)) * (step === 864e5 ? 1 : 0.8);
    }
    for (let i = n; i < tickEls.length; i++) tickEls[i].style.display = 'none';
    // points: labels fade when crowded
    let lastUp = -1e9, lastDn = -1e9;
    pts.forEach((q, i) => {
      const x = X(q.at); q.d.style.left = `${x}px`;
      const show = E.outCubic(P(t, 0.9 + i * 0.12, 1.5 + i * 0.12));
      q.d.style.opacity = show * (x > -40 && x < TW + 40 ? 1 : 0);
      // a label shows only when the one before it on the same side has ended; labels by the right edge hang left
      const up = i % 2 === 0, prev = up ? lastUp : lastDn, right = x > TW - Math.min(340, q.w + 20);
      const room = right ? clamp((x - q.w - prev - 24) / 50) : clamp((x - prev - 24) / 50);
      if (room > 0.5) { if (up) lastUp = right ? x : x + q.w; else lastDn = right ? x : x + q.w; }
      const op = clamp((room - 0.35) / 0.3);
      q.lb.style.opacity = op; q.stem.style.opacity = op;
      set(q.lb, right ? { left: 'auto', right: '-8px', textAlign: 'right' } : { left: '-8px', right: 'auto', textAlign: 'left' });
    });
    // the wait itself, in orange
    const gk = E.outExpo(P(t, 3.6, 5.2)), gx0 = X(g0), gx1 = X(g1);
    set(gap, { left: `${gx0}px`, width: `${Math.max(0, gx1 - gx0)}px`, transform: `scaleX(${gk})` });
    const gl = E.outCubic(P(t, 4.4, 5.0)) * (1 - E.inCubic(P(t, 6.9, 7.6)));
    const vis0 = Math.max(gx0, 0), vis1 = Math.min(gx1, TW);
    set(gapl, { left: `${clamp((vis0 + vis1) / 2, 300, TW - 300)}px`, opacity: gl, transform: `translateX(-50%) translateY(${(1 - gl) * 12}px)` });
    if (p.quote) { rise(tqw, t, 7.4, 0.045, 0.7); fade(tqs, E.outCubic(P(t, 8.0, 8.6)), 8); }
  } };
};

T.merge = (sc) => {
  const p = sc.props, el = h('div', 'merge'), kk = kicker(sc);
  const hd = h('h2', 'headline h-display'), hw = words(hd, p.headline);
  const GW = portrait ? 912 : 1620, BY = portrait ? 120 : 40, MY = portrait ? 300 : 160;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'g'); svg.setAttribute('viewBox', `0 0 ${GW} ${portrait ? 420 : 200}`);
  const S = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); svg.append(e); return e; };
  const nodes = [...p.commits.map((c) => ({ ...c, type: 'c' })), ...p.merges.map((m) => ({ ...m, type: 'm' }))].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || (a.type === 'c' ? -1 : 1));
  // x: even spacing, with extra room where days passed
  let x = portrait ? 90 : 170; const xs = [];
  nodes.forEach((n, i) => { if (i) { const gapDays = (Date.parse(n.at) - Date.parse(nodes[i - 1].at)) / 864e5; x += (portrait ? 150 : 230) + (gapDays > 1 ? (portrait ? 120 : 420) : 0); } xs.push(x); });
  const base = S('line', { class: 'base', x1: 0, y1: MY, x2: GW, y2: MY });
  const fork = S('path', { d: `M ${xs[0] - 110} ${MY} C ${xs[0] - 60} ${MY} ${xs[0] - 70} ${BY} ${xs[0] - 20} ${BY} L ${xs[0]} ${BY}`, pathLength: 1 });
  const segs = [], marks = [];
  nodes.forEach((n, i) => {
    if (i && n.type === 'c' || (i && nodes[i - 1].type === 'c' && n.type === 'm')) {
      const from = xs[i - 1] + (nodes[i - 1].type === 'm' ? -70 : 0), wait = (Date.parse(n.at) - Date.parse(nodes[i - 1].at)) / 864e5 > 1;
      const to = n.type === 'm' ? xs[i] - 70 : xs[i];
      segs.push({ el: S('line', { class: wait ? 'wait' : '', x1: from, y1: BY, x2: from, y2: BY }), from, to, i });
    }
    if (n.type === 'm') segs.push({ el: S('path', { d: `M ${xs[i] - 70} ${BY} C ${xs[i] - 20} ${BY} ${xs[i] - 40} ${MY} ${xs[i]} ${MY}`, pathLength: 1 }), curve: true, i });
  });
  nodes.forEach((n, i) => { marks[i] = S('circle', { cx: xs[i], cy: n.type === 'c' ? BY : MY, r: 8, class: n.type === 'm' ? 'm' : '' }); });
  const lbls = nodes.map((n, i) => {
    const d = h('div', 'lbl', n.type === 'c' ? `<span class="tm">${esc(n.sha)} · ${esc(n.when)}</span>${esc(n.label.length > 30 ? n.label.slice(0, 29).trimEnd() + '…' : n.label)}`
      : `<span class="tm">${esc(n.when)}</span>PR #${n.pr} merged`);
    const top = portrait ? 420 : 330;
    set(d, n.type === 'c' ? { left: `${xs[i] - 10}px`, top: `${top + BY - (portrait ? 92 : 84)}px` } : { left: `${xs[i] - 10}px`, top: `${top + MY + 26}px` });
    return d;
  });
  const lane1 = h('div', 'lane mono', esc(p.branch ?? 'branch')), lane2 = h('div', 'lane mono', esc(p.base));
  const top = portrait ? 420 : 330;
  set(lane1, { left: `${xs[0] + 26}px`, top: `${top + BY + 16}px` }); set(lane2, { left: '0px', top: `${top + MY + 16}px` });
  if (portrait) lane1.style.display = 'none';
  let rm = null, strike = null, why = null;
  if (p.removed) {
    rm = h('div', 'rm', `<div class="f"><span class="p">${esc(p.removed.path)}</span><span class="s">${esc(p.removed.size)} · removed in ${esc(p.removed.sha)}</span><i class="x"></i></div>${p.removed.note ? `<div class="why">${esc(p.removed.note)}</div>` : ''}`);
    strike = rm.querySelector('.x'); why = rm.querySelector('.why');
  }
  el.append(kk.el, hd, svg, lane1, lane2, ...lbls, ...(rm ? [rm] : []));
  const stepT = (i) => 1.1 + i * 0.75;
  return { el, update(t) {
    kk.update(t); rise(hw, t, 0.45, 0.06, 0.8);
    base.style.opacity = E.outCubic(P(t, 0.5, 1.1));
    fork.style.strokeDasharray = '1 1'; fork.style.strokeDashoffset = 1 - E.outCubic(P(t, 0.6, 1.2));
    fade(lane1, E.outCubic(P(t, 0.8, 1.3))); fade(lane2, E.outCubic(P(t, 0.8, 1.3)));
    for (const s of segs) {
      const t0 = stepT(s.i) - 0.75, k = E.inOutCubic(P(t, t0, t0 + 0.7));
      if (s.curve) { s.el.style.strokeDasharray = '1 1'; s.el.style.strokeDashoffset = 1 - k; }
      else s.el.setAttribute('x2', lerp(s.from, s.to, k));
    }
    marks.forEach((m, i) => { const k = E.outExpo(P(t, stepT(i) - 0.1, stepT(i) + 0.5)); m.setAttribute('r', 8 * k); });
    lbls.forEach((d, i) => fade(d, E.outCubic(P(t, stepT(i), stepT(i) + 0.5)), 10));
    if (rm) {
      const t0 = stepT(nodes.length) + 0.1;
      fade(rm, E.outCubic(P(t, t0, t0 + 0.6)), 14);
      strike.style.transform = `scaleX(${E.inOutCubic(P(t, t0 + 0.9, t0 + 1.5))})`;
      rm.querySelector('.f .p').style.opacity = 1 - 0.55 * P(t, t0 + 1.4, t0 + 2.0);
      if (why) fade(why, E.outCubic(P(t, t0 + 1.6, t0 + 2.2)), 8);
    }
  } };
};

T.beforeafter = (sc) => {
  const p = sc.props, el = h('div', 'ba'), kk = kicker(sc);
  const hd = h('div', 'headline', esc(p.headline));
  const pane = h('div', 'pane'), before = h('img'), aftBox = h('div', 'aft'), after = h('img'), div = h('div', 'div');
  before.src = QB.assets[p.before.asset].url; after.src = QB.assets[p.after.asset].url;
  aftBox.append(after); pane.append(before, aftBox, div);
  const PW = portrait ? 912 : 1000, PH = PW / 1.6;
  set(pane, { left: `${portrait ? 0 : (1620 - PW) / 2}px`, top: portrait ? '200px' : '96px', width: `${PW}px`, height: `${PH}px` });
  const tl = h('div', 'tag l mono', `<b>${esc(p.before.label)}</b>${esc(p.before.sub)}`), tr = h('div', 'tag r mono', `<b>${esc(p.after.label)}</b>${esc(p.after.sub)}`);
  el.append(kk.el, hd, pane, tl, tr);
  pending.push(before.decode(), after.decode());
  return { el, update(t, D) {
    kk.update(t); fade(hd, E.outCubic(P(t, 0.4, 1.0)), 10);
    const k = E.outQuart(P(t, 0.2, 1.2));
    pane.style.opacity = k; pane.style.transform = `translateY(${(1 - k) * 40}px) scale(${0.985 + 0.015 * k + 0.015 * P(t, 1.2, D)})`;
    const w = E.inOutCubic(P(t, 1.8, 3.8));
    aftBox.style.clipPath = `inset(0 ${(1 - w) * 100}% 0 0)`;
    div.style.left = `${w * 100}%`; div.style.opacity = P(t, 1.6, 1.9) * (1 - P(t, 4.0, 4.5));
    fade(tl, E.outCubic(P(t, 0.9, 1.4)) * (1 - 0.6 * P(t, 3.0, 3.6)), 8);
    fade(tr, E.outCubic(P(t, 3.2, 3.8)), 8);
  } };
};

T.checklist = (sc) => {
  const p = sc.props, el = h('div', 'check'), kk = kicker(sc);
  const hd = h('h2', 'headline h-head'), hw = words(hd, p.headline);
  const list = h('div', 'items');
  const rows = p.items.map((it) => {
    const ok = it.status !== 'unverified';
    const icon = ok ? '<svg viewBox="0 0 30 30"><path pathLength="1" d="M5 16 L12 23 L25 7"/></svg>' : '<svg viewBox="0 0 30 30"><circle pathLength="1" cx="15" cy="15" r="12"/></svg>';
    const r = h('div', `it ${ok ? 'verified' : 'unverified'}`, `${icon}<span class="tx">${esc(it.text)}</span><span class="s mono">${ok ? '' : '<span class="nv">Not verified</span>'}${esc(it.source)}</span>`);
    list.append(r); return { r, mark: r.querySelector('path,circle') };
  });
  el.append(kk.el, hd, list);
  return { el, update(t) {
    kk.update(t); rise(hw, t, 0.45, 0.06, 0.8);
    rows.forEach(({ r, mark }, i) => {
      const t0 = 1.0 + i * 0.42;
      fade(r, E.outCubic(P(t, t0, t0 + 0.5)), 14);
      mark.style.strokeDasharray = '1 1'; mark.style.strokeDashoffset = 1 - E.outCubic(P(t, t0 + 0.15, t0 + 0.7));
    });
  } };
};

T.lesson = (sc) => {
  const p = sc.props, el = h('div', 'lesson'), kk = kicker(sc);
  const l1 = h('div', 'l1 h-display'); const lastWord = p.lines[0].split(/\s+/).pop();
  const w1 = words(l1, p.lines[0], p.accent ?? lastWord);
  const rest = p.lines.slice(1).map((l) => { const d = h('div', 'l2'); return { d, ws: words(d, l) }; });
  el.append(kk.el, l1, ...rest.map((r) => r.d));
  return { el, update(t) {
    kk.update(t); rise(w1, t, 0.5, 0.09, 0.9);
    rest.forEach((r, i) => rise(r.ws, t, 1.9 + i * 0.6, 0.035, 0.7));
  } };
};

T.outro = (sc) => {
  const p = sc.props, el = h('div', 'outro');
  const mk = h('div', 'mk', SVG.mark), wm = h('div', 'wm', SVG.wordmark), rl = h('div', 'rl');
  const meta = h('div', 'meta mono', `<span>${esc(p.line)}</span><span>${esc(p.sub).replace(/([0-9A-Za-z]{8})$/, '<span style="text-transform:none">$1</span>')}</span>`);
  el.append(mk, wm, rl, meta);
  return { el, update(t, D) {
    const k = E.outQuart(P(t, 0.2, 1.1));
    set(mk, { clipPath: `inset(${(1 - k) * 100}% 0 0 0)`, transform: `translateY(${(1 - k) * 24}px)` });
    fade(wm, E.outCubic(P(t, 0.7, 1.3)), 14);
    rl.style.transform = `scaleX(${E.outExpo(P(t, 1.0, 2.0))})`;
    [...meta.children].forEach((m, i) => fade(m, E.outCubic(P(t, 1.4 + i * 0.15, 2.0 + i * 0.15)), 8));
  } };
};

// ---- build ----------------------------------------------------------------------------------------
async function build() {
  const [mark, wordmark] = await Promise.all([QB.brand.mark, QB.brand.wordmark].map((u) => fetch(u).then((r) => r.text())));
  SVG.mark = mark.replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"');
  SVG.wordmark = wordmark.replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"');
  await Promise.all([document.fonts.load('800 120px "Hubot Sans"'), document.fonts.load('500 20px "Hubot Sans"'), document.fonts.load('500 16px "JetBrains Mono"')]);

  const world = h('div', 'world'), chrome = h('div', 'chrome');
  frame.append(world, chrome);
  const scenes = QB.scenes.map((sc, i) => {
    const node = h('section', `scene t-${sc.template}`); const box = h('div', 'box'); node.append(box);
    const tpl = T[sc.template](sc); box.append(tpl.el); world.append(node);
    return { sc, node, tpl, i };
  });
  // chrome
  const corner = h('div', 'corner mono', `${SVG.mark}<span>Session recap</span>`);
  const clock = h('div', 'clock mono'), src = h('div', 'src mono');
  const spine = h('div', 'spine mono');
  const stEls = QB.stages.map((s, i) => { const d = h('span', 'st', `<i>${String(i + 1).padStart(2, '0')}</i><span class="w">${esc(s.label)}</span><u></u>`); return { id: s.id, d, u: d.querySelector('u') }; });
  stEls.forEach((s, i) => { if (i) spine.append(h('span', 'sep')); spine.append(s.d); });
  const cap = h('div', 'cap', '<span></span>');
  const fadeEl = h('div', 'fade');
  chrome.append(corner, clock, src, spine, cap, fadeEl);
  await document.fonts.ready;
  scenes.forEach((s) => { s.node.style.visibility = 'visible'; s.tpl.mount?.(); s.node.style.visibility = 'hidden'; });

  const last = scenes.length - 1;
  async function seek(f) {
    const t = f / FPS;
    pending = [];
    let best = null, bestW = -1, prev = null, wIn = 1;
    for (const s of scenes) {
      const lt = t - s.sc.start, D = s.sc.duration;
      if (lt < 0 || lt > D) { s.node.style.visibility = 'hidden'; continue; }
      const kin = s.i === 0 ? 1 : E.inOutCubic(P(lt, 0, OVER)), kout = s.i === last ? 0 : E.inOutCubic(P(lt, D - OVER, D));
      const w = kin * (1 - kout);
      if (w > bestW) { prev = best; best = s; bestW = w; wIn = kin; } else prev = s;
      const dx = portrait ? 0 : W * 0.2, dy = portrait ? H * 0.08 : 0;
      s.node.style.visibility = 'visible';
      s.node.style.opacity = E.outCubic(kin) * (1 - E.inCubic(kout));
      s.node.style.transform = `translate3d(${(1 - kin) * dx - kout * dx}px, ${(1 - kin) * dy - kout * dy}px, 0) scale(${1 - 0.035 * (1 - kin) + 0.05 * kout})`;
      s.tpl.update(lt, D);
    }
    // chrome follows the scene that holds the frame; brand cards hide it
    const cur = best?.sc;
    const vis = cur && !cur.brand ? 1 : 0;
    const k = Math.min(1, bestW * 1.6);
    clock.textContent = cur?.clockLabel ?? ''; src.innerHTML = cur?.sources ? `<b>Source</b>&nbsp;&nbsp;${esc(cur.sources)}` : '';
    clock.style.opacity = src.style.opacity = vis * k;
    const introT = scenes[0].sc.duration, outroStart = scenes[last].sc.start;
    const chromeOn = E.outCubic(P(t, introT - OVER, introT)) * (1 - E.outCubic(P(t, outroStart, outroStart + OVER)));
    spine.style.opacity = chromeOn; corner.style.opacity = chromeOn;
    stEls.forEach((s) => {
      const on = cur?.stage === s.id, done = QB.stages.findIndex((x) => x.id === s.id) < QB.stages.findIndex((x) => x.id === cur?.stage);
      s.d.classList.toggle('on', on);
      s.d.style.color = on ? 'var(--cream)' : done ? 'var(--dim)' : 'var(--faint)';
      s.u.style.transform = `scaleX(${on ? E.outExpo(P(t - (best?.sc.start ?? 0), 0.2, 1.0)) : 0})`;
    });
    // captions
    const cue = QB.cues.find((c) => t >= c.start && t < c.end);
    const span = cap.firstChild;
    if (cue && QB.captions !== false) {
      span.textContent = cue.text;
      const a = Math.min(P(t, cue.start, cue.start + 0.14), 1 - P(t, cue.end - 0.1, cue.end));
      set(cap, { opacity: a, transform: `translateY(${(1 - a) * 8}px)` });
    } else cap.style.opacity = 0;
    fadeEl.style.opacity = P(t, QB.duration - 0.7, QB.duration);
    await Promise.all(pending);
  }
  return { seek, duration: QB.duration, frames: QB.frames, fps: FPS };
}

window.stage = { ready: build().then((api) => Object.assign(window.stage, api, { ok: true })).catch((e) => { window.stage.error = String(e?.stack || e); throw e; }) };
