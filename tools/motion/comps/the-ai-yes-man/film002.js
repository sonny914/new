// FILM 002: THE AI YES MAN (v2, character-led). One set, two characters, one product, cause and effect.
// The builder (our figure) and the Yes Man (the AI as a character: a floating assistant whose screen says ✓ to everything).
//
//  hook       AI will have you thinking you're cooking     the Yes Man lights up ✓ and gives a thumbs-up
//  idea       you tell it your business idea... brilliant  the idea flies from his screen to the Yes Man: BRILLIANT.
//  hype       strategy / plan / change the world           APPROVED stamp; the store rises; extras pile on; he stands proud
//  reality    Meanwhile... you ain't sold a damn thing      everything stops. SOLD 0. He deflates. The Yes Man keeps the thumb up
//  fair       Look, AI can help you build an idea          it really can: it adds the awning in a second
//  passerby   But agreement ain't validation               someone walks up, looks, leaves. Its ✓ turns into ?
//  habit      So stop asking it "is this a good idea?"     he asks; ABSOLUTELY. He scratches the question out
//  Q1         why would this fail?                         it scans the store: no handle on the door, no price
//  Q2         who actually pays for this?                  it points down the street: a real customer, with a need
//  Q3         what haven't I proven?                       the assumed extras come off; the store gets honest
//  Q4         argue against my plan                        it crosses its arms and pushes back; he fixes the door and the price
//  payoff     the point isn't... better at thinking        the customer walks in, pays: SOLD 1 (orange, earned). A small, real ✓
//  end        Quiet Bands. Build what matters.
import { clamp, hash, smoothstep, lerp, seg, ease } from '../../engine/math.js';
import { panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, halo, cone, glow, vignette, grain } from '../../engine/light.js';
import { human, chair, deskSeated, bulb } from '../../engine/humans.js';
import { thing } from '../../engine/environments.js';
import { yesMan, storefront } from '../../engine/cast.js';
import { PALETTES, mix } from '../../engine/color.js';
import { setPalette, P, mono, floorDots } from '../everybody-can-build/film-keys.js';
import { cameraKeys, arcFrom, along, floorCurve, nearFade, walker, headline, kicker, endCard, brandPath, brk } from '../shared/story.js';

const W = 1080, H = 1920, FPS = 30;
let L, TL, B, MARK, WORD, camAt;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');

/* ======================= the set ======================= */
const X0 = -1.65;                                   // desk near edge
const SEAT = { x: X0 - 0.33, z: 0 }, SCREEN = { x: X0 + 0.7, y: 1.06, z: 0.07 }, BULB = { x: X0 - 0.26, y: 1.64, z: 0 };
const STAND = [{ x: -1.25, z: 0.35 }, { x: 0.12, z: 0.5 }];          // beside the desk, then beside his store
const STORE = { x: 1.85, z: 1.25, w: 1.7, h: 1.25 };
const DOOR = { x: STORE.x + STORE.w / 2 - 0.5 + 0.18, z: STORE.z };
const STREET = floorCurve({ x: 3.35, z: 0.3 }, { x: DOOR.x + 0.05, z: DOOR.z - 0.35 }, -0.06, 40);
const CTR = { x: STORE.x, y: 0.75, z: STORE.z };
// where the Yes Man floats (base of its body), by story beat
const Y = {
  desk: { x: -0.5, y: 1.2, z: -0.1 }, store: { x: 0.78, y: 1.7, z: 0.35 }, build: { x: 0.85, y: 2.25, z: 0.6 },
  scanA: { x: 1.2, y: 1.15, z: 0.75 }, scanB: { x: 2.5, y: 1.15, z: 0.75 }, point: { x: 2.35, y: 1.75, z: 0.55 },
  argue: { x: 0.85, y: 1.35, z: 0.4 }, calm: { x: 0.9, y: 1.8, z: 0.35 },
};

/* ======================= helpers ======================= */
const lp3 = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y ?? 0, b.y ?? 0, k), z: lerp(a.z, b.z, k) });
/** piecewise path through keyed positions [[t, pos], ...] with in-out easing between keys */
function keyed(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lp3(keys[i - 1][1], keys[i][1], ease.inOut3(seg(t, keys[i - 1][0], keys[i][0])));
  return keys[keys.length - 1][1];
}
/** a speech bubble in screen space (crisp type). filled = the assistant talking; outlined = the builder */
function bubble(ctx, cam, at, text, { a = 1, pop = 1, filled = true, glowK = 0, strike = 0 } = {}) {
  const p = cam.project(at); if (!p || a <= 0.01) return;
  const k = pop < 1 ? ease.spring(pop, 0.6, 12) : 1, fs = Math.max(14, p.s * 0.1) * lerp(0.6, 1, k);
  ctx.save(); ctx.font = `800 ${fs}px "Inter Display"`; ctx.letterSpacing = '0.5px';
  const tw = ctx.measureText(text).width, bw = tw + fs * 1.2, bh = fs * 1.8, x = p.x - bw / 2, y = p.y - bh;
  if (glowK > 0.01) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(p.x, y + bh / 2, 0, p.x, y + bh / 2, bw * 0.9); g.addColorStop(0, `rgba(${rgb(P.live)},${0.45 * glowK})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - bw, y - bh, bw * 2, bh * 3); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.roundRect(x, y, bw, bh, bh * 0.32);
  if (filled) { ctx.fillStyle = P.ink; ctx.fill(); } else { ctx.fillStyle = P.bg; ctx.globalAlpha = a * 0.85; ctx.fill(); ctx.globalAlpha = a; ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(p.x - fs * 0.3, y + bh - 1); ctx.lineTo(p.x - fs * 0.05, y + bh + fs * 0.5); ctx.lineTo(p.x + fs * 0.15, y + bh - 1);
  if (filled) { ctx.fillStyle = P.ink; ctx.fill(); } else { ctx.fillStyle = P.bg; ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = filled ? P.bg : P.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, p.x, y + bh / 2 + fs * 0.04);
  if (strike > 0) { ctx.strokeStyle = P.ink; ctx.lineWidth = Math.max(2, fs * 0.09); ctx.beginPath(); ctx.moveTo(p.x - tw / 2, y + bh / 2); ctx.lineTo(p.x - tw / 2 + tw * ease.out3(strike), y + bh / 2); ctx.stroke(); }
  ctx.restore();
}
/** a technical tag with a leader, on a dark plate so it reads over anything */
function tag(ctx, cam, at, text, a, { dx = 70, dy = -60, color, align = 'left' } = {}) {
  const p = cam.project(at); if (!p || a <= 0.01) return;
  const ex = p.x + dx, ey = p.y + dy, col = color ?? P.ink;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.lineTo(ex + (align === 'left' ? 30 : -30), ey); ctx.stroke();
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '3px'; const tw = ctx.measureText(text).width, tx = align === 'left' ? ex + 38 : ex - 38 - tw;
  ctx.fillStyle = P.bg; ctx.globalAlpha = a * 0.85; ctx.beginPath(); ctx.roundRect(tx - 8, ey - 15, tw + 16, 30, 4); ctx.fill(); ctx.globalAlpha = a;
  ctx.fillStyle = col; ctx.fillText(text, tx, ey + 7); ctx.restore();
}
/** an orange ring around a world point, scaled with distance (a found problem) */
function ring(ctx, cam, at, r, a) { const p = cam.project(at); if (!p || a <= 0.01) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.live; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r * p.s, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }

/* ======================= the frame ======================= */
function draw(ctx, t) {
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H); e.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000000'); g.addColorStop(0.55, '#08080A'); g.addColorStop(1, '#000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = camAt(t), tf = Math.round(t * FPS) / FPS;
  const fin = B.fin, fade = 1 - smoothstep(seg(t, fin + 0.1, fin + 1.1)), conv = ease.inOut3(seg(t, fin, fin + 1.1));
  const frozen = t > B.meanwhile && t < B.fair;           // "Meanwhile...": nothing moves
  const tm = frozen ? B.meanwhile : t;                     // time for idle motion (bob, typing) stops during the freeze

  /* ---------- story state ---------- */
  const seated = t < B.stand;
  const standK = smoothstep(seg(t, B.stand, B.stand + 0.3));
  const walk = ease.inOut3(seg(t, B.c + 0.1, B.c + 1.3));
  const bpos = seated ? null : lp3(STAND[0], STAND[1], walk);
  const slump = smoothstep(seg(t, B.punch + 0.2, B.punch + 0.9)) * (1 - smoothstep(seg(t, B.q1 - 0.5, B.q1)));
  const proud = smoothstep(seg(t, B.c + 1.0, B.c + 1.6)) * (1 - slump);
  const relaxed = smoothstep(seg(t, B.sold, B.sold + 0.6));
  const rise = ease.out3(seg(t, B.b, B.b + 1.1));
  const extras = smoothstep(seg(t, B.c + 0.1, B.c + 0.9)), drop = ease.in3(seg(t, B.q3 + 1.6, B.q3 + 2.8));
  const awning = ease.out3(seg(t, B.fair + 1.0, B.fair + 2.0));
  const handle = smoothstep(seg(t, B.fix1, B.fix1 + 0.35)), price = smoothstep(seg(t, B.fix2, B.fix2 + 0.35));
  const soldShow = t > B.meanwhile + 0.35, sold = t >= B.sold ? 1 : 0, soldHot = smoothstep(seg(t, B.sold, B.sold + 0.3)) * (1 - 0.3 * smoothstep(seg(t, B.sold + 1, B.sold + 2)));
  const doorOpen = smoothstep(seg(t, B.enter - 0.4, B.enter)) * (1 - smoothstep(seg(t, B.exit + 0.3, B.exit + 0.7)));

  // the Yes Man: where it is, what its screen says, what its arms do
  const ym = keyed(t, [[0, Y.desk], [B.c, Y.desk], [B.c + 1.4, Y.store], [B.fair + 0.4, Y.store], [B.fair + 1.0, Y.build], [B.fair + 2.2, Y.build], [B.fair + 2.9, Y.store],
    [B.q1 + 0.1, Y.store], [B.q1 + 0.7, Y.scanA], [B.q1 + 1.9, Y.scanB], [B.q2 + 0.1, Y.scanB], [B.q2 + 0.6, Y.point], [B.q3, Y.point], [B.q3 + 0.8, Y.store],
    [B.fav + 0.2, Y.store], [B.q4 + 0.1, Y.argue], [B.fix1 - 0.2, Y.argue], [B.fix2 + 0.6, Y.calm]]);
  const bob = 0.025 * Math.sin(tm * 2.2);
  const S = (() => {   // screen + arms by beat (each change cross-fades over 0.2 s)
    const beats = [[0, 'dots', 'down'], [B.hook, 'check', 'thumbs'], [B.idea - 0.2, 'dots', 'down'], [B.brilliant, 'check', 'thumbs'], [B.a + 0.4, 'check', 'thumbs'],
      [B.fair + 0.8, 'dots', 'point'], [B.fair + 2.2, 'check', 'thumbs'], [B.passLook + 0.6, 'q', 'down'], [B.ask + 0.7, 'check', 'thumbs'],
      [B.q1, 'scan', 'down'], [B.q2, 'arrow', 'point'], [B.q3, 'q', 'down'], [B.q4, 'x', 'cross'], [B.q4 + 0.9, 'x', 'push'], [B.fix1 - 0.1, 'dots', 'down'], [B.sold + 0.1, 'check', 'down']];
    let i = 0; while (i < beats.length - 1 && t >= beats[i + 1][0]) i++;
    const [t0, sc, ar] = beats[i], [, psc, par] = beats[Math.max(0, i - 1)], k = smoothstep(seg(t, t0, t0 + 0.2));
    return { screen: sc, prevScreen: i ? psc : sc, screenK: i ? k : 1, arms: ar, armK: ar === 'down' ? 1 : k, prevArms: par };
  })();
  const ymHot = S.screen === 'check' ? (t < B.q1 ? 1 : smoothstep(seg(t, B.sold + 0.1, B.sold + 0.5))) : 0;
  const ymDir = (t > B.q4 && t < B.fix2 + 0.4) ? -1 : 1;
  const nodK = (t > B.sold + 0.2 && t < B.sold + 2.0) ? 0.09 * Math.sin((t - B.sold) * 7) * (1 - seg(t, B.sold + 1.4, B.sold + 2.0)) : 0;

  /* ---------- atmosphere ---------- */
  const sc = cam.project(SCREEN); if (sc && fade > 0) glow(ctx, sc.x - 30, sc.y, 300 * (sc.s / 500), 240 * (sc.s / 500), { alpha: 0.1 * fade });
  const st = cam.project({ x: STORE.x, y: 1.0, z: STORE.z }), stb = cam.project({ x: STORE.x, y: 0, z: STORE.z });
  if (st && stb && rise > 0) { glow(ctx, st.x, st.y, 560, 520, { alpha: 0.08 * rise * fade }); cone(ctx, { x: st.x, y: -60 }, 200, stb, 720, { alpha: 0.06 * rise * fade, L, blur: 40 }); }
  const yp = cam.project({ x: ym.x, y: ym.y + 0.5 + bob, z: ym.z }); if (yp && ymHot > 0) glow(ctx, yp.x, yp.y, 160, 160, { alpha: 0.28 * ymHot * fade, color: rgb(P.live) });
  const dp = cam.project({ x: DOOR.x, y: 0, z: DOOR.z }); if (dp && soldHot > 0) glow(ctx, dp.x, dp.y, 340, 110, { alpha: 0.22 * soldHot * fade, color: rgb(P.live) });

  /* ---------- floor ---------- */
  floorDots(e, cam, { cx: 0.6, cz: 0.6, r: 3.4, base: 0.09 * fade, pool: 0.45 * fade, x0: -6, x1: 9, z0: -3, z1: 26, step: 0.32 });
  { e.save(); e.globalAlpha = 0.8 * fade; e.strokeStyle = P.ink2; e.lineWidth = 2.2; e.lineCap = 'round'; e.setLineDash([0.1, 9]); path3(e, cam, [{ x: -7, y: 0, z: 1.95 }, { x: 9, y: 0, z: 1.95 }]); e.stroke(); e.restore(); }
  // the street to his door: dotted; it lights orange only once someone actually comes in and pays
  const streetK = smoothstep(seg(t, B.fair + 2.6, B.fair + 3.4));
  if (streetK > 0.01) {
    const lit = soldHot, draw = t > B.q2 ? 1 : 1;
    e.save(); e.globalAlpha = streetK * fade; e.lineCap = 'round';
    e.strokeStyle = mix(P.tech, P.live, lit); e.lineWidth = 1.6 + 1.4 * lit; e.setLineDash(lit > 0.5 ? [] : [2, 7]); path3(e, cam, STREET.slice(0, Math.round(draw * (STREET.length - 1)) + 1)); e.stroke(); e.restore();
  }

  /* ---------- things that stand, far to near ---------- */
  const D = []; const push = (d, fn) => D.push({ d, fn }); const dep = (p) => cam.view(p).z;
  // the store
  if (rise > 0) push(dep({ x: STORE.x, y: 0.6, z: STORE.z }), () => { e.save(); e.globalAlpha = fade; billboard(e, cam, { x: STORE.x, y: 0, z: STORE.z }, (g2, s) => storefront(g2, s, P, { w: STORE.w, h: STORE.h, rise, extras, extrasDrop: drop, awning, handle, price, sold: soldShow ? sold : null, soldHot, door: doorOpen })); e.restore(); });
  // the desk, chair, and the builder while he's sitting
  push(dep({ x: X0 + 0.5, y: 0.8, z: 0 }), () => {
    e.save(); e.globalAlpha = fade;
    billboard(e, cam, { x: SEAT.x, y: 0, z: 0.04 }, (g2, s) => chair(g2, s, { P }));
    const typing = t < B.idea + 1.4 ? 1 : 0;
    deskSeated(e, cam, { P, x0: X0, z0: 0, lines: 3 + typing * Math.floor(tm * 3) % 2 });
    if (seated) billboard(e, cam, { x: SEAT.x, y: 0, z: 0 }, (g2, s) => human(g2, s, { P, pose: 'sit', reach: 1, lean: 0.1 - 0.08 * smoothstep(seg(t, B.hook, B.hook + 0.5)) + 0.03 * Math.sin(tm * 9) * typing * 0.3 }));
    billboard(e, cam, BULB, (g2, s) => bulb(g2, s, { P, glow: 0.75 }));
    e.restore();
  });
  // the builder standing (proud, then deflated, then relaxed)
  if (bpos) push(dep({ x: bpos.x, y: 0.9, z: bpos.z }), () => {
    e.save(); e.globalAlpha = standK * fade; e.strokeStyle = P.tech; e.lineWidth = 1.2; floorCircle(e, cam, bpos.x, bpos.z, 0.38); e.stroke();
    const step = walk > 0 && walk < 1 ? tm * 2.4 : 0;
    billboard(e, cam, { x: bpos.x, y: 0, z: bpos.z }, (g2, s) => walker(g2, s, P, { step, lean: -0.07 * proud + 0.1 * slump - 0.02 * relaxed, look: 0.7 * proud - 0.4 * slump + (t > B.fix1 - 0.4 && t < B.fix2 + 0.5 ? 0.4 : 0), reach: (t > B.fix1 - 0.3 && t < B.fix2 + 0.4) ? 0.9 : (t > B.ask && t < B.ask + 1.6 ? 0.4 : 0.1) }));
    e.restore();
  });
  // the Yes Man
  push(dep({ x: ym.x, y: ym.y, z: ym.z }), () => {
    e.save(); e.globalAlpha = fade * (1 - conv);
    e.strokeStyle = P.tech; e.lineWidth = 1; e.setLineDash([2, 6]); const a = cam.project({ x: ym.x, y: 0, z: ym.z }), b = cam.project({ x: ym.x, y: ym.y + bob, z: ym.z }); if (a && b) { e.beginPath(); e.moveTo(a.x, a.y); e.lineTo(b.x, b.y); e.stroke(); } e.setLineDash([]);
    billboard(e, cam, { x: ym.x, y: ym.y + bob, z: ym.z }, (g2, s) => yesMan(g2, s, P, { screen: S.screen, prevScreen: S.prevScreen, screenK: S.screenK, arms: S.arms, armK: S.armK, hot: ymHot, nod: nodK, scanU: tm * 1.5, dir: ymDir }));
    e.restore();
  });
  // the idea: a plan that flies from his screen to the Yes Man, gets stamped, then becomes the store
  { const k = ease.inOut3(seg(t, B.idea, B.idea + 1.3)), gone = smoothstep(seg(t, B.b - 0.1, B.b + 0.5));
    if (t > B.idea && gone < 1) {
      const pos = arcFrom({ ...SCREEN, y: SCREEN.y + 0.15 }, { x: Y.desk.x + 0.05, y: Y.desk.y + 0.75, z: Y.desk.z - 0.05 }, 0.5)(k);
      const tgt = lp3(pos, { x: STORE.x, y: 0.4, z: STORE.z }, ease.in3(gone)), scl = lerp(0.6, 1, k) * (1 - 0.7 * gone);
      push(dep(tgt) - 0.2, () => { e.save(); e.globalAlpha = (1 - gone) * fade * smoothstep(seg(t, B.idea, B.idea + 0.2));
        panel(e, cam, { x: tgt.x, y: tgt.y, z: tgt.z }, 0.42 * scl, 0.55 * scl, 0, (c2, w, h, s) => { thing(c2, 'plan', w, h, s, { P, tone: 1 });
          const st2 = ease.out5(seg(t, B.a + 0.3, B.a + 0.55)); if (st2 > 0) { const px = (v) => v / s; c2.save(); c2.translate(w / 2, h * 0.55); c2.rotate(-0.25); c2.scale(lerp(1.6, 1, st2), lerp(1.6, 1, st2)); c2.globalAlpha *= st2; c2.strokeStyle = P.live; c2.lineWidth = px(2.5); c2.beginPath(); c2.roundRect(-w * 0.42, -0.05, w * 0.84, 0.1, 0.012); c2.stroke(); c2.fillStyle = P.live; c2.font = `800 ${px(13)}px "Inter Display"`; c2.textAlign = 'center'; c2.fillText('APPROVED', 0, 0.022); c2.restore(); } });
        e.restore(); });
    } }
  // the awning: the assistant builds it fast (a short beam from its hands)
  if (t > B.fair + 0.9 && t < B.fair + 2.1) { const a = cam.project({ x: ym.x + 0.25, y: ym.y + 0.3, z: ym.z }), b = cam.project({ x: STORE.x, y: STORE.h + 0.05, z: STORE.z }); push(0.2, () => { if (!a || !b) return; e.save(); e.globalAlpha = 0.6 * Math.sin(Math.PI * seg(t, B.fair + 0.9, B.fair + 2.1)); e.strokeStyle = P.ink; e.lineWidth = 1.5; e.setLineDash([3, 5]); e.beginPath(); e.moveTo(a.x, a.y); e.lineTo(b.x, b.y); e.stroke(); e.restore(); }); }
  // the passerby: walks up, looks, leaves
  { const p0 = { x: 4.4, z: 0.42 }, p1 = { x: 2.75, z: 0.42 }, k1 = ease.inOut3(seg(t, B.pass, B.passLook)), k2 = ease.inOut3(seg(t, B.passLook + 1.0, B.passLook + 2.7));
    const x = k2 > 0 ? lerp(p1.x, p0.x + 0.3, k2) : lerp(p0.x, p1.x, k1), a = smoothstep(seg(t, B.pass, B.pass + 0.4)) * (1 - smoothstep(seg(t, B.passLook + 2.2, B.passLook + 2.7)));
    if (a > 0.01) push(dep({ x, y: 0.9, z: p0.z }), () => { e.save(); e.globalAlpha = a * fade; billboard(e, cam, { x, y: 0, z: p0.z }, (g2, s) => walker(g2, s, P, { flip: k2 <= 0, step: (k1 > 0 && k1 < 1) || (k2 > 0 && k2 < 1) ? tm * 2.3 : 0, look: t > B.passLook && t < B.passLook + 1 ? 0.7 : 0, light: 0.85 })); e.restore(); }); }
  // the customer: appears with a need, waits for a door that works, comes in, pays
  { const appear = smoothstep(seg(t, B.q2 + 0.4, B.q2 + 0.9)), k = ease.inOut3(seg(t, B.walkIn, B.enter)), inside = smoothstep(seg(t, B.enter, B.enter + 0.4)) * (1 - smoothstep(seg(t, B.exit, B.exit + 0.4)));
    const q = along(STREET, k * 0.97, 0), pos = k > 0 ? q : { x: 3.35, z: 0.3 }, a = appear * (1 - inside) * fade;
    if (a > 0.01) push(dep({ x: pos.x, y: 0.9, z: pos.z }), () => { e.save(); e.globalAlpha = a; billboard(e, cam, { x: pos.x, y: 0, z: pos.z }, (g2, s) => walker(g2, s, P, { flip: true, step: k > 0 && k < 1 ? tm * 2.3 : 0, look: 0.3, reach: t > B.exit ? 0.5 : 0.15 })); e.restore(); });
    // the coin: from the customer to the counter plate
    const ck = ease.inOut3(seg(t, B.exit + 0.1, B.sold));
    if (ck > 0 && ck < 1) { const c0 = { x: DOOR.x - 0.1, y: 1.0, z: DOOR.z - 0.4 }, c1 = { x: DOOR.x, y: STORE.h - 0.25, z: DOOR.z - 0.05 }, cp = arcFrom(c0, c1, 0.35)(ck); push(dep(cp) - 0.3, () => billboard(e, cam, cp, (g2, s) => { g2.fillStyle = P.ink; g2.beginPath(); g2.arc(0, -0.06, 0.06, 0, Math.PI * 2); g2.fill(); g2.strokeStyle = P.bg; g2.lineWidth = 1.5 / s; g2.beginPath(); g2.arc(0, -0.06, 0.038, 0, Math.PI * 2); g2.stroke(); })); }
    B.custPos = pos; B.custA = a; }
  D.sort((a, b) => b.d - a.d).forEach((x) => x.fn());
  // the point the scene becomes (end)
  { const pk = smoothstep(seg(t, fin + 0.6, fin + 1.0)) * (1 - smoothstep(seg(t, fin + 1.3, fin + 1.9))); const p = cam.project(CTR); if (p && pk > 0.01) { glow(ctx, p.x, p.y, 220, 220, { alpha: 0.5 * pk }); e.save(); e.globalAlpha = pk; e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 10, 0, Math.PI * 2); e.fill(); e.restore(); } }

  halo(ctx, L);

  /* ---------- speech, tags, type (crisp, after the glow) ---------- */
  const ymTop = { x: ym.x + 0.05, y: ym.y + bob + 0.78, z: ym.z };
  bubble(ctx, cam, ymTop, 'BRILLIANT.', { a: smoothstep(seg(t, B.brilliant, B.brilliant + 0.1)) * (1 - smoothstep(seg(t, B.a + 0.2, B.a + 0.5))), pop: seg(t, B.brilliant, B.brilliant + 0.35), glowK: 1 - seg(t, B.brilliant, B.brilliant + 0.6) });
  bubble(ctx, cam, ymTop, 'ABSOLUTELY.', { a: smoothstep(seg(t, B.ask + 0.7, B.ask + 0.8)) * (1 - smoothstep(seg(t, B.q1 - 0.3, B.q1)) ), pop: seg(t, B.ask + 0.7, B.ask + 1.05), glowK: 1 - seg(t, B.ask + 0.7, B.ask + 1.3) });
  if (bpos) bubble(ctx, cam, { x: bpos.x + 0.1, y: 2.05, z: bpos.z }, 'IS THIS A GOOD IDEA?', { filled: false, a: smoothstep(seg(t, B.ask, B.ask + 0.15)) * (1 - smoothstep(seg(t, B.q1 - 0.35, B.q1 - 0.05))), pop: seg(t, B.ask, B.ask + 0.3), strike: seg(t, B.ask + 1.5, B.ask + 2.0) });
  // what the yes man stamped on it
  tag(ctx, cam, { x: Y.desk.x + 0.25, y: Y.desk.y + 1.0, z: Y.desk.z }, 'STRATEGY: APPROVED', smoothstep(seg(t, B.a + 0.5, B.a + 0.8)) * (1 - smoothstep(seg(t, B.b + 0.2, B.b + 0.5))), { dx: -150, dy: -40, align: 'right' });
  // the problems the better question finds (orange: what you just learned)
  { const ra = smoothstep(seg(t, B.q1 + 1.2, B.q1 + 1.5)), rk = (on, off) => ra * (1 - smoothstep(seg(t, on, off)));
    ring(ctx, cam, { x: DOOR.x + 0.11, y: 0.4, z: DOOR.z }, 0.14, rk(B.fix1, B.fix1 + 0.4)); tag(ctx, cam, { x: DOOR.x + 0.25, y: 0.4, z: DOOR.z }, 'NO HANDLE', rk(B.fix1, B.fix1 + 0.4), { dx: 60, dy: 60, color: P.live });
    ring(ctx, cam, { x: STORE.x - STORE.w / 2 + 0.62, y: STORE.h - 0.55, z: STORE.z }, 0.14, rk(B.fix2, B.fix2 + 0.4)); tag(ctx, cam, { x: STORE.x - STORE.w / 2 + 0.5, y: STORE.h - 0.55, z: STORE.z }, 'NO PRICE', rk(B.fix2, B.fix2 + 0.4), { dx: -60, dy: -90, color: P.live, align: 'right' }); }
  // the assumptions, named, before they come off
  { const aa = smoothstep(seg(t, B.q3 + 0.4, B.q3 + 0.7)) * (1 - smoothstep(seg(t, B.q3 + 1.6, B.q3 + 1.9)));
    tag(ctx, cam, { x: STORE.x - 0.45, y: STORE.h + 1.05, z: STORE.z }, 'ASSUMED', aa, { dx: -60, dy: -50, align: 'right' }); tag(ctx, cam, { x: STORE.x + 0.4, y: STORE.h + 0.4, z: STORE.z }, 'ASSUMED', aa, { dx: 60, dy: -40 }); }
  // the customer's need, in a thought: what they actually came for
  if (B.custA > 0.01 && t < B.enter) { const p = cam.project({ x: B.custPos.x, y: 2.15, z: B.custPos.z }); if (p) { const a = B.custA * smoothstep(seg(t, B.q2 + 0.9, B.q2 + 1.2)); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(p.x, p.y - 30, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(p.x - 22, p.y + 10, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = P.ink; ctx.beginPath(); ctx.roundRect(p.x - 15, p.y - 46, 30, 26, 4); ctx.fill(); ctx.fillStyle = P.bg; ctx.fillRect(p.x - 15, p.y - 40, 30, 3); ctx.fillRect(p.x - 7, p.y - 33, 14, 9); ctx.restore(); } }
  // titles
  { const k = smoothstep(seg(t, 0.25, 0.6)) * (1 - smoothstep(seg(t, B.idea - 0.4, B.idea + 0.1))); if (k > 0.01) { mono(ctx, 'FILM 002', 80, 140, { size: 18, color: P.ink2, track: 5, alpha: k }); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = P.tech; ctx.fillRect(228, 133, 40, 1.5); ctx.restore(); mono(ctx, 'THE AI YES MAN', 284, 140, { size: 18, color: P.ink, track: 5, alpha: k }); } }
  { const r = seg(t, B.agree, B.agree + 0.7), a = 1 - smoothstep(seg(t, B.ask - 0.4, B.ask)); if (r > 0) { kicker(ctx, P, 'THE DIFFERENCE', 250, a * smoothstep(r), mono); headline(ctx, P, W, [[['AGREEMENT ', P.ink], ['≠', P.live]], [['VALIDATION.', P.ink]]], 400, a, r); } }
  { const Q = [[B.q1, B.q2, '01', ['WHY WOULD', 'THIS FAIL?']], [B.q2, B.q3, '02', ['WHO ACTUALLY', 'PAYS FOR THIS?']], [B.q3, B.fav, '03', ['WHAT HAVEN’T', 'I PROVEN?']], [B.q4, B.l12 - 0.2, '04', ['ARGUE AGAINST', 'MY PLAN.']]];
    for (const [a, b, n, lines] of Q) { const r = seg(t, a - 0.05, a + 0.6), v = 1 - smoothstep(seg(t, b - 0.35, b - 0.05)); if (r <= 0 || v <= 0.01) continue; kicker(ctx, P, `QUESTION ${n}`, 210, v * smoothstep(r), mono); headline(ctx, P, W, lines.map((x) => [x]), 340, v, r, { size: 86 }); }
    const fk = smoothstep(seg(t, B.fav, B.fav + 0.3)) * (1 - smoothstep(seg(t, B.q4 - 0.2, B.q4 + 0.1))); if (fk > 0.01) kicker(ctx, P, 'QUESTION 04 — THE FAVORITE', 210, fk, mono); }
  { const r1 = seg(t, B.l12 + 0.3, B.l12 + 1.0), r2 = seg(t, B.sold, B.sold + 0.7), a = 1 - smoothstep(seg(t, fin - 0.2, fin + 0.4));
    if (r1 > 0) { kicker(ctx, P, 'BETTER THINKING', 250, a * smoothstep(r1), mono); headline(ctx, P, W, [['BETTER QUESTIONS.']], 400, a, r1, { size: 96 }); }
    if (r2 > 0) headline(ctx, P, W, [['BETTER DECISIONS.', P.live]], 498, a, r2, { size: 96 }); }
  endCard(ctx, P, W, MARK, WORD, smoothstep(seg(t, fin + 1.0, fin + 1.6)), smoothstep(seg(t, fin + 1.4, fin + 2.0)), seg(t, B.build - 0.1, B.build + 0.5));
  vignette(ctx, W, H, { amount: 0.66 });
  grain(ctx, L, Math.round(t * FPS));
}

async function load() {
  TL = await (await fetch('/tools/motion/films/002-ai-yes-man/timeline.json')).json();
  const l = (n) => TL.lines[n - 1], b = (n, f) => brk(TL, n, f)[1];
  B = {};
  B.hook = b(1, 3 / 7);                 // "...thinking you're cooking"
  B.idea = l(2).at + 0.15; B.brilliant = b(2, 5 / 10) + 0.15;
  B.a = l(3).at; B.b = b(3, 4 / 14); B.c = b(3, 8 / 14); B.stand = B.b - 0.05;
  B.meanwhile = l(4).at; B.punch = b(4, 1 / 7); B.fair = l(5).at;
  B.agree = l(6).at; B.pass = B.agree - 0.3; B.passLook = B.agree + 1.4;
  B.ask = b(7, 4 / 9);
  B.q1 = l(8).at; B.q2 = l(9).at; B.q3 = l(10).at; B.fav = l(11).at; B.q4 = b(11, 2 / 10);
  B.fix1 = B.q4 + 1.9; B.fix2 = B.q4 + 2.6;
  B.l12 = l(12).at; B.walkIn = l(12).at + 0.2; B.enter = l(12).at + 2.4; B.exit = l(13).at - 0.1; B.sold = l(13).at + 0.75;
  B.fin = l(14).at - 0.55; B.build = b(14, 2 / 5); B.end = TL.total;
  const desk = { x: -1.25, y: 1.2, z: -3.75 };
  camAt = cameraKeys([
    [0, desk, -0.02, 1650],
    [B.a, { x: -1.1, y: 1.24, z: -3.5 }, -0.02, 1650],                              // close: the builder and his yes man
    [B.b + 0.6, { x: 0.25, y: 1.45, z: -5.6 }, 0.03, 1850],                           // the store rises
    [B.meanwhile, { x: 0.55, y: 1.5, z: -6.2 }, 0.04, 1850],
    [B.fair, { x: 0.58, y: 1.5, z: -6.3 }, 0.04, 1850],                              // ...frozen
    [B.agree - 0.6, { x: 1.15, y: 1.5, z: -5.9 }, 0.04, 1850],                        // the street comes into frame
    [B.ask - 0.6, { x: 1.18, y: 1.5, z: -6.0 }, 0.04, 1850],
    [B.ask + 0.3, { x: 0.6, y: 1.4, z: -4.3 }, 0.02, 1750],                           // in on the habit
    [B.q1 - 0.1, { x: 0.62, y: 1.4, z: -4.4 }, 0.02, 1750],
    [B.q1 + 0.8, { x: 1.62, y: 1.45, z: -5.3 }, 0.04, 1850],                           // the questions work on the store
    [B.q2 + 0.7, { x: 1.98, y: 1.45, z: -5.5 }, 0.04, 1850],
    [B.fav, { x: 2.0, y: 1.45, z: -5.55 }, 0.04, 1850],
    [B.q4 + 0.8, { x: 1.9, y: 1.45, z: -5.5 }, 0.04, 1850],
    [B.l12, { x: 1.9, y: 1.45, z: -5.6 }, 0.04, 1850],
    [B.l12 + 1.2, { x: 1.7, y: 1.45, z: -6.0 }, 0.04, 1850],                          // the customer comes in
    [B.fin, { x: 1.75, y: 1.45, z: -6.15 }, 0.04, 1850],
    [B.fin + 1.4, { x: CTR.x, y: 3.6, z: -2.2 }, 0.62, 1550],                         // the scene draws into a point
    [99, { x: CTR.x, y: 3.6, z: -2.2 }, 0.62, 1550],
  ], W, H);
  MARK = await brandPath('/assets/brand/mark.svg'); WORD = await brandPath('/assets/brand/wordmark.svg');
  comp.duration = TL.total;
}

const comp = { width: W, height: H, fps: FPS, duration: 61, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load, draw };
export default comp;
