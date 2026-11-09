// EVERYBODY CAN BUILD: Motion Lab spec v2, three art-direction keyframes (stills; approval gate before animation).
//   A  THE CREATOR       one seated figure at a workstation; an idea lights above them
//   B  MULTIPLICATION    the work leaves the screen and becomes many recognisable creations, arranged in depth
//   C  THE SYSTEM        customer -> business -> process -> outcome; the business->process handoff has failed (orange)
// Render: node tools/motion/render.mjs everybody-can-build/film-keys --frames=0,1,2 --blur=1
import { clamp, hash, smoothstep, lerp } from '../../engine/math.js';
import { cam3, panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { LIGHT, makeLayers, halo, cone, glow, vignette, grain } from '../../engine/light.js';
import { human, chair, deskSeated, bulb } from '../../engine/humans.js';
import { SIZE, place, machine } from '../../engine/environments.js';
import { box3 } from '../../engine/illustrations.js';
import { mix, PALETTES } from '../../engine/color.js';

const W = 1080, H = 1920, P = PALETTES.film;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const INK = rgb(P.ink), LIVE = rgb(P.live);
LIGHT.ink = INK;
let L;

/* ---------------- the world ---------------- */
const HIP = { x: -0.38, z: 0 }, DESK_X = -0.05, BULB = { x: -0.31, y: 1.64, z: 0 }, SCREEN = { x: 0.66, y: 1.06, z: 0.07 };
const DIGITAL = ['site', 'app', 'course'], GROUND = ['store', 'building'];
const FIRST_RING = [
  { type: 'site', x: 1.2, y: 2.2, z: 0.9, w: 1.45, h: 1.0, yaw: -0.08 },
  { type: 'app', x: 2.95, y: 2.5, z: 2.4, w: 0.5, h: 0.95, yaw: -0.16 },
  { type: 'course', x: -0.95, y: 2.75, z: 2.3, w: 0.95, h: 0.68, yaw: 0.18 },
  { type: 'store', x: 3.8, y: 0, z: 3.7, w: 1.2, h: 1.17, yaw: -0.18 },
  { type: 'building', x: -2.35, y: 0, z: 4.9, w: 0.9, h: 1.3, yaw: 0.16 },
];
const spine = (z) => 2.2 + Math.sin(z * 0.12) * 3.0 + z * 0.1;
const FIELD = [];
for (let i = 0; FIELD.length < 40 && i < 600; i++) {
  const u = (i + 0.5) / 150, z = 8.5 + 38 * u ** 1.15, ground = hash(i, 2) < 0.42;
  const type = ground ? GROUND[Math.floor(hash(i, 6) * 2)] : DIGITAL[Math.floor(hash(i, 6) * 3)];
  const [w, h] = SIZE[type], sc = 0.85 + hash(i, 4) * 0.45;
  const c = { i, type, x: spine(z) + (hash(i, 1) - 0.5) * (4 + z * 0.45), z, y: ground ? 0 : 0.7 + hash(i, 3) * 1.8 + (z - 8) * 0.11, w: w * sc, h: h * sc, yaw: (hash(i, 5) - 0.5) * 0.6 };
  if ([...FIELD, ...FIRST_RING].some((o) => Math.hypot(o.x - c.x, (o.z - c.z) * 0.55) < 1.7)) continue;
  FIELD.push(c);
}

/* ---------------- shared drawing ---------------- */
function floorDots(e, cam, { cx, cz, r, base = 0.1, pool = 0.5, z0 = -3, z1 = 44, x0 = -7, x1 = 11, step = 0.32 }) {
  e.fillStyle = P.tech;
  for (let z = z0; z <= z1; z += step) for (let x = x0; x <= x1; x += step) {
    const p = cam.project({ x, y: 0, z }); if (!p || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
    const fog = 1 - smoothstep(clamp((p.z - 3) / 30)), d = Math.hypot(x - cx, z - cz);
    const a = fog * (base + pool * (1 - smoothstep(clamp(d / r))));
    if (a < 0.015) continue;
    e.globalAlpha = Math.min(1, a); e.beginPath(); e.arc(p.x, p.y, Math.max(0.9, 0.011 * p.s), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
}
/** the ground line: one dotted horizon of the world, running across the frame */
function groundLine(e, cam, z, alpha = 0.9) {
  e.save(); e.globalAlpha = alpha; e.strokeStyle = P.ink2; e.lineWidth = 2.2; e.lineCap = 'round'; e.setLineDash([0.1, 9]);
  path3(e, cam, [{ x: -9, y: 0, z }, { x: 10, y: 0, z }]); e.stroke(); e.restore();
}
function dust(e, cam, n, seed, b, { size = 2, alpha = 0.45 } = {}) {
  e.fillStyle = P.ink;
  for (let i = 0; i < n; i++) {
    const p = cam.project({ x: lerp(b.x0, b.x1, hash(i, seed)), y: lerp(b.y0, b.y1, hash(i, seed + 1)), z: lerp(b.z0, b.z1, hash(i, seed + 2)) }); if (!p) continue;
    e.globalAlpha = alpha * (0.2 + 0.8 * hash(i, seed + 3)); e.beginPath(); e.arc(p.x, p.y, size * (0.35 + hash(i, seed + 4)), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
}
function mono(e, text, x, y, { size = 18, color = P.tech, align = 'left', track = 4, weight = 500, alpha = 1 } = {}) {
  e.save(); e.globalAlpha = alpha; e.font = `${weight} ${size}px "JetBrains Mono"`; e.letterSpacing = `${track}px`; e.fillStyle = color; e.textAlign = align; e.fillText(text, x, y); e.restore();
}
/** CinematicTypography: kicker (technical) + statement (dominant), left aligned on the 80px margin */
function statement(e, kick, lines, y0, opts) { TYPE.push((c) => statementNow(c, kick, lines, y0, opts)); }
function statementNow(e, kick, lines, y0, { size = 104, lead = 1.02 } = {}) {
  mono(e, kick, 80, y0 - size * 0.95, { size: 20, color: P.ink2, track: 5 });
  e.save(); e.fillStyle = P.tech; e.fillRect(80, y0 - size * 0.95 + 18, 44, 1.5); e.restore();
  e.save(); e.font = `800 ${size}px "Inter Display"`; e.letterSpacing = '0.5px'; e.fillStyle = P.ink;
  lines.forEach((l, i) => e.fillText(l, 74, y0 + 26 + i * size * lead)); e.restore();
}
function frameMarks(e, n) { TYPE.push((c) => frameMarksNow(c, n)); }
function frameMarksNow(e, n) {
  mono(e, 'QUIET BANDS', 80, 110, { size: 16, color: P.tech, track: 5 });
  mono(e, `EVERYBODY CAN BUILD · ${n}`, W - 80, 110, { size: 16, color: P.tech, track: 4, align: 'right' });
}
/** dotted 3D arc (quadratic, raised control) from a to b: the path a creation travelled */
function trajectory(e, cam, a, b, lift, alpha) {
  const c = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + lift, z: (a.z + b.z) / 2 };
  const pts = Array.from({ length: 40 }, (_, k) => { const u = k / 39, v = 1 - u; return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y, z: v * v * a.z + 2 * u * v * c.z + u * u * b.z }; });
  e.save(); e.globalAlpha = alpha; e.strokeStyle = P.ink2; e.lineWidth = 1.3; e.lineCap = 'round'; e.setLineDash([0.1, 6]); path3(e, cam, pts); e.stroke(); e.restore();
}
const tone = (cam, it, k = 1) => { const p = cam.project({ x: it.x, y: 0, z: it.z }); return p ? (1 - 0.72 * smoothstep(clamp((p.z - 9) / 26))) * k : 0; };
function creatorAtDesk(e, cam, { reach = 1, light = 1, prompt = 'build a booking site' } = {}) {
  billboard(e, cam, { x: HIP.x, y: 0, z: 0.04 }, (g, s) => chair(g, s, { P }));
  deskSeated(e, cam, { P, x0: DESK_X, prompt });
  billboard(e, cam, { x: HIP.x, y: 0, z: 0 }, (g, s) => human(g, s, { P, pose: 'sit', reach, lean: 0.1, light }));
}
function bulbWithTether(e, cam, glowK = 1, { label = true } = {}) {
  const b = cam.project(BULB), head = cam.project({ x: HIP.x + 0.05, y: 1.4, z: 0 });
  e.save(); e.strokeStyle = P.tech; e.lineWidth = 1.3; e.setLineDash([2, 6]); e.beginPath(); e.moveTo(b.x, b.y); e.lineTo(head.x, head.y); e.stroke(); e.restore();
  billboard(e, cam, BULB, (g, s) => bulb(g, s, { P, glow: glowK }));
  if (label) {
    const t = cam.project({ x: BULB.x + 0.2, y: BULB.y + 0.22, z: 0 });
    e.save(); e.strokeStyle = P.tech; e.lineWidth = 1.2; e.beginPath(); e.moveTo(t.x, t.y); e.lineTo(t.x + 60, t.y - 40); e.lineTo(t.x + 120, t.y - 40); e.stroke(); e.restore();
    mono(e, 'IDEA', t.x + 132, t.y - 46, { size: 17, color: P.ink2 }); mono(e, '01', t.x + 132, t.y - 22, { size: 15 });
  }
}

/* ---------------- A: THE CREATOR ---------------- */
function A(ctx, e) {
  const cam = cam3({ W, H, pos: { x: 0.36, y: 1.02, z: -3.85 }, pitch: 0.02, f: 1650 });
  const b = cam.project({ x: BULB.x, y: BULB.y + 0.2, z: 0 }), pool = cam.project({ x: 0.1, y: 0, z: 0 }), poolR = cam.project({ x: 1.9, y: 0, z: 0 }), poolF = cam.project({ x: 0.1, y: 0, z: -0.9 });
  const scr = cam.project(SCREEN);
  glow(ctx, b.x, b.y + 180, 900, 1000, { alpha: 0.06 });                       // the idea lights the whole dark around it
  glow(ctx, b.x, b.y, 230, 230, { alpha: 0.24 });
  cone(ctx, { x: b.x, y: b.y }, 40, pool, (poolR.x - pool.x) * 1.9, { alpha: 0.075, L, blur: 40 });
  glow(ctx, pool.x, pool.y, poolR.x - pool.x, (poolF.y - pool.y), { alpha: 0.16 });
  glow(ctx, scr.x - 40, scr.y, 260, 200, { alpha: 0.1 });                       // the screen lights the figure's front
  floorDots(e, cam, { cx: 0.1, cz: 0.2, r: 2.4, base: 0.1, pool: 0.6, z1: 18 });
  groundLine(e, cam, 0.34);
  // scale: a floor ruler under the workstation, in the technical tone
  const rz = -0.62; e.save(); e.strokeStyle = P.tech; e.lineWidth = 1.2; path3(e, cam, [{ x: -0.9, y: 0, z: rz }, { x: 1.3, y: 0, z: rz }]); e.stroke();
  for (let i = 0; i <= 22; i++) { const x = -0.9 + i * 0.1, long = i % 5 === 0; path3(e, cam, [{ x, y: 0, z: rz }, { x, y: 0, z: rz - (long ? 0.08 : 0.035) }]); e.stroke(); if (long) { const p = cam.project({ x, y: 0, z: rz - 0.17 }); mono(e, (i / 10).toFixed(1), p.x, p.y + 10, { size: 15, align: 'center', track: 1 }); } }
  e.restore();
  creatorAtDesk(e, cam);
  bulbWithTether(e, cam, 1);
  dust(e, cam, 110, 3, { x0: -1.4, x1: 1.4, y0: 0.4, y1: 2.6, z0: -0.5, z1: 0.6 }, { size: 1.9, alpha: 0.5 });
  statement(e, '01 — ACCESS', ['EVERYBODY', 'CAN BUILD.'], 330);
  frameMarks(e, 'A');
  return { bokeh: [[120, 1780, 80, 0.06], [970, 1660, 50, 0.05], [900, 300, 40, 0.03]] };
}

/* ---------------- B: MULTIPLICATION ---------------- */
function B(ctx, e) {
  const cam = cam3({ W, H, pos: { x: 1.15, y: 1.75, z: -9.0 }, pitch: 0.075, f: 1700 });
  const f = FIRST_RING[0], fc = cam.project({ x: f.x, y: f.y + f.h / 2, z: f.z }), pool = cam.project({ x: 0.1, y: 0, z: 0 }), far = cam.project({ x: spine(20), y: 0, z: 20 });
  const b = cam.project(BULB);
  glow(ctx, fc.x, fc.y, 560, 560, { alpha: 0.11 });
  glow(ctx, b.x, b.y, 120, 120, { alpha: 0.18 });
  glow(ctx, pool.x, pool.y, 300, 60, { alpha: 0.14 });
  glow(ctx, far.x, far.y - 80, 900, 300, { alpha: 0.06 });
  cone(ctx, { x: fc.x, y: -40 }, 160, cam.project({ x: f.x, y: 0, z: f.z }), 480, { alpha: 0.08, L, blur: 40 });
  floorDots(e, cam, { cx: 1.5, cz: 6, r: 11, base: 0.07, pool: 0.32, step: 0.4 });
  groundLine(e, cam, 0.34, 0.7);
  // the field, far to near, then the first ring, all tied back to the one screen they came from
  const src = SCREEN;
  const nearField = [...FIELD].sort((a, b) => a.z - b.z).slice(0, 14);
  for (const c of nearField) trajectory(e, cam, src, { x: c.x, y: c.y + c.h * 0.5, z: c.z }, 1.6 + c.z * 0.08, 0.45 * tone(cam, c));
  for (const c of FIRST_RING) trajectory(e, cam, src, { x: c.x, y: c.y + c.h * 0.5, z: c.z }, 1.1, 0.95);
  for (const c of [...FIELD].sort((a, b) => b.z - a.z)) place(e, cam, c, { P, tone: tone(cam, c) });
  for (const c of [...FIRST_RING].sort((a, b) => b.z - a.z).slice(0, -1)) place(e, cam, c, { P, tone: tone(cam, c) });
  creatorAtDesk(e, cam, { light: 0.96 });
  bulbWithTether(e, cam, 0.8, { label: false });
  place(e, cam, f, { P, tone: 1, mark: true });                                   // the first: dominant, nearest the light
  dust(e, cam, 160, 13, { x0: -3, x1: 5, y0: 0.3, y1: 4.5, z0: -1, z1: 7 }, { size: 1.7, alpha: 0.32 });
  // DataCounter: the count of creations, a technical callout on the ground line
  const q = cam.project({ x: -1.75, y: 0, z: 0.34 });
  mono(e, 'CREATIONS', q.x, q.y + 46, { size: 15, color: P.tech });
  e.save(); e.font = '800 46px "Inter Display"'; e.fillStyle = P.ink2; e.fillText(`1 → ${FIELD.length + FIRST_RING.length}`, q.x, q.y + 100); e.restore();
  mono(e, '02 — MULTIPLICATION', 80, 236, { size: 20, color: P.ink2, track: 5 });
  frameMarks(e, 'B');
  return { bokeh: [[1000, 420, 70, 0.045], [90, 1450, 100, 0.04], [700, 1850, 60, 0.04]] };
}

/* ---------------- C: THE SYSTEM ---------------- */
// Layout worked from sightlines (camera 4.4 m up, pitched 19.5 deg): nothing overlaps on screen, reading order
// runs near -> far (bottom -> top): customer, business, process, outcome.
const SYS = {
  customer: { x: 0.7, z: 11.6 },
  business: { type: 'store', x: 3.5, y: 0, z: 12.4, w: 1.3, h: 1.27, yaw: -0.12 },
  site: { type: 'site', x: 3.5, y: 1.62, z: 12.4, w: 0.86, h: 0.6, yaw: -0.12 },
  process: { x: 1.3, z: 15.6 },
  outcome: { type: 'calendar', x: 3.9, y: 0.14, z: 20.0, w: 1.0, h: 1.0, yaw: -0.15 },
};
function C(ctx, e) {
  const cam = cam3({ W, H, pos: { x: 2.45, y: 4.4, z: 5.6 }, pitch: 0.34, f: 1550 });
  const S = SYS;
  // floor pathways, as curves between floor anchors
  const curve = (a, b, bend = 0.12) => Array.from({ length: 61 }, (_, k) => { const u = k / 60, mx = (a.x + b.x) / 2 + (b.z - a.z) * bend, mz = (a.z + b.z) / 2 - (b.x - a.x) * bend; return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y: 0, z: (1 - u) ** 2 * a.z + 2 * u * (1 - u) * mz + u * u * b.z }; });
  const P1 = curve({ x: S.customer.x + 0.35, z: S.customer.z }, { x: S.business.x - 0.75, z: S.business.z }, -0.15);
  const P2 = curve({ x: S.business.x - 0.35, z: S.business.z + 0.55 }, { x: S.process.x + 0.4, z: S.process.z - 0.5 }, 0.1);
  const P3 = curve({ x: S.process.x + 0.5, z: S.process.z + 0.1 }, { x: S.outcome.x - 0.55, z: S.outcome.z }, -0.12);
  const gap = P2[30], gp = cam.project(gap), ctr = cam.project({ x: 2.4, y: 0, z: 15.5 });
  glow(ctx, ctr.x, ctr.y - 260, 900, 760, { alpha: 0.055 });
  glow(ctx, ctr.x, ctr.y, 620, 260, { alpha: 0.1 });
  cone(ctx, { x: ctr.x, y: -60 }, 220, ctr, 860, { alpha: 0.06, L, blur: 40 });
  glow(ctx, gp.x, gp.y, 200, 70, { alpha: 0.32, color: LIVE });                  // the failure lights the floor around it
  floorDots(e, cam, { cx: 2.4, cz: 15, r: 6.5, base: 0.07, pool: 0.4, z0: 6, step: 0.4 });
  // the rest of the world: creations that stayed disconnected, receded to the technical grey
  for (const c of [...FIELD].filter((c) => { const p = cam.project({ x: c.x, y: c.y + c.h, z: c.z }); return c.z > 23 && p && p.y > 560; }).sort((a, b) => b.z - a.z)) place(e, cam, c, { P, tone: tone(cam, c, 0.32), mark: false, tether: false });
  // pathways: luminous core + dashed shoulder. P1 carries traffic; P2 has failed in the middle; P3 waits (idle, dashed)
  const pathLine = (pts, { color = P.ink, width = 2.6, alpha = 1, dash = null } = {}) => { e.save(); e.globalAlpha = alpha; e.strokeStyle = color; e.lineWidth = width; e.lineCap = 'round'; if (dash) e.setLineDash(dash); path3(e, cam, pts); e.stroke(); e.restore(); };
  const shoulder = (pts) => pathLine(pts.map((q) => ({ ...q, x: q.x + 0.14 })), { color: P.tech, width: 1, dash: [2, 7] });
  pathLine(P1); shoulder(P1);
  pathLine(P2.slice(0, 23)); pathLine(P2.slice(38)); shoulder(P2);
  pathLine(P3, { color: P.ink2, width: 1.6, alpha: 0.55, dash: [8, 8] });
  for (const u of [0.25, 0.55, 0.85]) { const p = cam.project(P1[Math.round(u * 60)]); e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 6, 0, Math.PI * 2); e.fill(); }
  // work piling up before the break: packets stacked at the loose end
  for (let i = 0; i < 3; i++) { const p = cam.project(P2[22 - i * 3]); e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 6, 0, Math.PI * 2); e.fill(); }
  for (const q of [P2[22], P2[38]]) { const p = cam.project(q); e.fillStyle = P.live; e.beginPath(); e.arc(p.x, p.y, 7, 0, Math.PI * 2); e.fill(); }
  e.save(); e.strokeStyle = P.live; e.lineWidth = 2.2; floorCircle(e, cam, gap.x, gap.z, 0.4); e.stroke(); e.globalAlpha = 0.5; e.setLineDash([3, 6]); floorCircle(e, cam, gap.x, gap.z, 0.7); e.stroke(); e.restore();
  { const tx = gp.x + 190, ty = gp.y - 150; e.save(); e.strokeStyle = P.live; e.globalAlpha = 0.85; e.lineWidth = 1.3; e.beginPath(); e.moveTo(gp.x + 26, gp.y - 14); e.lineTo(tx - 20, ty + 10); e.lineTo(tx + 240, ty + 10); e.stroke(); e.restore();
    mono(e, 'HANDOFF 02 → 03', tx, ty - 4, { size: 17, color: P.live, track: 3 }); mono(e, 'NO RESPONSE', tx, ty + 36, { size: 17, color: P.live, track: 3, alpha: 0.7 }); }
  // the four parts, far to near, each with a floor ring and a numbered technical label
  const tag = (x, z, n, name, r = 0.6) => { const p0 = cam.project({ x, y: 0, z: z - r }), p = { x: p0.x, y: p0.y + 30 }; mono(e, n, p.x, p.y + 4, { size: 15, align: 'center', color: P.tech, track: 2 }); mono(e, name, p.x, p.y + 26, { size: 15, align: 'center', color: P.ink2, track: 4 }); };
  place(e, cam, S.outcome, { P, tone: 0.62, done: 0 });
  box3(e, cam, [S.outcome.x - 0.5, S.outcome.x + 0.5], [0, 0.14], [S.outcome.z - 0.2, S.outcome.z + 0.2], { top: mix(P.bg, P.ink2, 0.4), front: mix(P.bg, P.ink2, 0.22), side: mix(P.bg, P.ink2, 0.15), edge: P.ink2, line: 1 });
  tag(S.outcome.x, S.outcome.z, '04', 'OUTCOME');
  machine(e, cam, { P, x: S.process.x, z: S.process.z, items: null, tone: 0.82 });
  tag(S.process.x - 0.4, S.process.z, '03', 'PROCESS');
  place(e, cam, S.business, { P, tone: 1 });
  tag(S.business.x, S.business.z, '02', 'BUSINESS');
  e.save(); e.strokeStyle = P.tech; e.lineWidth = 1.2; floorCircle(e, cam, S.customer.x, S.customer.z, 0.42); e.stroke(); e.restore();
  billboard(e, cam, { x: S.customer.x, y: 0, z: S.customer.z }, (g, s) => human(g, s, { P, pose: 'stand', reach: 0.35, lean: 0.03 }));
  tag(S.customer.x, S.customer.z, '01', 'CUSTOMER');
  dust(e, cam, 150, 23, { x0: -0.5, x1: 5.5, y0: 0.3, y1: 3.5, z0: 10.5, z1: 20 }, { size: 1.9, alpha: 0.35 });
  statement(e, '05 — THE SYSTEM', ['SOLVING THE', 'PROBLEM IS.'], 330, { size: 96 });
  frameMarks(e, 'C');
  return { bokeh: [[90, 1700, 90, 0.05], [1000, 1250, 70, 0.04]] };
}

const SHOTS = [A, B, C];
let TYPE = [];  // typography is drawn after the glow, so it stays crisp
function draw(ctx, t) {
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  // almost imperceptible gradient so the black has depth
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#06070A'); g.addColorStop(0.5, '#0C0D10'); g.addColorStop(1, '#060709');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  TYPE = [];
  const out = SHOTS[Math.min(2, Math.floor(t))](ctx, e);
  halo(ctx, L);
  for (const f of TYPE) f(ctx);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a] of out.bokeh ?? []) { ctx.filter = `blur(${r * 0.2}px)`; ctx.fillStyle = `rgba(${INK},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  vignette(ctx, W, H, { amount: 0.7 });
  grain(ctx, L, Math.floor(t * 7));
}

export default { width: W, height: H, fps: 1, duration: 3, palette: P, draw };
