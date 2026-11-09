// Art-direction keyframes for the redesigned 5 s proof. Three stills, one continuous world:
//   frame 0  THE CREATOR      a builder at a workstation; an AI panel floats beside it
//   frame 1  MULTIPLIES       the first creation rises; copies spread through depth along a sweeping arc
//   frame 2  THE SYSTEM       the camera has moved into the field; creations link by floor pathways; one link breaks (orange)
// Render: node tools/motion/render.mjs everybody-can-build/keyframes --frames=0,1,2 --blur=1
import { clamp, hash, smoothstep, lerp } from '../../engine/math.js';
import { cam3, panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, bloom, cone, glow, vignette, grain } from '../../engine/light.js';
import { figure, workstation, aiPanel, creation, CREATION_SIZE } from '../../engine/illustrations.js';
import { mix, PALETTES } from '../../engine/color.js';

const W = 1080, H = 1920, P = PALETTES.brief, INK = '246,244,238', LIVE = '255,106,33';
let L;

/* ---------- the world (shared by every shot) ---------- */
const FIG = { x: -0.45, z: 0 };
const TYPES = ['site', 'store', 'app', 'product'];
// the field: a sweeping arc of creations receding from the workstation; denser with distance, never a grid
const FIELD = [];
for (let i = 0; FIELD.length < 72 && i < 400; i++) {
  const u = (i + 0.5) / 140, z = 4.2 + 40 * u ** 1.25;
  const spine = 0.9 + Math.sin(z * 0.15) * 2.4 + z * 0.05;
  const x = spine + (hash(i, 1) - 0.5) * (2.2 + z * 0.42);
  const type = TYPES[Math.floor(hash(i, 2) * 4)], [w, h] = CREATION_SIZE[type];
  const sc = 0.85 + hash(i, 4) * 0.5;
  const c = { i, x, z, y: 0.25 + hash(i, 3) * 1.5, type, w: w * sc, h: h * sc, yaw: (hash(i, 5) - 0.5) * 0.7 };
  if (FIELD.some((o) => Math.hypot(o.x - c.x, (o.z - c.z) * 0.7) < 1.3)) continue; // breathing room
  FIELD.push(c);
}

/* ---------- shared drawing ---------- */
function floorDots(e, cam, { x0, x1, z0, z1, step, cx, cz, r, base = 0.1, pool = 0.45 }) {
  e.fillStyle = `rgb(${INK})`;
  for (let z = z0; z <= z1; z += step) for (let x = x0; x <= x1; x += step) {
    const p = cam.project({ x, y: 0, z }); if (!p || p.x < -10 || p.x > W + 10 || p.y > H + 10) continue;
    const d = Math.hypot(x - cx, z - cz), fog = 1 - smoothstep(clamp((p.z - 4) / 34));
    const a = fog * (base + pool * (1 - smoothstep(clamp(d / r))));
    if (a < 0.01) continue;
    e.globalAlpha = a; e.beginPath(); e.arc(p.x, p.y, Math.max(0.8, 0.012 * p.s), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
}
function dashedRing(e, cam, cx, cz, r, { alpha = 0.5, dash = [10, 9], width = 1.4, color = INK } = {}) {
  e.save(); e.strokeStyle = `rgba(${color},${alpha})`; e.lineWidth = width; e.setLineDash(dash); floorCircle(e, cam, cx, cz, r); e.stroke(); e.restore();
}
function dust(e, cam, n, seed, box, { size = 2.2, alpha = 0.5 } = {}) {
  e.fillStyle = `rgb(${INK})`;
  for (let i = 0; i < n; i++) {
    const q = { x: lerp(box.x0, box.x1, hash(i, seed)), y: lerp(box.y0, box.y1, hash(i, seed + 1)), z: lerp(box.z0, box.z1, hash(i, seed + 2)) };
    const p = cam.project(q); if (!p) continue;
    e.globalAlpha = alpha * (0.25 + 0.75 * hash(i, seed + 3)); e.beginPath(); e.arc(p.x, p.y, size * (0.4 + hash(i, seed + 4)), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
}
function bokeh(ctx, spots) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a] of spots) { ctx.filter = `blur(${r * 0.18}px)`; ctx.fillStyle = `rgba(${INK},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function label(e, text, x, y, { size = 20, color = `rgba(${INK},0.55)`, align = 'left', track = 4, weight = 500, font = '"JetBrains Mono"' } = {}) {
  e.save(); e.font = `${weight} ${size}px ${font}`; e.letterSpacing = `${track}px`; e.fillStyle = color; e.textAlign = align; e.textBaseline = 'alphabetic'; e.fillText(text, x, y); e.restore();
}
function kicker(e, n, title) {
  label(e, n, 80, 140, { size: 20, color: `rgba(${INK},0.9)` });
  e.fillStyle = `rgba(${INK},0.35)`; e.fillRect(128, 133, 56, 1.5);
  label(e, title, 200, 140, { size: 20 });
  label(e, 'QUIET BANDS · MOTION LAB', W - 80, 140, { size: 16, align: 'right', color: `rgba(${INK},0.3)`, track: 3 });
}
/** a creation standing in space: floor mark, tether, the panel itself; fog dims it toward the black */
function placeCreation(e, cam, c, { dim = 0, accent = 0, tether = true, mark = true } = {}) {
  const p = cam.project({ x: c.x, y: 0, z: c.z }); if (!p) return;
  const fog = smoothstep(clamp((p.z - 6) / 26)), lift = 1 - fog * 0.88 - dim;
  if (lift <= 0.02) return;
  if (mark) { e.save(); e.strokeStyle = `rgba(${INK},${0.35 * lift})`; e.lineWidth = 1.2; floorCircle(e, cam, c.x, c.z, c.w * 0.45, 0, 48); e.stroke(); e.restore(); }
  if (tether) { const a = cam.project({ x: c.x, y: c.y, z: c.z }); e.save(); e.strokeStyle = `rgba(${INK},${0.3 * lift})`; e.lineWidth = 1; e.setLineDash([3, 5]); e.beginPath(); e.moveTo(p.x, p.y); e.lineTo(a.x, a.y); e.stroke(); e.restore(); }
  panel(e, cam, { x: c.x, y: c.y, z: c.z }, c.w, c.h, c.yaw, (g, w, h, s) => creation(g, c.type, w, h, s, { ink: mix(P.bg, P.ink, lift), bg: P.bg, live: P.live, accent }));
}

/* ---------- SHOT 1: THE CREATOR ---------- */
function shot1(ctx, e) {
  const cam = cam3({ W, H, pos: { x: 0.28, y: 1.2, z: -4.1 }, pitch: 0.05, f: 1620 });
  const head = cam.project({ x: FIG.x, y: 1.6, z: 0 }), pool = cam.project({ x: 0.15, y: 0, z: 0.05 });
  const poolR = cam.project({ x: 1.75, y: 0, z: 0.05 }), poolF = cam.project({ x: 0.15, y: 0, z: -1.1 });
  // atmosphere (on the base): back glow, overhead cone, floor pool
  glow(ctx, head.x + 120, head.y + 80, 760, 900, { alpha: 0.07 });
  cone(ctx, { x: pool.x - 40, y: -40 }, 220, pool, (poolR.x - pool.x) * 2.1, { alpha: 0.13 });
  glow(ctx, pool.x, pool.y, poolR.x - pool.x, (poolF.y - pool.y) * 1.05, { alpha: 0.2 });
  // emissive world
  floorDots(e, cam, { x0: -4, x1: 5, z0: -2, z1: 16, step: 0.3, cx: 0.15, cz: 0.05, r: 2.2 });
  dashedRing(e, cam, 0.15, 0.05, 1.55, { alpha: 0.42 });
  dashedRing(e, cam, 0.15, 0.05, 2.25, { alpha: 0.18, dash: [3, 12] });
  // ground line (dashed, receding to the sides) and a floor ruler: the measured, technical world
  e.save(); e.strokeStyle = `rgba(${INK},0.25)`; e.lineWidth = 1.2; e.setLineDash([16, 12]); path3(e, cam, [{ x: -6, y: 0, z: 2.2 }, { x: 7, y: 0, z: 2.2 }]); e.stroke(); e.restore();
  const rz = -0.95; e.save(); e.strokeStyle = `rgba(${INK},0.5)`; e.lineWidth = 1.2; path3(e, cam, [{ x: -0.7, y: 0, z: rz }, { x: 1.4, y: 0, z: rz }]); e.stroke();
  for (let i = 0; i <= 21; i++) { const x = -0.7 + i * 0.1, long = i % 5 === 0; path3(e, cam, [{ x, y: 0, z: rz }, { x, y: 0, z: rz - (long ? 0.09 : 0.04) }]); e.stroke(); if (long) { const p = cam.project({ x, y: 0, z: rz - 0.2 }); label(e, (i / 10).toFixed(1), p.x, p.y + 8, { size: 15, align: 'center', track: 1, color: `rgba(${INK},0.45)` }); } }
  e.restore();
  // height dimension beside the figure
  const d0 = cam.project({ x: -0.86, y: 0, z: 0 }), d1 = cam.project({ x: -0.86, y: 1.75, z: 0 });
  e.save(); e.strokeStyle = `rgba(${INK},0.4)`; e.lineWidth = 1.2; e.beginPath(); e.moveTo(d0.x, d0.y); e.lineTo(d1.x, d1.y); e.moveTo(d0.x - 9, d0.y); e.lineTo(d0.x + 9, d0.y); e.moveTo(d1.x - 9, d1.y); e.lineTo(d1.x + 9, d1.y); e.stroke(); e.restore();
  e.save(); e.translate(d0.x - 16, (d0.y + d1.y) / 2); e.rotate(-Math.PI / 2); label(e, '1.75 M', 0, 0, { size: 15, align: 'center', track: 3, color: `rgba(${INK},0.45)` }); e.restore();
  // the workstation, then the figure in front of it, reaching to the keyboard
  workstation(e, cam, { ink: P.ink, bg: P.bg });
  billboard(e, cam, { x: FIG.x, y: 0, z: -0.02 }, (g, s) => figure(g, s, { ink: P.ink, bg: P.bg, pose: 1 }));
  // the AI panel and its leader to the screen
  const a = cam.project({ x: 0.58, y: 1.64, z: -0.2 }), m = cam.project({ x: 0.88, y: 1.5, z: 0.25 });
  e.save(); e.strokeStyle = `rgba(${INK},0.55)`; e.lineWidth = 1.3; e.setLineDash([5, 6]); e.beginPath(); e.moveTo(m.x, m.y); e.lineTo(a.x, a.y); e.stroke(); e.setLineDash([]);
  e.fillStyle = `rgb(${INK})`; e.beginPath(); e.arc(m.x, m.y, 4, 0, Math.PI * 2); e.fill(); e.restore();
  panel(e, cam, { x: 0.96, y: 1.64, z: -0.3 }, 0.84, 0.48, -0.28, (g, w, h, s) => aiPanel(g, w, h, s, { ink: P.ink, bg: P.bg, live: P.live, prompt: 'build a booking site', caret: 1, progress: 0 }));
  dust(e, cam, 140, 11, { x0: -1.2, x1: 1.6, y0: 0.3, y1: 3.2, z0: -0.6, z1: 0.8 }, { size: 2, alpha: 0.45 });
  // headline: supporting, not leading
  kicker(e, '01', 'THE CREATOR');
  e.save(); e.font = '800 112px "Inter Display"'; e.letterSpacing = '-3px'; e.fillStyle = P.ink;
  e.fillText('Everybody', 76, 330); e.fillText('can build.', 76, 444); e.restore();
  return { bokeh: [[110, 1760, 70, 0.07], [980, 1640, 44, 0.06], [880, 1860, 110, 0.05]] };
}

/* ---------- SHOT 2: CREATION MULTIPLIES ---------- */
function shot2(ctx, e) {
  const cam = cam3({ W, H, pos: { x: 1.1, y: 2.25, z: -7.2 }, pitch: 0.115, f: 1720 });
  const first = { x: 0.9, z: 0.5, y: 1.85, type: 'site', w: 1.9, h: 1.33, yaw: -0.1 };
  const fc = cam.project({ x: first.x, y: first.y + first.h / 2, z: first.z });
  const far = cam.project({ x: 3, y: 0, z: 22 });
  glow(ctx, fc.x, fc.y, 620, 620, { alpha: 0.12 });
  glow(ctx, far.x, far.y, 900, 260, { alpha: 0.07 });             // the field's own light, far off
  cone(ctx, { x: fc.x, y: -60 }, 180, cam.project({ x: first.x, y: 0, z: first.z }), 520, { alpha: 0.11 });
  const pool = cam.project({ x: 0.3, y: 0, z: 0.2 }); glow(ctx, pool.x, pool.y, 340, 70, { alpha: 0.18 });
  floorDots(e, cam, { x0: -6, x1: 10, z0: -3, z1: 40, step: 0.45, cx: 2.5, cz: 10, r: 14, base: 0.08, pool: 0.25 });
  // the sweep the field follows: a faint guide arc on the floor
  e.save(); e.strokeStyle = `rgba(${INK},0.16)`; e.lineWidth = 1.2; e.setLineDash([2, 10]);
  path3(e, cam, Array.from({ length: 80 }, (_, i) => { const z = 1 + i * 0.5; return { x: 0.9 + Math.sin(z * 0.15) * 2.4 + z * 0.05, y: 0, z }; })); e.stroke(); e.restore();
  // field, far to near
  const vis = FIELD.filter((c) => c.z > first.z + 1).sort((a, b) => b.z - a.z);
  for (const c of vis) placeCreation(e, cam, c);
  // the workstation and figure, now smaller in the middle ground
  workstation(e, cam, { ink: P.ink, bg: P.bg });
  billboard(e, cam, { x: FIG.x, y: 0, z: -0.02 }, (g, s) => figure(g, s, { ink: P.ink, bg: P.bg, pose: 1 }));
  // the first creation: the dominant subject, rising out of the screen on a light tether
  const m = cam.project({ x: 0.84, y: 1.45, z: 0.1 }), b = cam.project({ x: first.x, y: first.y, z: first.z });
  e.save(); e.strokeStyle = `rgba(${INK},0.7)`; e.lineWidth = 1.5; e.setLineDash([4, 6]); e.beginPath(); e.moveTo(m.x, m.y); e.lineTo(b.x, b.y); e.stroke(); e.restore();
  placeCreation(e, cam, first, { tether: false, mark: false });
  // scale callout: a measured bracket from the first to the field, the count in small type
  const q0 = cam.project({ x: 2.2, y: 3.2, z: 0.55 }), q1 = cam.project({ x: 5.5, y: 3.2, z: 14 });
  e.save(); e.strokeStyle = `rgba(${INK},0.45)`; e.lineWidth = 1.2; e.beginPath(); e.moveTo(q0.x, q0.y); e.lineTo(q1.x, q1.y); e.moveTo(q0.x, q0.y - 8); e.lineTo(q0.x, q0.y + 8); e.moveTo(q1.x, q1.y - 8); e.lineTo(q1.x, q1.y + 8); e.stroke(); e.restore();
  label(e, '1 → 10,000', (q0.x + q1.x) / 2, (q0.y + q1.y) / 2 - 16, { size: 22, align: 'center', color: `rgba(${INK},0.8)`, track: 2 });
  dust(e, cam, 160, 21, { x0: -2, x1: 6, y0: 0.2, y1: 4, z0: -1, z1: 6 }, { size: 1.8, alpha: 0.35 });
  kicker(e, '02', 'CREATION MULTIPLIES');
  // foreground: two creations very close to the lens, out of focus (depth of field)
  return { near: [{ x: -1.25, z: -5.2, y: 1.0, type: 'app', w: 0.42, h: 0.8, yaw: 0.25 }, { x: 3.0, z: -4.8, y: 1.15, type: 'store', w: 0.86, h: 0.84, yaw: -0.3 }], cam,
    bokeh: [[960, 380, 60, 0.05], [140, 1500, 90, 0.04]] };
}

/* ---------- SHOT 3: THE SYSTEM (one link breaks) ---------- */
// The system is designed, not sampled: six creations the field reorganizes into, linked on the floor.
export const SYSTEM = [
  { id: 'A', x: 1.25, z: 14.6, y: 0.06, type: 'site', w: 1.0, h: 0.7, yaw: 0.12 },
  { id: 'B', x: 2.6, z: 13.5, y: 0.06, type: 'app', w: 0.46, h: 0.88, yaw: 0 },
  { id: 'C', x: 3.95, z: 14.7, y: 0.06, type: 'store', w: 0.9, h: 0.88, yaw: -0.14 },
  { id: 'D', x: 1.55, z: 18.0, y: 0.06, type: 'product', w: 0.66, h: 0.72, yaw: 0.1 },
  { id: 'E', x: 3.65, z: 18.3, y: 0.06, type: 'site', w: 1.0, h: 0.7, yaw: -0.1 },
  { id: 'F', x: 2.6, z: 21.6, y: 0.06, type: 'store', w: 0.9, h: 0.88, yaw: 0 },
];
export const LINKS = [['A', 'B'], ['B', 'C'], ['A', 'D'], ['B', 'E'], ['C', 'E'], ['D', 'F'], ['E', 'F']];
const BREAK = 3; // B -> E fails

function shot3(ctx, e) {
  const cam = cam3({ W, H, pos: { x: 2.6, y: 3.3, z: 8.3 }, pitch: 0.265, f: 1720 });
  const N = Object.fromEntries(SYSTEM.map((n) => [n.id, n]));
  const curve = (a, b, n = 40) => Array.from({ length: n + 1 }, (_, k) => { const u = k / n, mx = (a.x + b.x) / 2 + (b.z - a.z) * 0.08, mz = (a.z + b.z) / 2 - (b.x - a.x) * 0.08; return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y: 0, z: (1 - u) ** 2 * a.z + 2 * u * (1 - u) * mz + u * u * b.z }; });
  const [ba, bb] = LINKS[BREAK].map((k) => N[k]);
  const gapMid = curve(ba, bb, 60)[9 + 21], bx = gapMid.x, bz = gapMid.z, bp = cam.project({ x: bx, y: 0, z: bz });
  const ctr = cam.project({ x: 2.6, y: 0, z: 17 });
  glow(ctx, ctr.x, ctr.y - 200, 900, 800, { alpha: 0.07 });
  glow(ctx, ctr.x, ctr.y, 560, 220, { alpha: 0.12 });
  glow(ctx, bp.x, bp.y, 210, 70, { alpha: 0.3, color: LIVE });   // the break lights the floor around it, orange
  cone(ctx, { x: ctr.x, y: -60 }, 200, ctr, 760, { alpha: 0.08 });
  floorDots(e, cam, { x0: -5, x1: 10, z0: 8, z1: 44, step: 0.42, cx: 2.6, cz: 17, r: 6, base: 0.06, pool: 0.3 });
  // the rest of the field: still there, receded to grey behind the system (not selected)
  for (const c of FIELD.filter((c) => c.z > 23).sort((a, b) => b.z - a.z)) placeCreation(e, cam, c, { dim: 0.55, tether: false });
  // pathways on the floor: luminous core, measured dashed shoulder, packets in transit
  LINKS.forEach(([ka, kb], li) => {
    const full = curve(N[ka], N[kb], 60), pts = full.slice(9, 52), broken = li === BREAK;
    const segs = broken ? [pts.slice(0, 16), pts.slice(27)] : [pts];
    for (const sg of segs) {
      e.save(); e.strokeStyle = `rgba(${INK},0.92)`; e.lineWidth = 2.6; e.lineCap = 'round'; path3(e, cam, sg); e.stroke();
      e.strokeStyle = `rgba(${INK},0.22)`; e.lineWidth = 1; e.setLineDash([2, 7]); path3(e, cam, sg.map((q) => ({ ...q, x: q.x + 0.14 }))); e.stroke(); e.restore();
    }
    if (!broken) for (const u of [0.3, 0.72]) { const p = cam.project(pts[Math.round(u * (pts.length - 1))]); e.fillStyle = `rgb(${INK})`; e.beginPath(); e.arc(p.x, p.y, 5.5, 0, Math.PI * 2); e.fill(); }
    else for (const q of [pts[15], pts[27]]) { const p = cam.project(q); e.fillStyle = P.live; e.beginPath(); e.arc(p.x, p.y, 6.5, 0, Math.PI * 2); e.fill(); }
  });
  // the break marker: orange ring, a short leader, one terse annotation
  e.save(); e.strokeStyle = P.live; e.lineWidth = 2.2; floorCircle(e, cam, bx, bz, 0.36); e.stroke();
  e.globalAlpha = 0.55; e.setLineDash([3, 6]); floorCircle(e, cam, bx, bz, 0.62); e.stroke(); e.restore();
  const tx = bp.x + 70, ty = bp.y + 150;
  e.save(); e.strokeStyle = `rgba(${LIVE},0.85)`; e.lineWidth = 1.3; e.beginPath(); e.moveTo(bp.x + 10, bp.y + 14); e.lineTo(tx, ty); e.lineTo(tx + 40, ty); e.stroke(); e.restore();
  label(e, 'LINK B–E', tx + 50, ty - 6, { size: 18, color: P.live, track: 3 });
  label(e, 'NO RESPONSE', tx + 50, ty + 20, { size: 18, color: `rgba(${LIVE},0.7)`, track: 3 });
  // the system's creations, far to near
  for (const c of [...SYSTEM].sort((a, b) => b.z - a.z)) placeCreation(e, cam, c, { accent: 0 });
  dust(e, cam, 150, 31, { x0: -0.5, x1: 5.5, y0: 0.2, y1: 4, z0: 11, z1: 22 }, { size: 2, alpha: 0.35 });
  kicker(e, '03', 'THE SYSTEM');
  return { bokeh: [[110, 420, 80, 0.05], [990, 1640, 100, 0.05], [70, 1820, 60, 0.04]] };
}

const SHOTS = [shot1, shot2, shot3];
function draw(ctx, t) {
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  // a faint lift behind everything so black reads as depth, not as a void
  const bgG = ctx.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#0B0C0D'); bgG.addColorStop(0.55, '#121315'); bgG.addColorStop(1, '#0A0B0C');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
  const out = SHOTS[Math.min(2, Math.floor(t))](ctx, e);
  bloom(ctx, L);
  if (out?.near?.length) { // out-of-focus foreground: drawn sharp to a scratch layer, then blurred in
    const n = L.tmp.getContext('2d'); n.setTransform(1, 0, 0, 1, 0, 0); n.clearRect(0, 0, W, H);
    for (const c of out.near) placeCreation(n, out.cam, c, { tether: false, mark: false });
    ctx.save(); ctx.filter = 'blur(9px)'; ctx.globalAlpha = 0.85; ctx.drawImage(L.tmp, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(40px)'; ctx.globalAlpha = 0.3; ctx.drawImage(L.tmp, 0, 0); ctx.restore();
  }
  if (out?.bokeh) bokeh(ctx, out.bokeh);
  vignette(ctx, W, H);
  grain(ctx, L, Math.floor(t * 30));
}

export default { width: W, height: H, fps: 1, duration: 3, palette: P, draw };
