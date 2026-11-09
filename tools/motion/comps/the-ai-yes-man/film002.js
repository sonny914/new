// FILM 002: THE AI YES MAN. AI & the creative economy, the second film.
// Same world and figure as Film 001 (film-keys world, engine illustrations); every beat is timed from
// films/002-ai-yes-man/timeline.json (the Flighty narration), read at load.
//
//  1 YES MAN            the builder types an idea; the assistant answers with approval after approval (each a small orange glow)
//  2 FALSE CONFIDENCE   the approvals turn into things (site, app, store, package, plan) and grow into an empire;
//                       labels approve it; the builder stands proud; pull back. "Meanwhile..." everything stops: REVENUE $0
//  3 AGREEMENT ≠ VALIDATION  a customer walks up to the empire, nothing happens, walks away; the approvals turn to question marks
//  4 CHANGE THE QUESTIONS    back at the desk: four questions, each one changes something you can see
//       01 why would this fail?        a stress test: the load finds the weak joints
//       02 who actually pays?          a customer, a product, and the transaction between them
//       03 what haven't I proven?      the plan splits into proven and assumed
//       04 argue against my plan       a balance; evidence goes on the other side and it moves
//  5 BETTER THINKING    the empire sheds what wasn't real; what's left connects to a customer and works (orange only now)
//  6 QUIET BANDS        the loop draws into a point; the mark; BUILD WHAT MATTERS.
import { clamp, hash, smoothstep, lerp, seg, ease } from '../../engine/math.js';
import { panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, halo, cone, glow, vignette, grain } from '../../engine/light.js';
import { human } from '../../engine/humans.js';
import { place, thing, SIZE } from '../../engine/environments.js';
import { aiPanel } from '../../engine/illustrations.js';
import { PALETTES, mix } from '../../engine/color.js';
import { A, setPalette, P, mono } from '../everybody-can-build/film-keys.js';
import { cameraKeys, arcFrom, along, floorCurve, nearFade, walker, headline, kicker, endCard, brandPath } from '../shared/story.js';

const W = 1080, H = 1920, FPS = 30;
let L, TL, B, MARK, WORD, camAt;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');

/* ======================= the world ======================= */
const SCREEN = { x: 0.65, y: 1.06, z: 0.07 };
const PANEL = { c: { x: 0.96, y: 1.64, z: -0.3 }, w: 0.84, h: 0.48, yaw: -0.28 };
const PANEL_TOP = { x: 0.96, y: 2.12, z: -0.3 };
// the approvals: where they pop, what they say, and what they become in the empire
const BUBBLES = [
  { text: 'GREAT IDEA.', x: 0.95, y: 2.3, z: -0.3, slot: { type: 'site', x: 2.4, y: 2.0, z: 3.2, w: 1.15, h: 0.8, yaw: -0.05 } },
  { text: 'ABSOLUTELY.', x: -0.5, y: 2.2, z: 0.1, slot: { type: 'app', x: 3.55, y: 2.45, z: 3.7, w: 0.5, h: 0.95, yaw: -0.1 } },
  { text: 'YOU’RE RIGHT.', x: 0.2, y: 2.55, z: 0.2, slot: { type: 'store', x: 4.1, y: 0, z: 4.4, w: 1.3, h: 1.27, yaw: -0.12 } },
  { text: 'LOVE THIS.', x: 1.35, y: 1.88, z: 0.0, slot: { type: 'product', x: 2.15, y: 0, z: 3.5, w: 0.75, h: 0.82, yaw: 0.1 } },
  { text: 'GENIUS.', x: -0.55, y: 2.75, z: 0.4, slot: { type: 'plan', x: 3.1, y: 1.15, z: 2.7, w: 0.7, h: 0.92, yaw: 0.06 } },
  { text: '10/10.', x: 0.95, y: 2.85, z: 0.5, slot: { type: 'building', x: 5.4, y: 0, z: 5.7, w: 0.95, h: 1.4, yaw: -0.12 } },
  { text: 'NO NOTES.', x: -0.2, y: 3.05, z: 0.6, slot: { type: 'course', x: 4.7, y: 2.25, z: 4.5, w: 0.95, h: 0.68, yaw: -0.08 } },
];
// the empire keeps growing out of those seven
const EMPIRE = [];
{
  const types = ['site', 'app', 'store', 'building', 'product', 'course', 'plan'];
  for (let i = 0; EMPIRE.length < 26 && i < 300; i++) {
    const a = hash(i, 61) * Math.PI * 2, r = 1.6 + hash(i, 62) * 3.4, x = 4.0 + Math.cos(a) * r * 1.2, z = 5.4 + Math.sin(a) * r;
    if (z < 2.2 || x < 1.2) continue;
    const type = types[Math.floor(hash(i, 63) * types.length)], ground = type === 'store' || type === 'building' || type === 'product';
    const [w, h] = SIZE[type], sc = 0.75 + hash(i, 64) * 0.45;
    const it = { type, x, z, y: ground ? 0 : 0.9 + hash(i, 65) * 2.4, w: w * sc, h: h * sc, yaw: (hash(i, 66) - 0.5) * 0.4 };
    if ([...EMPIRE, ...BUBBLES.map((b) => b.slot)].some((o) => Math.hypot(o.x - it.x, (o.z - it.z) * 0.75) < 1.05)) continue;
    EMPIRE.push({ ...it, src: BUBBLES[i % 7].slot, born: 12.2 + 4.0 * hash(i, 67) ** 1.2 });
  }
}
const STAND = { x: -0.9, z: 0.95 };                 // where the builder stands, proud, in front of the empire
// sequence 5: what survives, and the customer it finally connects to
const KEEP = [2, 0, 3];                             // store, site, package
const SYS = { cust: { x: 2.55, z: 4.0 }, store: { x: 4.1, z: 4.4 }, pack: { x: 5.35, z: 5.9 }, ctr: { x: 4.0, y: 0.6, z: 5.0 } };
const LOOP = [
  floorCurve({ x: SYS.cust.x + 0.35, z: SYS.cust.z + 0.05 }, { x: SYS.store.x - 0.75, z: SYS.store.z }, -0.15),
  floorCurve({ x: SYS.store.x + 0.6, z: SYS.store.z + 0.35 }, { x: SYS.pack.x - 0.45, z: SYS.pack.z - 0.2 }, 0.12),
  floorCurve({ x: SYS.pack.x - 0.35, z: SYS.pack.z + 0.35 }, { x: SYS.cust.x + 0.1, z: SYS.cust.z + 0.45 }, 0.16),
];
const M = { x: 0.55, y: 1.45, z: 0.5, w: 1.0, h: 0.9 };   // where the four question pictures appear (above the desk)

/* ======================= drawing helpers ======================= */
/** an approval bubble, drawn in screen space at its projected point (crisp type at any scale) */
function bubble(ctx, cam, b, { a = 1, pop = 1, q = 0, glowK = 0, tone = 1 }) {
  const p = cam.project(b); if (!p || a <= 0.01) return;
  const s = p.s * 0.115 * lerp(0.6, 1, pop) * (pop < 1 ? ease.spring(pop, 0.6, 12) / Math.max(0.01, lerp(0.6, 1, pop)) * lerp(0.6, 1, pop) : 1);
  const fs = Math.max(8, s), text = q > 0.5 ? '?' : b.text;
  ctx.save(); ctx.font = `800 ${fs}px "Inter Display"`; ctx.letterSpacing = '0.5px';
  const tw = ctx.measureText(text).width, bw = tw + fs * 1.1, bh = fs * 1.75, x = p.x - bw / 2, y = p.y - bh;
  if (glowK > 0.01) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, p.y - bh / 2, 0, p.x, p.y - bh / 2, bw * 0.9); g.addColorStop(0, `rgba(${rgb(P.live)},${0.45 * glowK})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - bw, p.y - bh * 2, bw * 2, bh * 3); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = a;
  const fill = mix(P.bg, P.ink, tone);
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, bh * 0.32); ctx.fill();
  ctx.beginPath(); ctx.moveTo(p.x - fs * 0.35, y + bh - 1); ctx.lineTo(p.x, y + bh + fs * 0.45); ctx.lineTo(p.x + fs * 0.1, y + bh - 1); ctx.fill();
  if (glowK > 0.01) { ctx.strokeStyle = P.live; ctx.globalAlpha = a * glowK; ctx.lineWidth = Math.max(1.5, fs * 0.08); ctx.beginPath(); ctx.roundRect(x, y, bw, bh, bh * 0.32); ctx.stroke(); ctx.globalAlpha = a; }
  ctx.fillStyle = P.bg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (q > 0 && q < 1) { ctx.globalAlpha = a * (1 - q); ctx.fillText(b.text, p.x, y + bh / 2 + fs * 0.04); ctx.globalAlpha = a * q; ctx.fillText('?', p.x, y + bh / 2 + fs * 0.04); }
  else ctx.fillText(text, p.x, y + bh / 2 + fs * 0.04);
  ctx.restore();
}
/** a technical label with a leader to a world point: KEY: VALUE */
function tag(ctx, cam, at, key, value, a, { dx = 90, dy = -70, align = 'left' } = {}) {
  const p = cam.project(at); if (!p || a <= 0.01) return;
  const ex = p.x + dx, ey = p.y + dy;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.lineTo(ex + (align === 'left' ? 36 : -36), ey); ctx.stroke();
  ctx.fillStyle = P.ink2; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const tx = ex + (align === 'left' ? 44 : -44);
  ctx.save(); ctx.font = '500 19px "JetBrains Mono"'; ctx.letterSpacing = '3px'; ctx.textAlign = align; ctx.globalAlpha = a;
  const kw = ctx.measureText(key + ' ').width, vw = ctx.measureText(value).width;
  // a dark plate under the text: the tag stays legible over bright cards
  { const x0 = align === 'left' ? tx - 8 : tx - kw - vw - 8; ctx.fillStyle = P.bg; ctx.globalAlpha = a * 0.82; ctx.beginPath(); ctx.roundRect(x0, ey - 14, kw + vw + 14, 28, 4); ctx.fill(); ctx.globalAlpha = a; }
  if (align === 'left') { ctx.fillStyle = P.ink2; ctx.fillText(key + ' ', tx, ey + 6); ctx.fillStyle = P.ink; ctx.fillText(value, tx + kw, ey + 6); }
  else { ctx.fillStyle = P.ink; ctx.fillText(value, tx, ey + 6); ctx.fillStyle = P.ink2; ctx.fillText(key + ' ', tx - vw, ey + 6); }
  ctx.restore();
}

/* ---------- the four question pictures (drawn on one sheet in space, metres; y grows downward) ---------- */
function stressTest(c, w, h, s, k) {   // 01: a structure takes a load; the weak joints show (orange: what you just found)
  const px = (v) => v / s, load = ease.inOut3(seg(k, 0.12, 0.45)), crack = seg(k, 0.42, 0.62), slip = ease.out3(seg(k, 0.66, 0.85));
  const bend = 0.05 * load, base = h - 0.08;
  c.strokeStyle = P.ink2; c.lineWidth = px(1.3); c.beginPath(); c.moveTo(0.02, base); c.lineTo(w - 0.02, base); c.stroke();
  c.fillStyle = P.ink;
  const cols = [0.2, 0.5, 0.8].map((f) => f * w);
  for (const x of cols) c.fillRect(x - 0.03, base - 0.38, 0.06, 0.38);
  // beam, bending under load
  c.beginPath(); c.moveTo(cols[0] - 0.08, base - 0.38); c.quadraticCurveTo(w / 2, base - 0.38 + bend * 2, cols[2] + 0.08, base - 0.38); c.lineTo(cols[2] + 0.08, base - 0.44); c.quadraticCurveTo(w / 2, base - 0.44 + bend * 2, cols[0] - 0.08, base - 0.44); c.fill();
  // blocks on top (the business), the right one slips once the joint gives
  c.fillRect(cols[0] - 0.06, base - 0.6, 0.18, 0.15); c.fillRect(w / 2 - 0.09, base - 0.6 + bend, 0.18, 0.15);
  c.save(); c.translate(cols[2] - 0.08 + slip * 0.05, base - 0.6 + slip * 0.06); c.rotate(slip * 0.18); c.fillRect(0, 0, 0.18, 0.15); c.restore();
  // the load
  const ay = lerp(0.02, base - 0.72, load);
  c.strokeStyle = P.ink; c.lineWidth = px(2.4); c.lineCap = 'round'; c.beginPath(); c.moveTo(w / 2, ay - 0.14); c.lineTo(w / 2, ay); c.moveTo(w / 2 - 0.04, ay - 0.04); c.lineTo(w / 2, ay); c.lineTo(w / 2 + 0.04, ay - 0.04); c.stroke();
  c.font = `500 ${px(15)}px "JetBrains Mono"`; c.letterSpacing = `${px(3)}px`; c.fillStyle = P.ink2; c.textAlign = 'center'; c.globalAlpha = smoothstep(seg(k, 0.05, 0.2)); c.fillText('LOAD', w / 2, ay - 0.18); c.globalAlpha = 1;
  // weak joints found
  if (crack > 0) {
    for (const [x, y] of [[cols[2], base - 0.41], [cols[0], base - 0.41]]) {
      c.strokeStyle = P.live; c.globalAlpha = crack; c.lineWidth = px(2.2); c.beginPath(); c.arc(x, y + bend * 0.4, 0.055 * crack + 0.01, 0, Math.PI * 2); c.stroke();
      c.setLineDash([px(3), px(4)]); c.beginPath(); c.moveTo(x - 0.03, y - 0.05); c.lineTo(x + 0.01, y); c.lineTo(x - 0.02, y + 0.05); c.stroke(); c.setLineDash([]);
    }
    c.fillStyle = P.live; c.font = `500 ${px(15)}px "JetBrains Mono"`; c.textAlign = 'right'; c.fillText('WEAK JOINT ×2', w - 0.02, 0.05); c.globalAlpha = 1;
  }
}
function whoPays(c, w, h, s, k) {       // 02: the customer, the product, and the money that crosses between them
  const px = (v) => v / s, base = h - 0.08, pay = ease.inOut3(seg(k, 0.25, 0.5)), coin = seg(k, 0.5, 0.82);
  c.strokeStyle = P.ink2; c.lineWidth = px(1.3); c.beginPath(); c.moveTo(0.02, base); c.lineTo(w - 0.02, base); c.stroke();
  const ca = smoothstep(seg(k, 0.0, 0.2));
  c.save(); c.globalAlpha = ca; c.translate(0.2, base); c.scale(0.42, 0.42); human(c, s * 0.42, { P, pose: 'stand', reach: 0.6 * pay, lean: 0.03 }); c.restore();
  c.save(); c.globalAlpha = smoothstep(seg(k, 0.05, 0.25)); c.translate(w - 0.42, base - 0.38); thing(c, 'store', 0.38, 0.38, s, { P, tone: 1 }); c.restore();
  // the transaction pathway
  const a = { x: 0.3, y: base - 0.5 }, b = { x: w - 0.44, y: base - 0.3 }, cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 0.18;
  const pt = (u) => ({ x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * cx + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * cy + u * u * b.y });
  if (pay > 0) { c.strokeStyle = P.ink; c.lineWidth = px(2); c.setLineDash([px(2), px(6)]); c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 30; i++) { const q = pt((i / 30) * pay); i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); } c.stroke(); c.setLineDash([]); }
  if (coin > 0 && coin < 1) { const q = pt(ease.inOut3(coin)); c.fillStyle = P.ink; c.beginPath(); c.arc(q.x, q.y, 0.035, 0, Math.PI * 2); c.fill(); c.strokeStyle = P.bg; c.lineWidth = px(1.5); c.beginPath(); c.arc(q.x, q.y, 0.022, 0, Math.PI * 2); c.stroke(); }
  if (coin >= 1) { c.fillStyle = P.ink; c.font = `500 ${px(15)}px "JetBrains Mono"`; c.letterSpacing = `${px(3)}px`; c.textAlign = 'center'; c.globalAlpha = smoothstep(seg(k, 0.82, 0.92)); c.fillText('PAID', cx, cy - 0.04); c.globalAlpha = 1; }
}
function provenVsAssumed(c, w, h, s, k) { // 03: the plan opens; what's proven on the left, what's only assumed on the right
  const px = (v) => v / s, open = ease.inOut3(seg(k, 0.15, 0.45)), mark = seg(k, 0.4, 0.9), gap = 0.08 * open;
  const pw = 0.62, ph = 0.78, x0 = w / 2 - pw / 2, y0 = 0.07;
  // left half (proven: 2 lines) and right half (assumed: 5 lines) slide apart
  c.save(); c.translate(-gap, 0); c.beginPath(); c.rect(0, 0, w / 2, h); c.clip(); thing(c, 'plan', pw, ph, s, { P, tone: 1 }); c.restore();
  c.save(); c.translate(x0, y0); c.translate(-gap, 0); c.beginPath(); c.rect(0, 0, pw / 2, ph); c.clip(); thing(c, 'plan', pw, ph, s, { P, tone: 1 }); c.restore();
  c.save(); c.translate(x0 + gap, y0); c.beginPath(); c.rect(pw / 2, 0, pw / 2, ph); c.clip(); thing(c, 'plan', pw, ph, s, { P, tone: lerp(1, 0.55, open) }); c.restore();
  if (open > 0.5) {
    c.font = `500 ${px(15)}px "JetBrains Mono"`; c.letterSpacing = `${px(3)}px`; c.globalAlpha = smoothstep(seg(k, 0.4, 0.55));
    c.fillStyle = P.ink; c.textAlign = 'right'; c.fillText('PROVEN', w / 2 - gap - 0.02, y0 - 0.02); c.fillStyle = P.ink2; c.textAlign = 'left'; c.fillText('ASSUMED', w / 2 + gap + 0.02, y0 - 0.02); c.globalAlpha = 1;
    // checks for the proven lines, question marks for the rest
    c.lineWidth = px(2.4); c.lineCap = 'round';
    for (let i = 0; i < 2; i++) { const a = smoothstep(seg(mark, i * 0.15, i * 0.15 + 0.2)); if (a <= 0) continue; const y = y0 + 0.3 + i * 0.14; c.globalAlpha = a; c.strokeStyle = P.ink; c.beginPath(); c.moveTo(x0 - gap - 0.12, y); c.lineTo(x0 - gap - 0.09, y + 0.03); c.lineTo(x0 - gap - 0.04, y - 0.04); c.stroke(); }
    c.font = `800 ${px(26)}px "Inter Display"`; c.fillStyle = P.ink2; c.textAlign = 'left';
    for (let i = 0; i < 5; i++) { const a = smoothstep(seg(mark, 0.25 + i * 0.1, 0.4 + i * 0.1)); if (a <= 0) continue; c.globalAlpha = a; c.fillText('?', x0 + pw + gap + 0.04, y0 + 0.24 + i * 0.12); }
    c.globalAlpha = 1;
  }
}
function scale(c, w, h, s, k) {         // 04: the plan on one side, the strongest case against it on the other
  const px = (v) => v / s, base = h - 0.06, cx = w / 2, top = base - 0.52;
  const drops = [0.42, 0.58, 0.74], n = drops.filter((d) => k > d + 0.06).length + drops.reduce((a, d) => a + (k > d && k <= d + 0.06 ? seg(k, d, d + 0.06) : 0), 0);
  const tilt = lerp(0.2, -0.06, ease.inOut3(clamp(n / 3)));   // starts leaning to the plan; evidence brings it past level
  const bw = 0.38, L = { x: cx - Math.cos(tilt) * bw, y: top + Math.sin(tilt) * bw }, R = { x: cx + Math.cos(tilt) * bw, y: top - Math.sin(tilt) * bw };
  c.fillStyle = P.ink; c.strokeStyle = P.ink; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx - 0.12, base); c.lineTo(cx + 0.12, base); c.lineTo(cx + 0.02, top); c.lineTo(cx - 0.02, top); c.closePath(); c.fill();
  c.lineWidth = px(3.5); c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(R.x, R.y); c.stroke();
  c.beginPath(); c.arc(cx, top, 0.022, 0, Math.PI * 2); c.fill();
  const pan = (p, label, items) => {
    c.lineWidth = px(1.4); c.strokeStyle = P.ink2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 0.1, p.y + 0.16); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.1, p.y + 0.16); c.stroke();
    c.fillStyle = P.ink; c.beginPath(); c.moveTo(p.x - 0.13, p.y + 0.16); c.lineTo(p.x + 0.13, p.y + 0.16); c.lineTo(p.x + 0.1, p.y + 0.19); c.lineTo(p.x - 0.1, p.y + 0.19); c.fill();
    c.font = `500 ${px(14)}px "JetBrains Mono"`; c.letterSpacing = `${px(3)}px`; c.textAlign = 'center'; c.fillStyle = P.ink2; c.fillText(label, p.x, p.y + 0.26);
    items(p);
  };
  pan(L, 'MY PLAN', (p) => { c.save(); c.translate(p.x - 0.09, p.y + 0.16 - 0.23); thing(c, 'plan', 0.18, 0.23, s, { P, tone: 1 }); c.restore(); });
  pan(R, 'AGAINST', (p) => {
    ['COST', 'RIVALS', 'DEMAND?'].forEach((lb, i) => {
      const d = seg(k, drops[i], drops[i] + 0.06); if (d <= 0) return;
      const y = lerp(p.y - 0.5, p.y + 0.16 - 0.05 * (i + 1), ease.in3(d));
      c.fillStyle = P.ink; c.fillRect(p.x - 0.08, y, 0.16, 0.045);
      c.font = `500 ${px(11)}px "JetBrains Mono"`; c.letterSpacing = `${px(2)}px`; c.textAlign = 'center'; c.fillStyle = P.bg; c.fillText(lb, p.x, y + 0.033);
    });
  });
}

/* ======================= the frame ======================= */
function draw(ctx, t) {
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H); e.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000000'); g.addColorStop(0.55, '#08080A'); g.addColorStop(1, '#000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = camAt(t), tf = Math.round(t * FPS) / FPS;
  const fin = B.fin, worldFade = 1 - smoothstep(seg(t, fin + 0.1, fin + 1.1));
  const reorg = seg(t, B.s5 + 0.2, B.s5 + 2.2), sysOn = smoothstep(seg(t, B.s5 + 1.6, B.s5 + 2.4));
  const standing = t > 12.45 && t < 29.0, standK = smoothstep(seg(t, 12.3, 12.6)) * (1 - smoothstep(seg(t, 28.9, 29.0)));
  const qDim = smoothstep(seg(t, B.ask + 0.6, B.q1)) * (1 - smoothstep(seg(t, B.s5, B.s5 + 0.8)));   // the empire steps back while the questions work
  const UI = [];                       // screen-space overlays drawn after the glow, in order

  /* ---------- atmosphere ---------- */
  const emp = cam.project({ x: 4.0, y: 1.0, z: 5.0 });
  const empK = smoothstep(seg(t, 10.5, 13)) * (1 - 0.6 * smoothstep(seg(t, B.s4 - 0.5, B.s4 + 0.5))) * worldFade;
  if (emp && empK > 0) { glow(ctx, emp.x, emp.y, 760, 520, { alpha: 0.08 * empK }); cone(ctx, { x: emp.x, y: -60 }, 260, cam.project({ x: 4.0, y: 0, z: 5.0 }), 900, { alpha: 0.06 * empK, L, blur: 40 }); }
  const mp = cam.project({ x: M.x, y: M.y + M.h / 2, z: M.z });
  const mk = smoothstep(seg(t, B.q1 - 0.4, B.q1 + 0.2)) * (1 - smoothstep(seg(t, B.s5 - 0.2, B.s5 + 0.6)));
  if (mp && mk > 0) { glow(ctx, mp.x, mp.y, 520, 480, { alpha: 0.1 * mk }); }

  /* ---------- floor ---------- */
  {
    e.fillStyle = P.tech; const step = 0.32;
    for (let z = -3; z <= 40; z += step) for (let x = -10; x <= 16; x += step) {
      const p = cam.project({ x, y: 0, z }); if (!p || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
      const fog = 1 - smoothstep(clamp((p.z - 3) / 30));
      const pd = 1 - smoothstep(clamp(Math.hypot(x - 0.1, z - 0.2) / 2.4)), pe = 1 - smoothstep(clamp(Math.hypot(x - 4, z - 5) / 4.5));
      const a = fog * (0.1 + 0.6 * pd + 0.25 * pe * (empK + sysOn)) * worldFade;
      if (a < 0.015) continue;
      e.globalAlpha = Math.min(1, a); e.beginPath(); e.arc(p.x, p.y, Math.max(0.9, 0.011 * p.s), 0, Math.PI * 2); e.fill();
    }
    e.globalAlpha = 1;
  }

  /* ---------- everything that stands, depth-sorted ---------- */
  const D = []; const push = (d, fn) => D.push({ d, fn });
  const deskD = cam.view({ x: 0.4, y: 0.8, z: 0 }).z;

  // the seven approvals become the first seven things; the rest of the empire grows out of them
  BUBBLES.forEach((b, i) => {
    const m0 = 9.0 + i * 0.42, kFly = ease.inOut3(seg(t, m0 + 0.25, m0 + 1.2));
    if (t < m0) return;
    const sl = b.slot, keep = KEEP.includes(i);
    const cur = arcFrom({ x: b.x, y: b.y - 0.1, z: b.z }, { x: sl.x, y: sl.y + sl.h / 2, z: sl.z }, 0.7)(kFly);
    const sc = lerp(0.42, 1, kFly);
    let pos = { ...sl, x: cur.x, z: cur.z, y: cur.y - sl.h * sc / 2, w: sl.w * sc, h: sl.h * sc }, alpha = smoothstep(seg(t, m0, m0 + 0.25)), tn = 1;
    if (!keep) { const s = ease.in3(seg(t, B.s5 + 0.3 + i * 0.12, B.s5 + 1.2 + i * 0.12)); pos.y -= s * (sl.y + sl.h + 0.3); alpha *= 1 - s; }
    tn = lerp(1, 0.8, smoothstep(seg(t, B.agree - 0.6, B.agree + 0.4))) * (keep ? lerp(1, 1.25, sysOn) : 1);
    alpha *= worldFade * (1 - 0.7 * qDim);
    if (alpha <= 0.01) return;
    const d = cam.view({ x: pos.x, y: pos.y + pos.h / 2, z: pos.z }).z; if (d < 0.6) return;
    const a2 = alpha * nearFade(d);
    push(d, () => { e.save(); e.globalAlpha = a2; place(e, cam, pos, { P, tone: Math.min(1, tn), mark: kFly > 0.9, tether: kFly > 0.9 }); e.restore(); });
  });
  for (const it of EMPIRE) {
    if (tf < it.born) continue;
    const k = ease.out5(seg(t, it.born, it.born + 0.6));
    const cur = arcFrom({ x: it.src.x, y: it.src.y + it.src.h / 2, z: it.src.z }, { x: it.x, y: it.y + it.h / 2, z: it.z }, 0.9)(k), sc = lerp(0.2, 1, k);
    let pos = { ...it, x: cur.x, z: cur.z, y: cur.y - it.h * sc / 2, w: it.w * sc, h: it.h * sc }, alpha = Math.min(1, seg(t, it.born, it.born + 0.15) * 2);
    const s = ease.in3(seg(t, B.s5 + 0.2 + hash(it.x * 13, 3) * 0.8, B.s5 + 1.1 + hash(it.x * 13, 3) * 0.8));
    pos.y -= s * (it.y + it.h + 0.3); alpha *= (1 - s) * worldFade * (1 - 0.7 * qDim);
    if (alpha <= 0.01) continue;
    const d = cam.view({ x: pos.x, y: pos.y + pos.h / 2, z: pos.z }).z; if (d < 0.6) continue;
    const a2 = alpha * nearFade(d), tn = lerp(1, 0.75, smoothstep(seg(t, B.agree - 0.6, B.agree + 0.4)));
    push(d, () => { e.save(); e.globalAlpha = a2; place(e, cam, pos, { P, tone: tn, mark: k > 0.9, tether: k > 0.9 }); e.restore(); });
  }

  // the builder, standing proud in front of it all (sequence 2-3)
  if (standK > 0.01) push(cam.view({ x: STAND.x, y: 0.9, z: STAND.z }).z, () => {
    e.save(); e.globalAlpha = standK; e.strokeStyle = P.tech; e.lineWidth = 1.2; floorCircle(e, cam, STAND.x, STAND.z, 0.4); e.stroke();
    billboard(e, cam, { x: STAND.x, y: 0, z: STAND.z }, (g2, s) => walker(g2, s, P, { lean: -0.05, look: 0.7, reach: 0 })); e.restore();
  });

  // sequence 3: a customer walks up, nothing happens, walks away
  {
    const t1 = B.s3 + 0.7, arrive = t1 + 1.6, turn = B.agree + 0.9, gone = turn + 2.0;
    const k1 = ease.inOut3(seg(t, t1, arrive)), k2 = ease.inOut3(seg(t, turn + 0.15, gone));
    const x = k2 > 0 ? lerp(2.55, 1.0, k2) : lerp(1.3, 2.55, k1), z = 2.05, /* in front of the empire, clear of the floating plan */ a = smoothstep(seg(t, t1, t1 + 0.4)) * (1 - smoothstep(seg(t, gone - 0.6, gone)));
    const walking = (t > t1 && t < arrive) || (t > turn + 0.15 && t < gone);
    if (a > 0.01) push(cam.view({ x, y: 0.9, z }).z, () => {
      e.save(); e.globalAlpha = a; e.strokeStyle = P.tech; e.lineWidth = 1.2; floorCircle(e, cam, x, z, 0.36); e.stroke();
      billboard(e, cam, { x, y: 0, z }, (g2, s) => walker(g2, s, P, { flip: t > turn, step: walking ? t * 2.2 : 0, look: t > arrive && t < turn ? 0.8 : 0 })); e.restore();
    });
  }

  // sequence 5: what's left connects to the customer and works
  {
    const conv = ease.inOut3(seg(t, fin, fin + 1.1)), sc = 1 - conv;
    const C = (p, y = 0) => conv > 0 ? { x: lerp(p.x, SYS.ctr.x, conv), y: lerp(y, SYS.ctr.y, conv), z: lerp(p.z, SYS.ctr.z, conv) } : { x: p.x, y, z: p.z };
    if (sysOn > 0.01 && sc > 0.01) {
      const pathK = (i) => smoothstep(seg(t, B.s5 + 2.0 + i * 0.2, B.s5 + 2.6 + i * 0.2));
      const req = [B.s5 + 2.8, B.s5 + 3.6], work = [B.s5 + 3.7, B.s5 + 4.4], back = [B.better + 0.05, B.better + 0.8];
      const lit = smoothstep(seg(t, back[1], back[1] + 0.25));
      for (let i = 0; i < 3; i++) {
        const k = pathK(i); if (k <= 0) continue;
        const pts = LOOP[i].slice(0, Math.max(2, Math.round(k * LOOP[i].length))).map((q) => C(q));
        push(cam.view(LOOP[i][24]).z + 3, () => { e.save(); e.globalAlpha = sc; e.lineCap = 'round'; e.strokeStyle = mix(P.ink, P.live, lit); e.lineWidth = 2.6 + 0.8 * lit; path3(e, cam, pts); e.stroke(); e.strokeStyle = P.tech; e.lineWidth = 1; e.setLineDash([2, 7]); path3(e, cam, pts.map((q) => ({ ...q, x: q.x + 0.13 }))); e.stroke(); e.restore(); });
      }
      const cp = C(SYS.cust);
      push(cam.view({ x: cp.x, y: 0.9, z: cp.z }).z, () => {
        e.save(); e.globalAlpha = sysOn * sc; e.strokeStyle = lit > 0 ? mix(P.tech, P.live, lit) : P.tech; e.lineWidth = 1.2; floorCircle(e, cam, cp.x, cp.z, 0.42 * sc); e.stroke();
        billboard(e, cam, cp, (g2, s) => { g2.scale(sc, sc); human(g2, s * sc, { P, pose: 'stand', reach: 0.3 + 0.4 * ease.out3(seg(t, req[0] - 0.3, req[0])) * (1 - ease.out3(seg(t, req[0] + 0.4, req[0] + 0.8))), lean: 0.03 }); }); e.restore();
      });
      const token = (pts, u, kind, a = 1) => {
        const q = along(pts, u, 0.32), pos = C(q, q.y);
        push(cam.view(pos).z - 0.05, () => {
          e.save(); e.globalAlpha = a * sc;
          if (kind === 'done') panel(e, cam, pos, 0.42, 0.42, 0, (c2, w, h, s) => { const px = (v) => v / s; c2.fillStyle = P.ink; c2.beginPath(); c2.roundRect(0, 0, w, h, 0.03); c2.fill(); c2.strokeStyle = P.bg; c2.lineWidth = px(4); c2.lineCap = 'round'; c2.beginPath(); c2.moveTo(w * 0.28, h * 0.52); c2.lineTo(w * 0.44, h * 0.68); c2.lineTo(w * 0.74, h * 0.32); c2.stroke(); });
          else billboard(e, cam, pos, (g2, s) => { g2.fillStyle = P.ink; g2.beginPath(); g2.roundRect(-0.12, -0.2, 0.24, 0.17, 0.02); g2.fill(); g2.fillStyle = P.bg; g2.fillRect(-0.08, -0.16, 0.12, 0.016); g2.fillRect(-0.08, -0.12, 0.08, 0.016); });
          e.restore();
        });
      };
      if (t > req[0] && t < req[1] + 0.1) token(LOOP[0], ease.inOut3(seg(t, req[0], req[1])), 'req');
      if (t > work[0] && t < work[1] + 0.1) token(LOOP[1], ease.inOut3(seg(t, work[0], work[1])), 'req');
      if (t > back[0] && t < back[1] + 0.4) token(LOOP[2], ease.inOut3(seg(t, back[0], back[1])), 'done', 1 - smoothstep(seg(t, back[1] + 0.1, back[1] + 0.4)));
      if (t > back[1] + 0.3) for (let q = 0; q < 3; q++) { const u = ((t - back[1] - 0.3) * 0.45 + q * 0.33) % 1; token(LOOP[q], u, q === 2 ? 'done' : 'req', smoothstep(seg(t, back[1] + 0.3, back[1] + 0.8)) * smoothstep(seg(u, 0, 0.08)) * (1 - smoothstep(seg(u, 0.88, 1)))); }
      const held = smoothstep(seg(t, back[1], back[1] + 0.2)) * (1 - smoothstep(seg(t, back[1] + 1.5, back[1] + 1.9)));
      if (held > 0.01) push(cam.view({ x: SYS.cust.x, y: 2, z: SYS.cust.z }).z - 0.1, () => { e.save(); e.globalAlpha = held * sc; panel(e, cam, C({ x: SYS.cust.x + 0.05, z: SYS.cust.z }, 2.0), 0.44, 0.44, 0, (c2, w, h, s) => { const px = (v) => v / s; c2.fillStyle = P.ink; c2.beginPath(); c2.roundRect(0, 0, w, h, 0.03); c2.fill(); c2.strokeStyle = P.bg; c2.lineWidth = px(4); c2.lineCap = 'round'; c2.beginPath(); c2.moveTo(w * 0.28, h * 0.52); c2.lineTo(w * 0.44, h * 0.68); c2.lineTo(w * 0.74, h * 0.32); c2.stroke(); }); e.restore(); });
    }
    const pk = smoothstep(seg(t, fin + 0.75, fin + 1.2)) * (1 - smoothstep(seg(t, fin + 1.5, fin + 2.1)));
    if (pk > 0.01) { const p = cam.project(SYS.ctr); if (p) { glow(ctx, p.x, p.y, 220, 220, { alpha: 0.5 * pk }); push(0.1, () => { e.save(); e.globalAlpha = pk; e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 9 * (1 - 0.4 * conv) + 3, 0, Math.PI * 2); e.fill(); e.restore(); }); } }
  }

  // the question pictures: one sheet in space above the desk, a different picture per question
  if (mk > 0.01) push(cam.view({ x: M.x, y: M.y, z: M.z }).z - 0.5, () => {
    const pics = [[B.q1, B.q2, stressTest], [B.q2, B.q3, whoPays], [B.q3, B.fav, provenVsAssumed], [B.fav + 0.15, B.s5, scale]];
    for (const [a, b, fn] of pics) {
      const v = smoothstep(seg(t, a - 0.15, a + 0.2)) * (1 - smoothstep(seg(t, b - 0.25, b + 0.05)));
      if (v <= 0.01) continue;
      e.save(); e.globalAlpha = v * mk; panel(e, cam, M, M.w, M.h, 0, (c2, w, h, s) => fn(c2, w, h, s, seg(t, a, b))); e.restore();
    }
  });

  // paint far to near, with the workstation (and the builder, unless they're up and standing) at its depth
  D.sort((a, b) => b.d - a.d);
  const drawDesk = () => {
    if (deskD < 1.0 || worldFade <= 0.01) return;
    const typed = (() => {
      const lines = [[2.95, 5.0, 'here’s my business idea'], [B.ask + 0.25, B.ask + 1.4, 'is this a good idea?'], [B.q1, B.q1 + 0.7, 'why would this fail?'], [B.q2, B.q2 + 0.6, 'who actually pays for this?'], [B.q3, B.q3 + 0.7, 'what haven’t I proven?'], [B.q4, B.q4 + 0.8, 'argue against my plan.']];
      let cur = ''; for (const [a, b, s] of lines) if (tf >= a) cur = s.slice(0, Math.round(seg(tf, a, b) * s.length));
      return cur;
    })();
    A(ctx, e, { pos: cam.pos, pitch: cam.pitch, f: cam.f, text: false, liveBulb: 1, ruler: false, noFloor: true, figure: !standing, prompt: '', reach: 1, drift: 0.045 * t, bulbGlow: 1 });
    // the assistant: an original panel, not anyone's product
    const pa = smoothstep(seg(t, 0.2, 0.6)) * (1 - smoothstep(seg(t, 13.0, 14.0)) + smoothstep(seg(t, B.ask - 0.6, B.ask))) * (1 - smoothstep(seg(t, B.q1 - 0.35, B.q1 + 0.1)));
    if (pa > 0.01) {
      const strike = seg(t, B.ask + 1.9, B.ask + 2.4);
      e.save(); e.globalAlpha = Math.min(1, pa);
      panel(e, cam, PANEL.c, PANEL.w, PANEL.h, PANEL.yaw, (c2, w, h, s) => {
        aiPanel(c2, w, h, s, { ink: P.ink, bg: P.bg, live: P.live, prompt: strike > 0.9 && tf < B.q1 ? '' : typed, caret: Math.floor(t * 3) % 2 ? 0.25 : 1, progress: 0 });
        if (strike > 0 && strike < 1) { const px = (v) => v / s; c2.strokeStyle = P.ink; c2.lineWidth = px(2.5); c2.beginPath(); c2.moveTo(0.08, 0.22); c2.lineTo(0.08 + (w - 0.16) * ease.out3(strike), 0.22); c2.stroke(); }
      });
      e.restore();
    }
  };
  let deskDone = false;
  for (const x of D) { if (!deskDone && x.d < deskD) { drawDesk(); deskDone = true; } x.fn(); }
  if (!deskDone) drawDesk();

  halo(ctx, L);

  /* ---------- screen-space: approvals, labels, type ---------- */
  // the approvals (each pops with a small orange glow; in sequence 3 the ones over the empire turn into questions)
  BUBBLES.forEach((b, i) => {
    const t0 = B.pops[i], m0 = 9.0 + i * 0.42;
    if (t < t0 || t > m0 + 0.3) return;
    const pop = seg(t, t0, t0 + 0.35), a = smoothstep(seg(t, t0, t0 + 0.12)) * (1 - smoothstep(seg(t, m0, m0 + 0.28)));
    bubble(ctx, cam, b, { a, pop, glowK: 1 - seg(t, t0, t0 + 0.55) });
  });
  // the approvals that stay behind, floating over the empire: they become questions once a customer finds nothing there
  {
    const hover = [[3.7, 2.55, 4.2], [4.6, 2.95, 4.9], [4.95, 2.2, 3.9], [3.2, 3.15, 4.8]];
    const ga = smoothstep(seg(t, 15.2, 16.2)) * (1 - smoothstep(seg(t, B.ask - 0.4, B.ask + 0.3)));
    if (ga > 0.01) hover.forEach(([x, y, z], i) => bubble(ctx, cam, { x, y, z, text: BUBBLES[i].text }, { a: ga * 0.92, q: smoothstep(seg(t, B.agree + 0.5 + i * 0.45, B.agree + 0.75 + i * 0.45)), tone: 0.92 }));
  }
  // what the yes man wrote on it
  const lbl = (at, a0, k, v, opts) => tag(ctx, cam, at, k, v, smoothstep(seg(t, a0, a0 + 0.35)) * (1 - smoothstep(seg(t, B.rev - 0.6, B.rev - 0.1))), opts);
  lbl({ x: BUBBLES[0].x + 0.1, y: BUBBLES[0].y - 0.12, z: BUBBLES[0].z }, B.brilliant, 'IDEA:', 'BRILLIANT', { dx: -95, dy: 150, align: 'right' });   // hangs below-left: clear of the frame edge and the bubbles
  lbl({ x: 3.1, y: 2.1, z: 2.7 }, B.strategy, 'STRATEGY:', 'APPROVED', { dx: -80, dy: -90, align: 'right' });
  lbl({ x: 4.7, y: 3.0, z: 4.5 }, B.world, 'POTENTIAL:', 'UNLIMITED', { dx: -40, dy: -120, align: 'right' });
  // the reveal
  { const rk = smoothstep(seg(t, B.meanwhile + 0.4, B.meanwhile + 0.8)) * (1 - smoothstep(seg(t, B.s3 - 0.2, B.s3 + 0.3))), zk = smoothstep(seg(t, B.rev, B.rev + 0.12));
    if (rk > 0.01) {
      mono(ctx, 'REVENUE', 80, 300, { size: 24, color: P.ink2, track: 6, alpha: rk });
      ctx.save(); ctx.globalAlpha = rk; ctx.fillStyle = P.tech; ctx.fillRect(80, 318, 44, 1.5);
      ctx.font = '800 220px "Inter Display"'; ctx.fillStyle = P.ink; ctx.globalAlpha = rk * zk; ctx.fillText('$0', 64, 520); ctx.restore();
      // the dots after it: the counter was waiting
      if (zk < 1) { ctx.save(); ctx.globalAlpha = rk * (1 - zk); ctx.font = '800 220px "Inter Display"'; ctx.fillStyle = P.ink2; ctx.fillText('…', 64, 520); ctx.restore(); }
    } }
  // titles
  { const k = smoothstep(seg(t, 0.25, 0.6)) * (1 - smoothstep(seg(t, 7.8, 8.4))); if (k > 0.01) { mono(ctx, 'FILM 002', 80, 140, { size: 18, color: P.ink2, track: 5, alpha: k }); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = P.tech; ctx.fillRect(228, 133, 40, 1.5); ctx.restore(); mono(ctx, 'THE AI YES MAN', 284, 140, { size: 18, color: P.ink, track: 5, alpha: k }); } }
  { const r = seg(t, B.agree, B.agree + 0.7), a = 1 - smoothstep(seg(t, B.ask - 0.5, B.ask)); if (r > 0) { kicker(ctx, P, '03 — THE DIFFERENCE', 250, a * smoothstep(r), mono); headline(ctx, P, W, [[['AGREEMENT ', P.ink], ['≠', P.live]], [['VALIDATION.', P.ink]]], 400, a, r); } }
  // the four questions, one card at a time
  { const Q = [[B.q1, B.q2, '01', ['WHY WOULD', 'THIS FAIL?']], [B.q2, B.q3, '02', ['WHO ACTUALLY', 'PAYS FOR THIS?']], [B.q3, B.fav, '03', ['WHAT HAVEN’T', 'I PROVEN?']], [B.q4, B.s5 - 0.2, '04', ['ARGUE AGAINST', 'MY PLAN.']]];
    for (const [a, b, n, lines] of Q) {
      const r = seg(t, a - 0.05, a + 0.6), v = 1 - smoothstep(seg(t, b - 0.2, b + 0.1)); if (r <= 0 || v <= 0.01) continue;
      kicker(ctx, P, `QUESTION ${n}`, 210, v * smoothstep(r), mono);
      headline(ctx, P, W, lines.map((x) => [x]), 340, v, r, { size: 86 });
    }
    // "and my favorite" holds the beat between 03 and 04
    const fk = smoothstep(seg(t, B.fav, B.fav + 0.3)) * (1 - smoothstep(seg(t, B.q4 - 0.2, B.q4 + 0.1)));
    if (fk > 0.01) kicker(ctx, P, 'QUESTION 04 — THE FAVORITE', 210, fk, mono);
  }
  { const r1 = seg(t, B.s5 + 0.5, B.s5 + 1.2), r2 = seg(t, B.better, B.better + 0.7), a = 1 - smoothstep(seg(t, fin - 0.2, fin + 0.4));
    if (r1 > 0) { kicker(ctx, P, '05 — BETTER THINKING', 250, a * smoothstep(r1), mono); headline(ctx, P, W, [['BETTER QUESTIONS.']], 400, a, r1, { size: 96 }); }
    if (r2 > 0) headline(ctx, P, W, [['BETTER DECISIONS.', P.live]], 498, a, r2, { size: 96 }); }
  endCard(ctx, P, W, MARK, WORD, smoothstep(seg(t, fin + 1.0, fin + 1.6)), smoothstep(seg(t, fin + 1.4, fin + 2.0)), seg(t, B.build - 0.1, B.build + 0.5));

  vignette(ctx, W, H, { amount: 0.66 });
  grain(ctx, L, Math.round(t * FPS));
}

async function load() {
  TL = await (await fetch('/tools/motion/films/002-ai-yes-man/timeline.json')).json();
  const l = (n) => TL.lines[n - 1], pz = (n, i, k) => l(n).pauses[i][k];
  B = {
    pops: [1.75, l(2).pauses[1][1] + 0.05, l(2).pauses[1][1] + 0.55, l(2).pauses[1][1] + 1.0, l(2).pauses[1][1] + 1.4, l(2).end - 0.25, l(2).end + 0.15],
    brilliant: l(2).end - 0.6, strategy: l(3).at, world: pz(3, 2, 1),
    meanwhile: l(4).at, rev: pz(4, 0, 1), s3: l(5).at, agree: l(6).at, ask: l(7).at,
    q1: l(8).at, q2: l(9).at, q3: l(10).at, fav: l(11).at, q4: pz(11, 0, 1), s5: l(12).at, better: l(13).at,
    fin: l(14).at - 0.9, build: pz(14, 0, 1), end: TL.total,
  };
  const d = { x: 0.33, y: 1.0, z: -4.55 }, fin = B.fin;
  camAt = cameraKeys([
    [0, d, -0.06, 1650],
    [8.4, { x: 0.36, y: 1.05, z: -4.3 }, -0.06, 1650],                                  // slow push while the approvals pile up
    [12.6, { x: 1.3, y: 1.75, z: -7.6 }, 0.04, 1650],                                   // the approvals become things
    [B.meanwhile - 0.2, { x: 2.3, y: 3.6, z: -11.8 }, 0.12, 1650],                      // pull back: the empire
    [B.s3, { x: 2.32, y: 3.62, z: -11.95 }, 0.12, 1650],                                // ...everything stops ($0)
    [B.s3 + 2.1, { x: 3.0, y: 2.6, z: -5.4 }, 0.12, 1650],                              // move in on it, to a customer
    [B.ask - 0.6, { x: 2.95, y: 2.6, z: -5.7 }, 0.12, 1650],
    [B.ask + 1.3, { x: 0.45, y: 1.05, z: -4.0 }, -0.04, 1650],                          // back to the desk
    [B.q1 - 0.2, { x: 0.55, y: 1.32, z: -3.3 }, 0.0, 1650],                             // closer: the questions
    [B.s5, { x: 0.55, y: 1.33, z: -3.15 }, 0.0, 1650],
    [B.s5 + 2.2, { x: 3.1, y: 3.1, z: -5.6 }, 0.2, 1650],                               // pull back: what's left works
    [fin, { x: 3.15, y: 3.15, z: -5.85 }, 0.2, 1650],
    [fin + 1.6, { x: 4.0, y: 6.0, z: -1.2 }, 0.72, 1550],                               // centre the loop as it draws in
    [99, { x: 4.0, y: 6.0, z: -1.2 }, 0.72, 1550],
  ], W, H);
  MARK = await brandPath('/assets/brand/mark.svg'); WORD = await brandPath('/assets/brand/wordmark.svg');
  comp.duration = TL.total;
}

const comp = { width: W, height: H, fps: FPS, duration: 60, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load, draw };
export default comp;
