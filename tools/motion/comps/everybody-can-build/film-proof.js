// PHASE 5: five-second animation test connecting the approved keyframes A -> B -> C in one camera move.
// Same world, same artwork as film-keys.js; this file only adds time. Beats (s):
//   0.00-1.30  A  push in; the idea lights; the builder reaches and types; statement rises in
//   1.15-2.70  B  the website leaves the screen on its dotted path; the camera pulls back as more follow (1 -> 45)
//   2.70-4.05     travel up and over the field toward one group; the rest sink away or fall to grey;
//                 customer, process and outcome arrive around the business
//   3.70-5.00  C  pathways draw, work moves, the business -> process handoff fails (orange): work piles up,
//                 the gauge drops, the booking stays unconfirmed
import { clamp, hash, smoothstep, lerp, seg, ease } from '../../engine/math.js';
import { cam3, billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, halo, cone, glow, vignette, grain } from '../../engine/light.js';
import { human } from '../../engine/humans.js';
import { place, machine } from '../../engine/environments.js';
import { box3 } from '../../engine/illustrations.js';
import { mix } from '../../engine/color.js';
import { P, INK, LIVE, FIRST_RING, FIELD, SYS, SCREEN, BULB, spine, tone, floorDots, groundLine, dust, mono, creatorAtDesk, bulbWithTether } from './film-keys.js';

const W = 1080, H = 1920;
let L;

/* ---------------- camera ---------------- */
const CA = { pos: { x: 0.36, y: 1.02, z: -3.85 }, pitch: 0.02, f: 1650 };
const CB = { pos: { x: 1.15, y: 1.75, z: -9.0 }, pitch: 0.075, f: 1700 };
const CC = { pos: { x: 2.45, y: 4.4, z: 5.6 }, pitch: 0.34, f: 1550 };
const lp = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
function camAt(t) {
  let pos, pitch, f;
  if (t < 1.3) { const k = ease.inOut3(seg(t, 0, 1.3)); pos = { ...CA.pos, z: lerp(-4.2, CA.pos.z, k) }; pitch = CA.pitch; f = CA.f; }
  else if (t < 2.75) { const k = ease.inOut5(seg(t, 1.3, 2.55)); pos = lp(CA.pos, CB.pos, k); pos.z -= 0.12 * seg(t, 2.55, 2.75); pitch = lerp(CA.pitch, CB.pitch, k); f = lerp(CA.f, CB.f, k); }
  else if (t < 4.05) { // rise up and over the field (quadratic arc), easing into C's high, pitched-down view
    const k = ease.inOut3(seg(t, 2.75, 4.05)), a = { ...CB.pos, z: CB.pos.z - 0.12 }, c = { x: 2.7, y: 5.4, z: -2.2 }, u = 1 - k;
    pos = { x: u * u * a.x + 2 * u * k * c.x + k * k * CC.pos.x, y: u * u * a.y + 2 * u * k * c.y + k * k * CC.pos.y, z: u * u * a.z + 2 * u * k * c.z + k * k * CC.pos.z };
    pitch = lerp(CB.pitch, CC.pitch, ease.inOut3(seg(t, 2.85, 4.05))); f = lerp(CB.f, CC.f, k);
  } else { const k = ease.out3(seg(t, 4.05, 5)); pos = { ...CC.pos, z: CC.pos.z + 0.22 * k }; pitch = CC.pitch; f = CC.f; }
  return cam3({ W, H, pos, pitch, f });
}

/* ---------------- what is born when ---------------- */
const qcurve = (a, b, lift) => { const c = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + lift, z: (a.z + b.z) / 2 }; return (u) => { const v = 1 - u; return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y, z: v * v * a.z + 2 * u * v * c.z + u * u * b.z }; }; };
const BUSINESS = { ...SYS.business };
const near14 = new Set([...FIELD].sort((a, b) => a.z - b.z).slice(0, 14).map((c) => c.i));
const ITEMS = [
  ...FIRST_RING.map((c, k) => ({ c, born: k === 0 ? 1.56 : 1.78 + k * 0.09, travel: k === 0 ? 0.55 : 0.46, lift: 1.1, path: 0.95, hero: k === 0 })),
  ...[...FIELD].sort((a, b) => Math.hypot(a.x - 0.66, a.z) - Math.hypot(b.x - 0.66, b.z)).map((c, r) => ({ c, born: 2.0 + 0.65 * (r / FIELD.length) ** 0.75, travel: 0.42, lift: 1.6 + c.z * 0.08, path: near14.has(c.i) ? 0.45 : 0 })),
  { c: BUSINESS, born: 2.28, travel: 0.45, lift: 2.4, path: 0.45, business: true },
];
for (const it of ITEMS) it.curve = qcurve(SCREEN, { x: it.c.x, y: it.c.y + it.c.h * 0.5, z: it.c.z }, it.lift);
// footprint of the system: unchosen creations inside it sink through the floor when the group forms
const inFootprint = (c) => c.z < 23; // everything between the camera's final position and the far field steps aside

/* ---------------- C pathways (same geometry as the keyframe) ---------------- */
const S = SYS;
const curve = (a, b, bend) => Array.from({ length: 61 }, (_, k) => { const u = k / 60, mx = (a.x + b.x) / 2 + (b.z - a.z) * bend, mz = (a.z + b.z) / 2 - (b.x - a.x) * bend; return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y: 0, z: (1 - u) ** 2 * a.z + 2 * u * (1 - u) * mz + u * u * b.z }; });
const P1 = curve({ x: S.customer.x + 0.35, z: S.customer.z }, { x: S.business.x - 0.75, z: S.business.z }, -0.15);
const P2 = curve({ x: S.business.x - 0.35, z: S.business.z + 0.55 }, { x: S.process.x + 0.4, z: S.process.z - 0.5 }, 0.1);
const P3 = curve({ x: S.process.x + 0.5, z: S.process.z + 0.1 }, { x: S.outcome.x - 0.55, z: S.outcome.z }, -0.12);
const GAP = P2[30], T_BREAK = 4.2;

/* ---------------- typography (drawn after the halo) ---------------- */
function statement(ctx, kick, lines, y0, k, out, { size = 104, lead = 1.02 } = {}) {
  if (k <= 0 || out >= 1) return;
  const a = 1 - out;
  mono(ctx, kick, 80, y0 - size * 0.95, { size: 20, color: P.ink2, track: 5, alpha: a * smoothstep(seg(k, 0, 0.4)) });
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.tech; ctx.fillRect(80, y0 - size * 0.95 + 18, 44 * ease.out3(k), 1.5); ctx.restore();
  ctx.save(); ctx.font = `800 ${size}px "Inter Display"`; ctx.letterSpacing = '0.5px'; ctx.fillStyle = P.ink; ctx.globalAlpha = a;
  lines.forEach((l, i) => {
    const r = ease.out5(clamp(k * 1.6 - i * 0.35)), y = y0 + 26 + i * size * lead;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size, W, size * 1.22); ctx.clip();
    ctx.fillText(l, 74, y + (1 - r) * size * 1.1 - out * 24); ctx.restore();
  });
  ctx.restore();
}
function marks(ctx, t) {
  mono(ctx, 'QUIET BANDS', 80, 110, { size: 16, color: P.tech, track: 5 });
  const n = t < 1.4 ? 'A' : t < 3.2 ? 'B' : 'C';
  mono(ctx, `EVERYBODY CAN BUILD · ${n}`, W - 80, 110, { size: 16, color: P.tech, track: 4, align: 'right' });
}

/* ---------------- the frame ---------------- */
function draw(ctx, t) {
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  const cam = camAt(t);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#06070A'); g.addColorStop(0.5, '#0C0D10'); g.addColorStop(1, '#060709');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const tf = Math.round(t * 30) / 30;                       // whole-frame time for anything that changes discretely
  const wA = 1 - smoothstep(seg(t, 1.6, 2.8)), wB = smoothstep(seg(t, 1.2, 1.8)) * (1 - smoothstep(seg(t, 3.0, 3.7))), wC = smoothstep(seg(t, 3.2, 3.9));
  const lit = ease.inOut3(seg(t, 0.1, 0.55));               // the idea comes on
  const brk = seg(t, T_BREAK, T_BREAK + 0.08);

  /* atmosphere */
  const b = cam.project({ x: BULB.x, y: BULB.y + 0.2, z: 0 }), pool = cam.project({ x: 0.1, y: 0, z: 0 }), poolR = cam.project({ x: 1.9, y: 0, z: 0 }), poolF = cam.project({ x: 0.1, y: 0, z: -0.9 });
  const scr = cam.project(SCREEN);
  if (b && pool && poolR && poolF) {
    const k = lit * lerp(0.75, 1, wA);
    glow(ctx, b.x, b.y + 180, 900, 1000, { alpha: 0.06 * k * wA });
    glow(ctx, b.x, b.y, 230 * lerp(0.55, 1, wA), 230 * lerp(0.55, 1, wA), { alpha: 0.24 * k });
    cone(ctx, { x: b.x, y: b.y }, 40, pool, (poolR.x - pool.x) * 1.9, { alpha: 0.075 * k * wA, L, blur: 40 });
    glow(ctx, pool.x, pool.y, poolR.x - pool.x, Math.max(8, poolF.y - pool.y), { alpha: 0.16 * (0.3 + 0.7 * lit) * wA + 0.1 * wB });
  }
  if (scr) glow(ctx, scr.x - 40, scr.y, 260, 200, { alpha: 0.1 * wA * smoothstep(seg(t, 0.2, 0.5)) });
  const f0 = FIRST_RING[0], fc = cam.project({ x: f0.x, y: f0.y + f0.h / 2, z: f0.z }), fb = cam.project({ x: f0.x, y: 0, z: f0.z }), far = cam.project({ x: spine(20), y: 0, z: 20 });
  const heroIn = ease.out3(seg(t, 1.56, 2.05));
  if (fc && fb && wB > 0) { glow(ctx, fc.x, fc.y, 560, 560, { alpha: 0.11 * wB * heroIn }); cone(ctx, { x: fc.x, y: -40 }, 160, fb, 480, { alpha: 0.08 * wB * heroIn, L, blur: 40 }); }
  if (far) glow(ctx, far.x, far.y - 80, 900, 300, { alpha: 0.06 * smoothstep(seg(t, 1.9, 2.6)) * (1 - wC) });
  const ctr = cam.project({ x: 2.4, y: 0, z: 15.5 }), gp = cam.project(GAP);
  if (ctr && wC > 0) { glow(ctx, ctr.x, ctr.y - 260, 900, 760, { alpha: 0.055 * wC }); glow(ctx, ctr.x, ctr.y, 620, 260, { alpha: 0.1 * wC }); cone(ctx, { x: ctr.x, y: -60 }, 220, ctr, 860, { alpha: 0.06 * wC, L, blur: 40 }); }
  if (gp && brk > 0) { const flare = 1 + 0.5 * (1 - seg(t, T_BREAK + 0.08, T_BREAK + 0.5)); glow(ctx, gp.x, gp.y, 200 * flare, 70 * flare, { alpha: 0.32 * brk * flare, color: LIVE }); }

  /* floor: one grid, brightest under whatever the shot is about */
  e.fillStyle = P.tech;
  for (let z = -3; z <= 44; z += 0.36) for (let x = -7; x <= 11; x += 0.36) {
    const p = cam.project({ x, y: 0, z }); if (!p || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
    const fog = 1 - smoothstep(clamp((p.z - 3) / 30));
    const pa = 1 - smoothstep(clamp(Math.hypot(x - 0.1, z - 0.2) / 2.4)), pb = 1 - smoothstep(clamp(Math.hypot(x - 1.5, z - 6) / 11)), pc = 1 - smoothstep(clamp(Math.hypot(x - 2.4, z - 15) / 6.5));
    const a = fog * (0.08 + 0.6 * pa * wA * (0.4 + 0.6 * lit) + 0.32 * pb * wB + 0.4 * pc * wC);
    if (a < 0.015) continue;
    e.globalAlpha = Math.min(1, a); e.beginPath(); e.arc(p.x, p.y, Math.max(0.9, 0.011 * p.s), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
  groundLine(e, cam, 0.34, lerp(0.7, 0.9, wA) * (1 - 0.7 * wC));
  // A's floor ruler measures the one workstation; it leaves as the world grows
  const rk = 1 - smoothstep(seg(t, 1.35, 1.8));
  if (rk > 0.01) {
    const rz = -0.62; e.save(); e.globalAlpha = rk; e.strokeStyle = P.tech; e.lineWidth = 1.2; path3(e, cam, [{ x: -0.9, y: 0, z: rz }, { x: 1.3, y: 0, z: rz }]); e.stroke();
    for (let i = 0; i <= 22; i++) { const x = -0.9 + i * 0.1, long = i % 5 === 0; path3(e, cam, [{ x, y: 0, z: rz }, { x, y: 0, z: rz - (long ? 0.08 : 0.035) }]); e.stroke(); if (long) { const p = cam.project({ x, y: 0, z: rz - 0.17 }); if (p) mono(e, (i / 10).toFixed(1), p.x, p.y + 10, { size: 15, align: 'center', track: 1, alpha: rk }); } }
    e.restore();
  }

  /* C pathways (under everything that stands) */
  const pathLine = (pts, { color = P.ink, width = 2.6, alpha = 1, dash = null } = {}) => { if (pts.length < 2 || alpha <= 0.01) return; e.save(); e.globalAlpha = alpha; e.strokeStyle = color; e.lineWidth = width; e.lineCap = 'round'; if (dash) e.setLineDash(dash); path3(e, cam, pts); e.stroke(); e.restore(); };
  const shoulder = (pts, a = 1) => pathLine(pts.map((q) => ({ ...q, x: q.x + 0.14 })), { color: P.tech, width: 1, dash: [2, 7], alpha: a });
  const d1 = ease.inOut3(seg(t, 3.7, 3.98)), d2 = ease.inOut3(seg(t, 3.86, 4.12)), d3 = ease.inOut3(seg(t, 4.0, 4.25));
  const upto = (pts, k) => pts.slice(0, Math.max(0, Math.round(k * 60)) + 1);
  pathLine(upto(P1, d1)); shoulder(upto(P1, d1));
  const open = ease.out3(seg(t, T_BREAK, T_BREAK + 0.25)), g0 = Math.round(30 - 8 * open), g1 = Math.round(30 + 8 * open);
  if (t < T_BREAK) { pathLine(upto(P2, d2)); shoulder(upto(P2, d2)); }
  else { pathLine(P2.slice(0, g0 + 1)); pathLine(P2.slice(g1)); shoulder(P2); }
  pathLine(upto(P3, d3), { color: P.ink2, width: 1.6, alpha: 0.55, dash: [8, 8] });
  // work in transit: along P1 continuously; along P2 until the break, then it stacks at the loose end
  if (d1 >= 1) for (let j = 0; j < 3; j++) { const u = ((t - 3.98) * 0.8 + j / 3) % 1, p = cam.project(P1[Math.round(u * 60)]); if (p) { e.globalAlpha = Math.min(1, (t - 3.98) * 6); e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 6, 0, Math.PI * 2); e.fill(); e.globalAlpha = 1; } }
  if (d2 >= 1 && t < T_BREAK) for (let j = 0; j < 2; j++) { const u = ((t - 4.12) * 1.4 + j / 2) % 1, p = cam.project(P2[Math.round(u * 60)]); if (p) { e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 6, 0, Math.PI * 2); e.fill(); } }
  if (t >= T_BREAK) {
    const piled = Math.min(3, 1 + Math.floor((tf - T_BREAK) / 0.22));
    for (let i = 0; i < piled; i++) { const p = cam.project(P2[Math.max(0, g0 - i * 3)]); e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 6, 0, Math.PI * 2); e.fill(); }
    for (const q of [P2[g0], P2[g1]]) { const p = cam.project(q); e.fillStyle = P.live; e.beginPath(); e.arc(p.x, p.y, 7, 0, Math.PI * 2); e.fill(); }
    const rr = ease.out5(seg(t, T_BREAK, T_BREAK + 0.3));
    e.save(); e.strokeStyle = P.live; e.lineWidth = 2.2; floorCircle(e, cam, GAP.x, GAP.z, 0.4 * rr); e.stroke(); e.globalAlpha = 0.5 * seg(t, T_BREAK + 0.1, T_BREAK + 0.4); e.setLineDash([3, 6]); floorCircle(e, cam, GAP.x, GAP.z, 0.7 * ease.out3(seg(t, T_BREAK + 0.1, T_BREAK + 0.45))); e.stroke(); e.restore();
    if (gp) {
      const lk = ease.out3(seg(t, T_BREAK + 0.15, T_BREAK + 0.4)), tx = gp.x + 190, ty = gp.y - 150;
      e.save(); e.strokeStyle = P.live; e.globalAlpha = 0.85; e.lineWidth = 1.3; e.beginPath(); e.moveTo(gp.x + 26, gp.y - 14);
      e.lineTo(lerp(gp.x + 26, tx - 20, lk), lerp(gp.y - 14, ty + 10, lk)); if (lk >= 1) e.lineTo(tx - 20 + 260 * ease.out3(seg(t, T_BREAK + 0.4, T_BREAK + 0.55)), ty + 10); e.stroke(); e.restore();
      const n = Math.round(seg(tf, T_BREAK + 0.4, T_BREAK + 0.7) * 15);
      mono(e, 'HANDOFF 02 → 03'.slice(0, n), tx, ty - 4, { size: 17, color: P.live, track: 3 });
      mono(e, 'NO RESPONSE'.slice(0, Math.max(0, n - 4)), tx, ty + 36, { size: 17, color: P.live, track: 3, alpha: 0.7 });
    }
  }

  /* creations, the system's parts and the workstation, painter-sorted by depth */
  const draws = [];
  const grey = smoothstep(seg(t, 3.15, 3.8));
  for (const it of ITEMS) {
    if (tf < it.born) continue;
    const k = ease.out5(seg(t, it.born, it.born + it.travel)), c = it.c;
    // the dotted path it came along (drawn on as it travels); faint ones only for the near field
    if (it.path > 0) {
      const pk = Math.max(0.02, k), a = it.path * (it.hero || it.c === FIRST_RING[0] ? 1 : tone(cam, c)) * (1 - smoothstep(seg(t, 2.9, 3.4)));
      if (a > 0.01) draws.push({ d: cam.view({ x: c.x, y: 0, z: c.z }).z + 50, fn: () => { const pts = Array.from({ length: 41 }, (_, j) => it.curve((j / 40) * pk)); e.save(); e.globalAlpha = a; e.strokeStyle = P.ink2; e.lineWidth = 1.3; e.lineCap = 'round'; e.setLineDash([0.1, 6]); path3(e, cam, pts); e.stroke(); e.restore(); } });
    }
    const ctr3 = it.curve(k), sc = lerp(0.15, 1, k);
    const pos = { ...c, x: ctr3.x, z: ctr3.z, y: ctr3.y - c.h * 0.5 * sc, w: c.w * sc, h: c.h * sc };
    let tn = tone(cam, c), alpha = Math.min(1, seg(t, it.born, it.born + 0.12) * 2);
    if (!it.business) {
      if (inFootprint(c)) { const s = ease.in3(seg(t, 3.0 + hash(c.i, 8) * 0.35, 3.55 + hash(c.i, 8) * 0.35)); pos.y -= s * (c.y + c.h + 0.3); alpha *= 1 - s; }
      else {
        tn = lerp(tn, tone(cam, c, 0.32), grey);
        // in C's high view, keep the far field from crowding the statement
        const top = cam.project({ x: c.x, y: c.y + c.h, z: c.z }); if (top) alpha *= lerp(1, smoothstep(clamp((top.y - 480) / 120)), wC);
      }
    }
    if (alpha <= 0.01) continue;
    const dd = cam.view({ x: pos.x, y: pos.y + pos.h / 2, z: pos.z }).z; if (dd < 0.6) continue;
    alpha *= smoothstep(clamp((dd - 1.2) / 2.6)); if (alpha <= 0.01) continue; // nothing slabs past the lens
    draws.push({ d: dd, fn: () => { e.save(); e.globalAlpha = alpha; place(e, cam, pos, { P, tone: tn, mark: k > 0.85, tether: k > 0.85 }); e.restore(); } });
  }
  // system parts arrive around the business
  const ka = ease.out3(seg(t, 3.42, 3.82)), kp = ease.out3(seg(t, 3.3, 3.75)), ko = ease.out3(seg(t, 3.5, 3.9)), kt = smoothstep(seg(t, 3.9, 4.2));
  const tag = (x, z, n, name, a) => { const p0 = cam.project({ x, y: 0, z: z - 0.6 }); if (!p0) return; mono(e, n, p0.x, p0.y + 34, { size: 15, align: 'center', color: P.tech, track: 2, alpha: a }); mono(e, name, p0.x, p0.y + 56, { size: 15, align: 'center', color: P.ink2, track: 4, alpha: a }); };
  if (ko > 0) draws.push({ d: cam.view({ x: S.outcome.x, y: 0.5, z: S.outcome.z }).z, fn: () => { e.save(); e.globalAlpha = ko; place(e, cam, { ...S.outcome, y: S.outcome.y - 0.3 * (1 - ko) }, { P, tone: 0.62, done: 0 }); box3(e, cam, [S.outcome.x - 0.5, S.outcome.x + 0.5], [0, 0.14], [S.outcome.z - 0.2, S.outcome.z + 0.2], { top: mix(P.bg, P.ink2, 0.4), front: mix(P.bg, P.ink2, 0.22), side: mix(P.bg, P.ink2, 0.15), edge: P.ink2, line: 1 }); e.restore(); tag(S.outcome.x, S.outcome.z, '04', 'OUTCOME', kt); } });
  if (kp > 0) draws.push({ d: cam.view({ x: S.process.x, y: 0.5, z: S.process.z }).z, fn: () => { e.save(); e.globalAlpha = kp; machine(e, cam, { P, x: S.process.x, z: S.process.z, items: t < T_BREAK && d2 >= 1 ? (t - 4.1) * 1.2 : null, tone: 0.82 }); e.restore(); tag(S.process.x - 0.4, S.process.z, '03', 'PROCESS', kt); } });
  if (ka > 0) draws.push({ d: cam.view({ x: S.customer.x, y: 0.9, z: S.customer.z }).z, fn: () => {
    e.save(); e.globalAlpha = ka; e.strokeStyle = P.tech; e.lineWidth = 1.2; floorCircle(e, cam, S.customer.x, S.customer.z, 0.42 * ka); e.stroke(); e.restore();
    e.save(); e.globalAlpha = ka; billboard(e, cam, { x: S.customer.x - 0.35 * (1 - ka), y: 0, z: S.customer.z }, (g2, s) => human(g2, s, { P, pose: 'stand', reach: 0.35, lean: 0.03 })); e.restore();
    tag(S.customer.x, S.customer.z, '01', 'CUSTOMER', kt); } });
  draws.push({ d: cam.view({ x: S.business.x, y: 0.6, z: S.business.z }).z - 0.01, fn: () => tag(S.business.x, S.business.z, '02', 'BUSINESS', kt) });
  // the workstation (keyframe A's), while it is in front of the camera
  const deskD = cam.view({ x: 0.4, y: 0.8, z: 0 }).z;
  if (deskD > 0.5) draws.push({ d: deskD, fn: () => {
    const prompt = 'build a booking site', typed = prompt.slice(0, Math.round(seg(tf, 0.38, 0.95) * prompt.length));
    creatorAtDesk(e, cam, { reach: ease.inOut3(seg(t, 0.12, 0.5)), prompt: typed });
    bulbWithTether(e, cam, lerp(0.15, 1, lit) * lerp(0.8, 1, wA), { labelAlpha: smoothstep(seg(t, 0.5, 0.8)) * (1 - smoothstep(seg(t, 1.25, 1.5))), tetherAlpha: lit });
  } });
  draws.sort((a, b2) => b2.d - a.d).forEach((x) => x.fn());

  /* atmosphere in the lit volumes */
  dust(e, cam, 110, 3, { x0: -1.4, x1: 1.4, y0: 0.4 + 0.05 * t, y1: 2.6 + 0.05 * t, z0: -0.5, z1: 0.6 }, { size: 1.9, alpha: 0.5 * wA * lit });
  dust(e, cam, 160, 13, { x0: -3, x1: 5, y0: 0.3, y1: 4.5, z0: -1, z1: 7 }, { size: 1.7, alpha: 0.32 * wB });
  dust(e, cam, 150, 23, { x0: -0.5, x1: 5.5, y0: 0.3, y1: 3.5, z0: 10.5, z1: 20 }, { size: 1.9, alpha: 0.35 * wC });

  /* DataCounter on B's ground line (counts births on whole frames) */
  const ck = smoothstep(seg(t, 1.55, 1.8)) * (1 - smoothstep(seg(t, 2.85, 3.15)));
  const q = cam.project({ x: -1.75, y: 0, z: 0.34 });
  const born = 1 + ITEMS.filter((it) => !it.business && tf >= it.born + 0.1).length - 1;

  halo(ctx, L);
  /* type, crisp, after the glow */
  if (ck > 0.01 && q) {
    mono(ctx, 'CREATIONS', q.x, q.y + 46, { size: 15, color: P.tech, alpha: ck });
    ctx.save(); ctx.globalAlpha = ck; ctx.font = '800 46px "Inter Display"'; ctx.fontVariantNumeric = 'tabular-nums'; ctx.fillStyle = P.ink2; ctx.fillText(`1 → ${Math.max(1, born)}`, q.x, q.y + 100); ctx.restore();
  }
  statement(ctx, '01 — ACCESS', ['EVERYBODY', 'CAN BUILD.'], 330, seg(t, 0.2, 0.85), smoothstep(seg(t, 1.25, 1.55)));
  const bk = smoothstep(seg(t, 1.5, 1.8)) * (1 - smoothstep(seg(t, 2.9, 3.2)));
  if (bk > 0.01) mono(ctx, '02 — MULTIPLICATION', 80, 236, { size: 20, color: P.ink2, track: 5, alpha: bk });
  statement(ctx, '05 — THE SYSTEM', ['SOLVING THE', 'PROBLEM IS.'], 330, seg(t, 4.35, 4.95), 0, { size: 96 });
  marks(ctx, t);
  // lens motes, parallaxing gently with the camera
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) { const x = ((hash(i, 41) * W - cam.pos.x * 160 * (0.5 + hash(i, 42))) % W + W) % W, y = ((hash(i, 43) * H + cam.pos.z * 40 + cam.pos.y * 120) % H + H) % H, r = 45 + hash(i, 45) * 70; ctx.filter = `blur(${r * 0.2}px)`; ctx.fillStyle = `rgba(${INK},${0.035 + 0.025 * hash(i, 46)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  vignette(ctx, W, H, { amount: 0.7 });
  grain(ctx, L, Math.round(t * 30));
}

export default { width: W, height: H, fps: 30, duration: 5, palette: P, motionBlur: { samples: 4, shutter: 0.5 }, draw };
