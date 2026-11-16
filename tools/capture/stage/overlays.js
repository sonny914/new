// Production Notes overlay library: editorial graphics that point at real footage. Every component is a pure function of
// scene time and the clip's own measurements (face box, mouth, voice, silent frames), so a frame renders the same every
// time. Graphics that carry type choose the band of the frame the face isn't in, so they never cover an expression.
//
// Per-scene overlays (`props.overlays` on a documentary clip scene, each spanned to beats like labels):
//   headline  kinetic headline: words rise out of a mask, line by line         id        name label with a leader to the face
//   track     corner brackets or a ring that follows the face or the mouth    freeze    flash and punch-in on a held frame
//   compare   before/after labels and divider for a two-panel beat            timeline  the take as a ruler: voice, silent movement, the cut
//   arrow     an annotation that draws itself onto the mouth, face or a point  chapter   chapter number and title over the opening of a scene
// Frame-level chrome (document options): word-timed subtitles with *emphasis*, running source timecode, a reveal wipe
// between scenes, and the bottom watermark.
let H; // helpers from stage.js: { h, set, esc, E, P, clamp, lerp }
export const init = (helpers) => { H = helpers; };

const vis = (o, t, fin = 0.4, fout = 0.3) => (o ? Math.min(H.E.outCubic(H.P(t, o.t0, o.t0 + fin)), 1 - H.P(t, o.t1 - fout, o.t1)) : 0);
// the band a graphic should sit in this frame: whichever half the face isn't in
export const bandFor = (face, want = 'auto') => (want !== 'auto' ? want : !face ? 'top' : (face[1] + face[3]) / 2 > 0.5 ? 'top' : 'bottom');
const masked = (word, cls) => { const m = H.h('span', 'ov-mask'), s = H.h('span', cls, H.esc(word)); m.append(s); return [m, s]; };

// `text` lines (split on \n) rise word by word; `delays` staggers whole lines; `accent` words are orange
function headline(o, root) {
  const el = H.h('div', `ov-head ov-${o.size ?? 'xl'}`), ws = [];
  const accent = new Set((o.accent ?? '').split(/\s+/).filter(Boolean));
  (o.text ?? '').split('\n').forEach((line, li) => {
    const row = H.h('div', 'ov-line'); el.append(row);
    line.split(/\s+/).filter(Boolean).forEach((w, wi) => {
      const [m, s] = masked(w, accent.has(w.replace(/[.,!?:;]$/, '')) ? 'ov-w accent' : 'ov-w');
      row.append(m, document.createTextNode(' ')); ws.push({ s, at: (o.delays?.[li] ?? li * 0.5) + wi * 0.06 });
    });
  });
  root.append(el);
  return { update(t, s) {
    const k = vis(o, t, 0.01, 0.01);
    el.style.display = k > 0 ? '' : 'none'; if (!k) return;
    el.dataset.band = bandFor(s.face, o.band ?? 'auto');
    const out = H.E.inCubic(H.P(t, o.t1 - 0.34, o.t1));
    ws.forEach(({ s: w, at }) => { const a = H.E.outExpo(H.P(t, o.t0 + at, o.t0 + at + 0.62)); w.style.transform = `translateY(${(1 - a) * 106 + out * -106}%)`; });
  } };
}

// a name set beside the face with a hairline leader that points in at the cheek; flips side to stay in frame
function idLabel(o, root) {
  const el = H.h('div', 'ov-id', `<i class="ov-lead"></i><div class="ov-idt"><span class="ov-mask"><b class="ov-name">${H.esc(o.name)}</b></span>${o.role ? `<span class="ov-mask"><span class="ov-role">${H.esc(o.role)}</span></span>` : ''}</div>`);
  root.append(el);
  const lead = el.querySelector('.ov-lead'), name = el.querySelector('.ov-name'), role = el.querySelector('.ov-role');
  let picked = o.side ?? null; // the side is chosen once, from the frame the label opens on, so it never jumps mid-shot
  return { update(t, s) {
    const k = vis(o, t); if (!k || !s.faceBox) { el.style.opacity = 0; return; }
    const [x0, y0, x1, y1] = s.faceBox;
    // a side with room for the whole label, inside the platform's safe area (9:16 keeps clear of the right-hand buttons)
    if (!picked) { const w = el.offsetWidth + 12, right = s.cw - x1 - (s.ch > s.cw ? 120 : 40), left = x0 - 40; picked = right >= w ? 'right' : left >= w ? 'left' : right >= left ? 'right' : 'left'; }
    const onRight = picked === 'right';
    const ay = y0 + (y1 - y0) * (o.at ?? 0.3);
    el.classList.toggle('left', !onRight);
    H.set(el, { opacity: k, top: `${ay}px`, left: onRight ? `${x1 + 6}px` : '', right: onRight ? '' : `${s.cw - x0 + 6}px` });
    lead.style.transform = `scaleX(${H.E.outExpo(H.P(t, o.t0, o.t0 + 0.55))})`;
    name.style.transform = `translateY(${(1 - H.E.outExpo(H.P(t, o.t0 + 0.15, o.t0 + 0.75))) * 106}%)`;
    if (role) role.style.transform = `translateY(${(1 - H.E.outExpo(H.P(t, o.t0 + 0.3, o.t0 + 0.9))) * 106}%)`;
  } };
}

// corner brackets (or a ring) on the face or mouth, following it frame by frame; `hot` turns it orange on silent frames
function track(o, root) {
  const el = H.h('div', `ov-track ${o.shape ?? 'brackets'}`, '<i></i><i></i><i></i><i></i>');
  root.append(el);
  return { update(t, s) {
    const k = vis(o, t, 0.35, 0.25); let box = null;
    if ((o.target ?? 'face') === 'face' && s.faceBox) { const [x0, y0, x1, y1] = s.faceBox, p = (o.pad ?? 0.1) * (x1 - x0); box = [x0 - p, y0 - p, x1 + p, y1 + p]; }
    if (o.target === 'mouth' && s.mouth) { const r = Math.max(40, s.mouth[2] * (o.scale ?? 0.78)); box = [s.mouth[0] - r, s.mouth[1] - r * 0.7, s.mouth[0] + r, s.mouth[1] + r * 0.7]; }
    if (!k || !box) { el.style.opacity = 0; return; }
    const g = 1 + (1 - H.E.outExpo(H.P(t, o.t0, o.t0 + 0.55))) * 0.22, cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, w = (box[2] - box[0]) * g, hh = (box[3] - box[1]) * g;
    H.set(el, { opacity: k, left: `${cx - w / 2}px`, top: `${cy - hh / 2}px`, width: `${w}px`, height: `${hh}px` });
    el.classList.toggle('hot', !!(o.hot && s.hot));
  } };
}

// the flash of a freeze; the punch-in itself is applied to the picture by the stage (punchAt)
function freeze(o, root, scene) {
  const flash = H.h('div', 'ov-flash'); scene.append(flash);
  return { update(t) { flash.style.opacity = t >= o.t0 && t <= o.t1 ? 0.55 * (1 - H.E.outCubic(H.P(t, o.t0, o.t0 + 0.24))) : 0; } };
}
// how far the picture is pushed in at scene time t: a fast 7% push on each freeze, eased so it lands rather than pops
export const punchAt = (list, t) => (list ?? []).filter((o) => o.type === 'freeze').reduce((m, o) => Math.max(m, 1 + (o.amount ?? 0.07) * H.E.outExpo(H.P(t, o.t0, o.t0 + 0.4)) * (1 - H.E.inOutCubic(H.P(t, o.t1 - 0.35, o.t1)))), 1);

// labels for a two-panel beat: what each panel is, set in the panel's top corner, and a hairline between them
function compare(o, root, scene) {
  const mk = (cls, title, note) => H.h('div', `ov-cmp ${cls}`, `<span class="ov-mask"><b>${H.esc(title)}</b></span>${note ? `<span class="ov-mask"><span class="ov-cn">${H.esc(note)}</span></span>` : ''}`);
  const a = mk('a', o.a ?? 'Before', o.aNote), b = mk('b', o.b ?? 'After', o.bNote), rule = H.h('div', 'ov-divide');
  scene.append(a, b, rule);
  // labels go where the panels' faces aren't: `aAt`/`bAt` place them in frame units when the default corner is taken
  const Q = window.__QB__;
  [[a, o.aAt], [b, o.bAt]].forEach(([x, at]) => { if (at) H.set(x, { left: `${at[0] * Q.width}px`, top: `${at[1] * Q.height}px` }); });
  return { update(t) {
    const k = vis(o, t);
    [a, b].forEach((x, i) => { x.style.opacity = k; x.querySelectorAll('.ov-mask > *').forEach((w, q) => { const e = H.E.outExpo(H.P(t, o.t0 + (o.bDelay ?? 0) * i + q * 0.12, o.t0 + (o.bDelay ?? 0) * i + q * 0.12 + 0.6)); w.style.transform = `translateY(${(1 - e) * 106}%)`; }); });
    H.set(rule, { opacity: k, transform: `scaleX(${H.E.outExpo(H.P(t, o.t0 + (o.bDelay ?? 0), o.t0 + (o.bDelay ?? 0) + 0.8))})` });
  } };
}

// the take as an editing ruler: one tick a second, voice in cream, mouth movement with no voice in orange, the playhead,
// and (with `cut`) where the shot was trimmed, with what the trim removed set back
function timeline(o, root, scene) {
  const el = H.h('div', 'ov-timeline', '<div class="ov-tl-head"><span class="ov-tl-name"></span><span class="ov-tl-tc mono"></span></div><div class="ov-tl-body"><canvas></canvas><div class="ov-tl-trim"></div><div class="ov-tl-cut"><i></i><span></span></div><div class="ov-tl-marks"></div></div><div class="ov-tl-key"><span class="v"><i></i>Voice</span><span class="s"><i></i>Mouth moving, no voice</span></div>');
  scene.append(el);
  const cv = el.querySelector('canvas'), cut = el.querySelector('.ov-tl-cut'), trim = el.querySelector('.ov-tl-trim'), marksEl = el.querySelector('.ov-tl-marks');
  const marks = (o.marks ?? []).map((m) => { const d = H.h('div', 'ov-tl-mark', `<i></i><span>${H.esc(m.text)}</span>`); marksEl.append(d); return { m, d }; });
  el.classList.toggle('has-marks', marks.length > 0); // marks take the title row
  let built = false;
  return { update(t, s) {
    const asset = window.__QB__.assets[o.clip], k = vis(o, t); el.style.opacity = k; if (!k || !asset) return;
    el.dataset.band = o.band ?? 'low';
    if (!built) {
      cv.width = cv.clientWidth; cv.height = cv.clientHeight; built = true;
      el.querySelector('.ov-tl-name').textContent = o.label ?? asset.label;
    }
    const ctx = cv.getContext('2d'), W = cv.width, HH = cv.height, n = asset.db.length, bw = W / n;
    const draw = H.E.outExpo(H.P(t, o.t0, o.t0 + 1.1)), here = s.asset === asset ? s.src : o.at ?? null;
    const ck = o.cut != null ? H.E.outExpo(H.P(t, o.t0 + (o.cutAt ?? 0), o.t0 + (o.cutAt ?? 0) + 0.6)) : 0;
    ctx.clearRect(0, 0, W, HH);
    ctx.fillStyle = 'rgba(242,238,229,.28)'; ctx.fillRect(0, Math.round(HH / 2), W * draw, 1);
    // one hairline tick a second, so the ruler reads as time without a row of labels
    ctx.fillStyle = 'rgba(242,238,229,.32)'; for (let i = 0; i <= asset.seconds * draw; i++) ctx.fillRect(Math.min(W - 1, Math.round((i / asset.seconds) * W)), HH - 10, 1, 10);
    for (let i = 0; i < n * draw; i++) {
      const voiced = asset.voiced[i], silent = asset.silent[i]; if (!voiced && !silent) continue;
      const hgt = voiced ? HH * 0.86 : HH * 0.46, gone = o.cut != null && i / asset.srcFps < o.cut;
      ctx.globalAlpha = gone ? 1 - 0.7 * ck : 1;
      ctx.fillStyle = silent ? '#FF5A00' : '#F2EEE5';
      ctx.fillRect(i * bw, (HH - hgt) / 2, Math.max(1, bw - 1.5), hgt);
    }
    ctx.globalAlpha = 1;
    if (here != null) { ctx.fillStyle = '#F2EEE5'; ctx.fillRect(Math.round((here / asset.seconds) * W) - 1, 0, 2, HH); }
    // the ruler carries the timecode only when the panel doesn't already show it
    el.querySelector('.ov-tl-tc').textContent = here != null && !window.__QB__.timecode ? timecode(here, asset.srcFps) : '';
    H.set(cut, { left: `${((o.cut ?? 0) / asset.seconds) * 100}%`, opacity: ck });
    H.set(trim, { width: `${((o.cut ?? 0) / asset.seconds) * 100}%`, opacity: ck });
    if (o.cut != null) cut.querySelector('span').textContent = o.cutText ?? `Cut at ${o.cut.toFixed(2)} s`;
    marks.forEach(({ m, d }) => H.set(d, { left: `${(m.at / asset.seconds) * 100}%`, opacity: H.E.outCubic(H.P(t, o.t0 + (m.delay ?? 0.6), o.t0 + (m.delay ?? 0.6) + 0.4)) }));
  } };
}

// an annotation: a note in the clear band, and a hairline that draws itself from the note onto the mouth, the face or a point
function arrow(o, root) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path'), head = document.createElementNS(NS, 'path');
  svg.setAttribute('class', 'ov-arrow'); svg.append(path, head);
  const note = H.h('div', 'ov-note', `<span class="ov-mask"><b>${H.esc(o.text ?? '')}</b></span>${o.sub ? `<span class="ov-mask"><span class="ov-ns">${H.esc(o.sub)}</span></span>` : ''}`);
  root.append(svg, note);
  return { update(t, s) {
    const k = vis(o, t);
    const fromRight = o.from ? o.from === 'right' : s.faceBox ? s.cw - s.faceBox[2] > s.faceBox[0] : true;
    const target = o.to === 'mouth' && s.mouth ? [s.mouth[0] + (fromRight ? 1 : -1) * s.mouth[2] * 0.55, s.mouth[1]] : o.to === 'face' && s.faceBox ? [fromRight ? s.faceBox[2] : s.faceBox[0], (s.faceBox[1] + s.faceBox[3]) / 2] : Array.isArray(o.to) ? [o.to[0] * s.cw, o.to[1] * s.ch] : null;
    if (!k || !target) { svg.style.opacity = note.style.opacity = 0; return; }
    svg.style.opacity = note.style.opacity = k;
    svg.setAttribute('viewBox', `0 0 ${s.cw} ${s.ch}`);
    note.classList.toggle('right', fromRight);
    const nw = note.offsetWidth, nh = note.offsetHeight, edge = s.faceBox ? (fromRight ? s.faceBox[2] + 40 : s.faceBox[0] - 40 - nw) : fromRight ? s.cw * 0.62 : s.cw * 0.08;
    const nx = o.note?.[0] != null ? o.note[0] * s.cw : H.clamp(edge, 40, s.cw - nw - 40), ny = o.note?.[1] != null ? o.note[1] * s.ch : target[1] - nh / 2 + (o.lift ?? -70);
    H.set(note, { left: `${nx}px`, top: `${ny}px` });
    note.querySelectorAll('.ov-mask > *').forEach((w, q) => { const e = H.E.outExpo(H.P(t, o.t0 + q * 0.1, o.t0 + q * 0.1 + 0.6)); w.style.transform = `translateY(${(1 - e) * 106}%)`; });
    const sx = fromRight ? nx - 14 : nx + nw + 14, sy = ny + Math.min(nh / 2, 28);
    const gap = o.gap ?? 14, ang = Math.atan2(target[1] - sy, target[0] - sx), ex = target[0] - Math.cos(ang) * gap, ey = target[1] - Math.sin(ang) * gap;
    const bend = o.bend ?? 0.18, mx = (sx + ex) / 2 - (ey - sy) * bend * (fromRight ? -1 : 1), my = (sy + ey) / 2 + (ex - sx) * bend * (fromRight ? -1 : 1);
    path.setAttribute('d', `M${sx},${sy} Q${mx},${my} ${ex},${ey}`);
    const len = path.getTotalLength(), d = H.E.inOutCubic(H.P(t, o.t0 + 0.2, o.t0 + 0.85));
    path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len * (1 - d)}`;
    const a = Math.atan2(ey - my, ex - mx), L = 15;
    head.setAttribute('d', `M${ex - L * Math.cos(a - 0.45)},${ey - L * Math.sin(a - 0.45)} L${ex},${ey} L${ex - L * Math.cos(a + 0.45)},${ey - L * Math.sin(a + 0.45)}`);
    head.style.opacity = d > 0.97 ? 1 : 0;
  } };
}

// a chapter opening: the chapter number and title rise over the top of the picture, under a rule that draws across
function chapter(o, root, scene) {
  const el = H.h('div', 'ov-chapter', `<i class="ov-ch-rule"></i><span class="ov-mask"><span class="ov-ch-n mono">${H.esc(o.n ?? '')}</span></span><span class="ov-mask"><b class="ov-ch-t">${H.esc(o.title ?? '')}</b></span>`);
  scene.append(el);
  const rule = el.querySelector('.ov-ch-rule'), parts = el.querySelectorAll('.ov-mask > *');
  return { update(t) {
    const k = vis(o, t, 0.01, 0.01); el.style.display = k > 0 ? '' : 'none'; if (!k) return;
    const out = H.E.inCubic(H.P(t, o.t1 - 0.32, o.t1));
    rule.style.transform = `scaleX(${H.E.outExpo(H.P(t, o.t0, o.t0 + 0.7)) * (1 - out)})`;
    parts.forEach((w, q) => { const a = H.E.outExpo(H.P(t, o.t0 + 0.1 + q * 0.09, o.t0 + 0.72 + q * 0.09)); w.style.transform = `translateY(${(1 - a) * 106 - out * 106}%)`; });
  } };
}

export function timecode(sec, fps = 24) {
  const r = Math.round(fps), f = Math.floor(sec * fps + 1e-6), ff = f % r, s = Math.floor(f / r);
  return `00:00:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

const KINDS = { headline, id: idLabel, track, freeze, compare, timeline, arrow, chapter };
const FRAME_LEVEL = new Set(['headline', 'compare', 'timeline', 'freeze', 'chapter']);
// build a scene's overlays: graphics that follow the footage go in the panel, the rest at frame level
export function build(list, panel, scene) {
  return (list ?? []).map((o) => {
    const make = KINDS[o.type]; if (!make) throw new Error(`unknown overlay type "${o.type}"`);
    return make(o, FRAME_LEVEL.has(o.type) ? scene : panel, scene);
  });
}

// ---- subtitles: the narration, set phrase by phrase, each word arriving as it is spoken ---------------------------
// Words between *asterisks* are the emphasis: orange and heavier. Word times are proportional to spoken length
// (letters, plus a beat for punctuation) across the cue, which tracks a recorded line closely enough at 30 fps.
export function subtitles(root, cues, { maxChars = 30 } = {}) {
  const chunks = [];
  for (const c of cues) {
    const ws = []; let emph = false;
    for (const raw of (c.marked ?? c.text).split(/\s+/).filter(Boolean)) {
      if (raw.startsWith('*')) emph = true;
      const w = raw.replace(/\*/g, '');
      ws.push({ w, emph, weight: w.length + (/[.,!?:;]$/.test(w) ? 5 : 0) + 2 });
      if (/\*[^*]*$/.test(raw.slice(1)) && raw.slice(1).includes('*')) emph = false;
    }
    const total = ws.reduce((a, x) => a + x.weight, 0); let acc = 0;
    for (const x of ws) { x.at = c.start + (acc / total) * (c.end - c.start); acc += x.weight; }
    // phrases: break after a sentence, or before a line would pass maxChars
    let cur = [], len = 0;
    const flush = () => { if (cur.length) chunks.push({ ws: cur, start: cur[0].at, end: c.end }); cur = []; len = 0; };
    ws.forEach((x) => { if (len && len + x.w.length + 1 > maxChars) flush(); cur.push(x); len += x.w.length + 1; if (/[.!?:]$/.test(x.w)) flush(); });
    flush();
  }
  // a phrase stays up until the next one starts, or lingers a quarter second after its line ends
  chunks.forEach((ch, i) => { const nx = chunks[i + 1]; ch.until = nx && nx.start < ch.end + 0.3 ? nx.start - 0.04 : ch.end + 0.3; ch.fade = !(nx && nx.start < ch.end + 0.3); });
  const el = H.h('div', 'ov-subs'); root.append(el);
  let shown = null, spans = [];
  return { hide() { el.style.opacity = 0; }, update(t) {
    const ch = chunks.find((c) => t >= c.start - 0.04 && t < c.until);
    if (ch !== shown) {
      shown = ch; el.innerHTML = '';
      spans = ch ? ch.ws.map((x) => { const [m, s] = masked(x.w, x.emph ? 'ov-sw em' : 'ov-sw'); el.append(m, document.createTextNode(' ')); return { s, x }; }) : [];
    }
    if (!ch) { el.style.opacity = 0; return; }
    el.style.opacity = ch.fade ? 1 - H.P(t, ch.until - 0.16, ch.until) : 1;
    spans.forEach(({ s, x }) => { const a = H.E.outExpo(H.P(t, x.at - 0.04, x.at + 0.2)); s.style.transform = `translateY(${(1 - a) * 100}%)`; s.style.opacity = a; });
  } };
}
