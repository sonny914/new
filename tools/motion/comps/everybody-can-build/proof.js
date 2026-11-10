// PHASE 3 proof v2 (5 s, 1080x1920, 30 fps). One continuous world, one camera move.
//  0.0-1.4  THE CREATOR      push in on the builder; they reach in, type one prompt, the assistant answers
//  1.3-2.8  MULTIPLIES       the first creation rises from the screen; the camera pulls back as 10,000 copies
//                            divide out of it and spread through depth along a sweeping arc
//  2.8-4.0  INTO THE FIELD   the camera travels forward; the builder's own creation flies ahead and becomes a node;
//                            the few creations that form the system gather; the rest drop away or recede to grey
//  3.8-5.0  THE SYSTEM       links draw in flow order; information moves; link B-E fails (orange); traffic reroutes
//                            through C and the system keeps working
// Approved keyframes are frames of this comp: see keyframes.js (t = 1.15, 2.6, 4.75).
import { clamp, hash, smoothstep, lerp, seg, ease } from '../../engine/math.js';
import { cam3, panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { LIGHT, makeLayers, bloom, cone, glow, vignette, grain } from '../../engine/light.js';
import { figure, workstation, aiPanel, creation, CREATION_SIZE } from '../../engine/illustrations.js';
import { mix, PALETTES } from '../../engine/color.js';

const W = 1080, H = 1920, P = PALETTES.brand;
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const INK = rgbOf(P.ink), LIVE = rgbOf(P.live);
LIGHT.ink = INK;
let L;

/* ================= world ================= */
const FIG = { x: -0.45, z: 0 };
const MONITOR = { x: 0.84, y: 1.33, z: 0.1 };
const FIRST = { x: 0.9, z: 0.5, y: 1.85, type: 'site', w: 1.9, h: 1.33, yaw: -0.1 };
const TYPES = ['site', 'store', 'app', 'product'];
const spine = (z) => 0.9 + Math.sin(z * 0.15) * 2.4 + z * 0.05;
const FIELD = [];
for (let i = 0; FIELD.length < 72 && i < 400; i++) {
  const u = (i + 0.5) / 140, z = 4.2 + 40 * u ** 1.25;
  const x = spine(z) + (hash(i, 1) - 0.5) * (2.2 + z * 0.42);
  const type = TYPES[Math.floor(hash(i, 2) * 4)], [w, h] = CREATION_SIZE[type], sc = 0.85 + hash(i, 4) * 0.5;
  const c = { i, x, z, y: 0.25 + hash(i, 3) * 1.5, type, w: w * sc, h: h * sc, yaw: (hash(i, 5) - 0.5) * 0.7 };
  if (FIELD.some((o) => Math.hypot(o.x - c.x, (o.z - c.z) * 0.7) < 1.3)) continue;
  FIELD.push(c);
}
// births: copies divide out of the first creation, nearest first, accelerating (one becomes ten becomes thousands)
const order = [...FIELD].sort((a, b) => Math.hypot(a.x - FIRST.x, a.z - FIRST.z) - Math.hypot(b.x - FIRST.x, b.z - FIRST.z));
order.forEach((c, r) => { c.born = 1.72 + 0.95 * (r / order.length) ** 0.62; });
// out-of-focus foreground pair, revealed by the pull-back (behind the camera at the start)
const NEAR = [{ x: -1.25, z: -5.2, y: 1.0, type: 'app', w: 0.42, h: 0.8, yaw: 0.25, born: 1.9 }, { x: 3.0, z: -4.8, y: 1.15, type: 'store', w: 0.86, h: 0.84, yaw: -0.3, born: 2.05 }];

// the system the field reorganizes into (designed, not sampled), plus a dimmer second cluster behind it for scale
const SYSTEM = [
  { id: 'A', x: 1.25, z: 14.6, type: 'site', w: 1.0, h: 0.7, yaw: 0.12 },
  { id: 'B', x: 2.6, z: 13.5, type: 'app', w: 0.46, h: 0.88, yaw: 0 },
  { id: 'C', x: 3.95, z: 14.7, type: 'store', w: 0.9, h: 0.88, yaw: -0.14 },
  { id: 'D', x: 1.55, z: 18.0, type: 'product', w: 0.66, h: 0.72, yaw: 0.1 },
  { id: 'E', x: 3.65, z: 18.3, type: 'site', w: 1.0, h: 0.7, yaw: -0.1 },
  { id: 'F', x: 2.6, z: 21.6, type: 'store', w: 0.9, h: 0.88, yaw: 0 },
  // second cluster (dim): the system is one of several
  { id: 'G', x: -1.2, z: 27.5, type: 'app', w: 0.46, h: 0.88, yaw: 0.1, dim: 0.5 },
  { id: 'H', x: 0.6, z: 30.5, type: 'site', w: 1.0, h: 0.7, yaw: 0, dim: 0.5 },
  { id: 'I', x: 5.6, z: 28.4, type: 'product', w: 0.66, h: 0.72, yaw: -0.1, dim: 0.5 },
  { id: 'J', x: 3.4, z: 32.0, type: 'store', w: 0.9, h: 0.88, yaw: 0, dim: 0.5 },
];
const LINKS = [['A', 'B'], ['B', 'C'], ['A', 'D'], ['B', 'E'], ['C', 'E'], ['D', 'F'], ['E', 'F'], ['F', 'H'], ['G', 'H'], ['H', 'J'], ['J', 'I'], ['F', 'J']];
const BREAK = 3, T_BREAK = 4.22;
const N = Object.fromEntries(SYSTEM.map((n) => [n.id, n]));
// who becomes which node: A is the builder's own first creation; the others are the nearest field copies
{
  const used = new Set();
  for (const n of SYSTEM) {
    if (n.id === 'A') { n.from = FIRST; continue; }
    let best = null, bd = Infinity;
    for (const c of FIELD) { if (used.has(c.i) || c.z > 36) continue; const d = Math.hypot(c.x - n.x, c.z - n.z); if (d < bd) { bd = d; best = c; } }
    used.add(best.i); best.node = n; n.from = best;
  }
  for (const n of SYSTEM) { n.t0 = (n.id === 'A' ? 2.85 : 3.05) + (n.dim ? 0.18 : 0) + hash(n.id.charCodeAt(0), 9) * 0.12; n.t1 = n.t0 + (n.id === 'A' ? 1.0 : 0.8); }
}
const curve = (a, b, n = 60) => Array.from({ length: n + 1 }, (_, k) => { const u = k / n, mx = (a.x + b.x) / 2 + (b.z - a.z) * 0.08, mz = (a.z + b.z) / 2 - (b.x - a.x) * 0.08; return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y: 0, z: (1 - u) ** 2 * a.z + 2 * u * (1 - u) * mz + u * u * b.z }; });
const LINK_PTS = LINKS.map(([a, b]) => curve(N[a], N[b]).slice(9, 52));
const LINK_T = LINKS.map(([a, b], i) => 3.78 + (Math.min(N[a].z, N[b].z) - 13.5) * 0.028 + (N[a].dim ? 0.12 : 0));
const GAP = LINK_PTS[BREAK][21];

/* ================= camera ================= */
const S1 = { pos: { x: 0.28, y: 1.2, z: -4.1 }, yaw: 0, pitch: 0.05, f: 1620 };
const S2 = { pos: { x: 1.1, y: 2.25, z: -7.2 }, yaw: 0, pitch: 0.115, f: 1720 };
const S3 = { pos: { x: 2.6, y: 3.3, z: 8.3 }, yaw: 0, pitch: 0.265, f: 1720 };
const lerpPos = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
function camAt(t) {
  let pos, pitch, f;
  if (t < 1.35) { const k = ease.inOut3(seg(t, 0, 1.35)); pos = { ...S1.pos, z: lerp(-4.45, S1.pos.z, k), y: lerp(1.16, S1.pos.y, k) }; pitch = S1.pitch; f = S1.f; }
  else if (t < 2.75) { const k = ease.inOut5(seg(t, 1.35, 2.55)); pos = lerpPos(S1.pos, S2.pos, k); pos.z += -0.15 * seg(t, 2.55, 2.75); pitch = lerp(S1.pitch, S2.pitch, k); f = lerp(S1.f, S2.f, k); }
  else if (t < 3.98) { // travel: a raised arc over the workstation, into the field
    const k = ease.inOut3(seg(t, 2.75, 3.98)), a = { ...S2.pos, z: S2.pos.z - 0.15 }, c = { x: 3.3, y: 4.6, z: -0.5 }, u = 1 - k;
    pos = { x: u * u * a.x + 2 * u * k * c.x + k * k * S3.pos.x, y: u * u * a.y + 2 * u * k * c.y + k * k * S3.pos.y, z: u * u * a.z + 2 * u * k * c.z + k * k * S3.pos.z };
    pitch = lerp(S2.pitch, S3.pitch, ease.inOut3(seg(t, 2.95, 3.98))); f = S2.f;
  } else { const k = seg(t, 3.98, 5); pos = { ...S3.pos, z: S3.pos.z + 0.3 * k, y: S3.pos.y - 0.08 * k }; pitch = S3.pitch; f = S3.f; }
  return cam3({ W, H, pos, pitch, f });
}

/* ================= drawing helpers ================= */
function floorDots(e, cam, t, w1, w3) {
  e.fillStyle = P.ink;
  for (let z = -3; z <= 44; z += 0.38) for (let x = -6; x <= 10; x += 0.38) {
    const p = cam.project({ x, y: 0, z }); if (!p || p.x < -10 || p.x > W + 10 || p.y > H + 10 || p.y < -10) continue;
    const fog = 1 - smoothstep(clamp((p.z - 4) / 34));
    const d1 = Math.hypot(x - 0.15, z - 0.05), d3 = Math.hypot(x - 2.6, z - 17);
    const a = fog * (0.075 + 0.42 * w1 * (1 - smoothstep(clamp(d1 / 2.3))) + 0.3 * w3 * (1 - smoothstep(clamp(d3 / 6))));
    if (a < 0.012) continue;
    e.globalAlpha = a; e.beginPath(); e.arc(p.x, p.y, Math.max(0.8, 0.012 * p.s), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
}
function ring(e, cam, cx, cz, r, { alpha = 0.5, dash = [10, 9], width = 1.4, color = P.ink } = {}) {
  if (alpha <= 0.01 || r <= 0) return;
  e.save(); e.globalAlpha = alpha; e.strokeStyle = color; e.lineWidth = width; e.setLineDash(dash); floorCircle(e, cam, cx, cz, r); e.stroke(); e.restore();
}
function dust(e, cam, n, seed, box, t, { size = 2.2, alpha = 0.5 } = {}) {
  if (alpha <= 0.01) return;
  e.fillStyle = P.ink;
  for (let i = 0; i < n; i++) {
    // slow drift: each mote rises and sways on its own phase
    const ph = hash(i, seed + 5) * 6.28, dy = 0.06 * t + 0.03 * Math.sin(t * 0.9 + ph), dx = 0.04 * Math.sin(t * 0.7 + ph);
    const q = { x: lerp(box.x0, box.x1, hash(i, seed)) + dx, y: lerp(box.y0, box.y1, hash(i, seed + 1)) + dy, z: lerp(box.z0, box.z1, hash(i, seed + 2)) };
    const p = cam.project(q); if (!p) continue;
    e.globalAlpha = alpha * (0.25 + 0.75 * hash(i, seed + 3)); e.beginPath(); e.arc(p.x, p.y, size * (0.4 + hash(i, seed + 4)), 0, Math.PI * 2); e.fill();
  }
  e.globalAlpha = 1;
}
function label(e, text, x, y, { size = 20, color = P.ink, alpha = 0.55, align = 'left', track = 4, weight = 500, font = '"JetBrains Mono"' } = {}) {
  if (alpha <= 0.01) return;
  e.save(); e.globalAlpha = alpha; e.font = `${weight} ${size}px ${font}`; e.letterSpacing = `${track}px`; e.fillStyle = color; e.textAlign = align; e.fillText(text, x, y); e.restore();
}
function kicker(e, t) {
  const shots = [['01', 'THE CREATOR', 0, 1.5], ['02', 'CREATION MULTIPLIES', 1.5, 2.9], ['03', 'THE SYSTEM', 2.9, 9]];
  for (const [n, title, a, b] of shots) {
    const k = seg(t, a, a + 0.25) * (1 - seg(t, b - 0.2, b)); if (k <= 0) continue;
    const dy = (1 - ease.out3(seg(t, a, a + 0.3))) * 12;
    label(e, n, 80, 140 + dy, { size: 20, alpha: 0.9 * k });
    e.save(); e.globalAlpha = 0.35 * k; e.fillStyle = P.ink; e.fillRect(128, 133 + dy, 56 * ease.out3(seg(t, a, a + 0.4)), 1.5); e.restore();
    label(e, title, 200, 140 + dy, { size: 20, alpha: 0.55 * k });
  }
  label(e, 'QUIET BANDS · MOTION LAB', W - 80, 140, { size: 16, align: 'right', alpha: 0.3, track: 3 });
}
/** a creation in space: floor mark, tether, the panel; fog dims toward black; `dim` sends it to grey */
function placeCreation(e, cam, c, { dim = 0, tether = true, mark = true, scale = 1, alpha = 1 } = {}) {
  const p = cam.project({ x: c.x, y: 0, z: c.z }); if (!p || alpha <= 0.01) return;
  const fog = smoothstep(clamp((p.z - 6) / 26)), lift = (1 - fog * 0.88) * (1 - dim) * alpha;
  if (lift <= 0.02) return;
  if (mark && c.y > 0.12) { e.save(); e.globalAlpha = 0.35 * lift; e.strokeStyle = P.ink; e.lineWidth = 1.2; floorCircle(e, cam, c.x, c.z, c.w * 0.45 * scale, 0, 48); e.stroke(); e.restore(); }
  if (tether && c.y > 0.12) { const a = cam.project({ x: c.x, y: c.y, z: c.z }); if (a) { e.save(); e.globalAlpha = 0.3 * lift; e.strokeStyle = P.ink; e.lineWidth = 1; e.setLineDash([3, 5]); e.beginPath(); e.moveTo(p.x, p.y); e.lineTo(a.x, a.y); e.stroke(); e.restore(); } }
  panel(e, cam, { x: c.x, y: c.y, z: c.z }, c.w * scale, c.h * scale, c.yaw, (g, w, h, s) => creation(g, c.type, w, h, s, { ink: mix(P.bg, P.ink, lift), bg: P.bg, live: P.live }));
}
const depthOf = (cam, c) => cam.view({ x: c.x, y: c.y, z: c.z }).z;

/* ================= the frame ================= */
function draw(ctx, t) {
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  const n = L.tmp.getContext('2d'); n.setTransform(1, 0, 0, 1, 0, 0); n.clearRect(0, 0, W, H); let nearUsed = false;
  const cam = camAt(t);
  const bgG = ctx.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#040404'); bgG.addColorStop(0.55, '#0b0a09'); bgG.addColorStop(1, '#030303');
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

  const w1 = 1 - smoothstep(seg(t, 2.6, 3.5));                  // workstation light
  const w2 = smoothstep(seg(t, 1.3, 1.8)) * (1 - smoothstep(seg(t, 2.9, 3.5))); // first creation light
  const w3 = smoothstep(seg(t, 3.1, 3.9));                       // system light
  const brk = seg(t, T_BREAK, T_BREAK + 0.08), brkSettle = 1 - 0.45 * seg(t, T_BREAK + 0.1, T_BREAK + 0.6);

  /* ---- atmosphere (base) ---- */
  const pool = cam.project({ x: 0.15, y: 0, z: 0.05 }), poolR = cam.project({ x: 1.75, y: 0, z: 0.05 }), poolF = cam.project({ x: 0.15, y: 0, z: -1.1 });
  const head = cam.project({ x: FIG.x, y: 1.6, z: 0 });
  if (pool && poolR && poolF && w1 > 0) {
    if (head) glow(ctx, head.x + 120, head.y + 80, 760, 900, { alpha: 0.07 * w1 });
    cone(ctx, { x: pool.x - 40, y: -40 }, 220, pool, (poolR.x - pool.x) * 2.1, { alpha: 0.13 * w1, L });
    glow(ctx, pool.x, pool.y, poolR.x - pool.x, Math.max(10, (poolF.y - pool.y) * 1.05), { alpha: 0.2 * w1 });
  }
  const fc = cam.project({ x: FIRST.x, y: FIRST.y + FIRST.h / 2, z: FIRST.z }), fb = cam.project({ x: FIRST.x, y: 0, z: FIRST.z });
  if (fc && fb && w2 > 0) { glow(ctx, fc.x, fc.y, 620, 620, { alpha: 0.12 * w2 }); cone(ctx, { x: fc.x, y: -60 }, 180, fb, 520, { alpha: 0.11 * w2, L }); }
  const far = cam.project({ x: 3, y: 0, z: 22 });
  if (far) glow(ctx, far.x, far.y, 900, 260, { alpha: 0.07 * smoothstep(seg(t, 1.8, 2.6)) * (1 - w3) });
  const ctr = cam.project({ x: 2.6, y: 0, z: 17 });
  if (ctr && w3 > 0) { glow(ctx, ctr.x, ctr.y - 200, 900, 800, { alpha: 0.07 * w3 }); glow(ctx, ctr.x, ctr.y, 560, 220, { alpha: 0.12 * w3 }); cone(ctx, { x: ctr.x, y: -60 }, 200, ctr, 760, { alpha: 0.08 * w3, L }); }
  const bp = cam.project(GAP);
  if (bp && brk > 0) glow(ctx, bp.x, bp.y, 210 * (1 + 0.6 * (1 - brkSettle)), 70 * (1 + 0.6 * (1 - brkSettle)), { alpha: 0.3 * brk * brkSettle * 1.4, color: LIVE });

  /* ---- floor ---- */
  floorDots(e, cam, t, w1, w3);
  ring(e, cam, 0.15, 0.05, 1.55, { alpha: 0.42 * w1 });
  ring(e, cam, 0.15, 0.05, 2.25, { alpha: 0.18 * w1, dash: [3, 12] });
  if (w1 > 0.01) {
    e.save(); e.globalAlpha = w1; e.strokeStyle = `rgba(${INK},0.25)`; e.lineWidth = 1.2; e.setLineDash([16, 12]); path3(e, cam, [{ x: -6, y: 0, z: 2.2 }, { x: 7, y: 0, z: 2.2 }]); e.stroke(); e.restore();
    // floor ruler and height dimension: the measured world of shot 1 (fade with the pull-back)
    const rk = w1 * (1 - seg(t, 1.5, 2.0)), rz = -0.95;
    if (rk > 0.01) {
      e.save(); e.globalAlpha = rk; e.strokeStyle = `rgba(${INK},0.5)`; e.lineWidth = 1.2; path3(e, cam, [{ x: -0.7, y: 0, z: rz }, { x: 1.4, y: 0, z: rz }]); e.stroke();
      for (let i = 0; i <= 21; i++) { const x = -0.7 + i * 0.1, long = i % 5 === 0; path3(e, cam, [{ x, y: 0, z: rz }, { x, y: 0, z: rz - (long ? 0.09 : 0.04) }]); e.stroke(); if (long) { const p = cam.project({ x, y: 0, z: rz - 0.2 }); if (p) label(e, (i / 10).toFixed(1), p.x, p.y + 8, { size: 15, align: 'center', track: 1, alpha: 0.45 * rk }); } }
      e.restore();
      const d0 = cam.project({ x: -0.86, y: 0, z: 0 }), d1 = cam.project({ x: -0.86, y: 1.75, z: 0 });
      if (d0 && d1) {
        const grow = ease.out3(seg(t, 0.1, 0.7));
        const y1 = lerp(d0.y, d1.y, grow);
        e.save(); e.globalAlpha = rk; e.strokeStyle = `rgba(${INK},0.4)`; e.lineWidth = 1.2; e.beginPath(); e.moveTo(d0.x, d0.y); e.lineTo(d1.x, y1); e.moveTo(d0.x - 9, d0.y); e.lineTo(d0.x + 9, d0.y); e.moveTo(d1.x - 9, y1); e.lineTo(d1.x + 9, y1); e.stroke(); e.restore();
        e.save(); e.translate(d0.x - 16, (d0.y + d1.y) / 2); e.rotate(-Math.PI / 2); label(e, '1.75 M', 0, 0, { size: 15, align: 'center', track: 3, alpha: 0.45 * rk * grow }); e.restore();
      }
    }
  }
  // the field's sweep guide
  const gk = smoothstep(seg(t, 1.9, 2.5)) * (1 - w3);
  if (gk > 0.01) { e.save(); e.globalAlpha = gk; e.strokeStyle = `rgba(${INK},0.16)`; e.lineWidth = 1.2; e.setLineDash([2, 10]); path3(e, cam, Array.from({ length: 80 }, (_, i) => { const z = 1 + i * 0.5; return { x: spine(z), y: 0, z }; })); e.stroke(); e.restore(); }

  /* ---- links (on the floor, under the creations) ---- */
  LINKS.forEach(([ka, kb], li) => {
    const t0 = LINK_T[li], dk = N[ka].dim ? 0.5 : 0, pts = LINK_PTS[li];
    const draw = ease.inOut3(seg(t, t0, t0 + 0.32)); if (draw <= 0) return;
    const m = Math.max(2, Math.round(draw * (pts.length - 1)) + 1);
    const broken = li === BREAK && t >= T_BREAK;
    // the break: the middle of the link pulls apart from the gap outward
    const open = broken ? ease.out3(seg(t, T_BREAK, T_BREAK + 0.25)) : 0, g0 = Math.round(21 - 6 * open), g1 = Math.round(21 + 6 * open);
    const segs = broken ? [pts.slice(0, Math.min(m, g0 + 1)), m > g1 ? pts.slice(g1, m) : []] : [pts.slice(0, m)];
    for (const sg of segs) {
      if (sg.length < 2) continue;
      e.save(); e.globalAlpha = 1 - dk; e.strokeStyle = `rgba(${INK},0.92)`; e.lineWidth = 2.6; e.lineCap = 'round'; path3(e, cam, sg); e.stroke();
      e.strokeStyle = `rgba(${INK},0.22)`; e.lineWidth = 1; e.setLineDash([2, 7]); path3(e, cam, sg.map((q) => ({ ...q, x: q.x + 0.14 }))); e.stroke(); e.restore();
    }
    if (broken) for (const q of [pts[g0], pts[g1]]) { const p = cam.project(q); if (p) { e.fillStyle = P.live; e.beginPath(); e.arc(p.x, p.y, 6.5, 0, Math.PI * 2); e.fill(); } }
    // information in transit. After the break, B-E carries nothing and C-E carries the rerouted load (faster, denser).
    if (draw >= 1 && t > 3.95 && !(li === BREAK && t >= T_BREAK)) {
      const reroute = (ka === 'B' && kb === 'C') || (ka === 'C' && kb === 'E') ? seg(t, T_BREAK + 0.15, T_BREAK + 0.45) : 0;
      const per = 2 + Math.round(reroute), speed = 0.9 + 0.6 * reroute;
      for (let j = 0; j < per; j++) {
        const u = ((t - 3.95) * speed + j / per + hash(li, 3)) % 1, p = cam.project(pts[Math.round(u * (pts.length - 1))]);
        if (!p) continue;
        e.globalAlpha = (1 - dk) * Math.min(1, (t - 3.95) * 4); e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 5.5, 0, Math.PI * 2); e.fill(); e.globalAlpha = 1;
      }
    }
  });
  // the break marker: ring expands, a dashed outer ring, a short leader, one terse annotation
  if (brk > 0 && bp) {
    const k = ease.out5(seg(t, T_BREAK, T_BREAK + 0.3));
    ring(e, cam, GAP.x, GAP.z, 0.36 * k, { alpha: 1, dash: [], width: 2.2, color: P.live });
    ring(e, cam, GAP.x, GAP.z, 0.62 * ease.out3(seg(t, T_BREAK + 0.08, T_BREAK + 0.45)), { alpha: 0.55, dash: [3, 6], width: 2.2, color: P.live });
    const lk = ease.out3(seg(t, T_BREAK + 0.15, T_BREAK + 0.4)), tx = bp.x + 70, ty = bp.y + 150;
    e.save(); e.strokeStyle = `rgba(${LIVE},0.85)`; e.lineWidth = 1.3; e.beginPath(); e.moveTo(bp.x + 10, bp.y + 14); e.lineTo(lerp(bp.x + 10, tx, lk), lerp(bp.y + 14, ty, lk)); if (lk >= 1) e.lineTo(tx + 40, ty); e.stroke(); e.restore();
    const tc = Math.round(seg(t, T_BREAK + 0.22, T_BREAK + 0.42) * 11);
    label(e, 'LINK B–E'.slice(0, Math.min(8, tc)), tx + 50, ty - 6, { size: 18, color: P.live, alpha: 1, track: 3 });
    label(e, 'NO RESPONSE'.slice(0, Math.max(0, tc)), tx + 50, ty + 20, { size: 18, color: P.live, alpha: 0.7, track: 3 });
  }

  /* ---- creations, far to near ---- */
  const items = [];
  const dimField = smoothstep(seg(t, 3.2, 3.85));
  for (const c of FIELD) {
    if (t < c.born || c.node) continue;
    const k = ease.out5(seg(t, c.born, c.born + 0.55));
    // fly out of the first creation to its place, lifted on an arc
    const sx = FIRST.x, sy = FIRST.y + FIRST.h / 2, sz = FIRST.z;
    const pos = { ...c, x: lerp(sx, c.x, k), z: lerp(sz, c.z, k), y: lerp(sy, c.y, k) + Math.sin(k * Math.PI) * 0.6 };
    // selection: near the system, the unchosen sink through the floor; far ones stay, in grey
    let alpha = Math.min(1, seg(t, c.born, c.born + 0.15) * 1.5), dim = 0;
    if (c.z < 25) { const s = ease.in3(seg(t, 3.15 + hash(c.i, 8) * 0.3, 3.75 + hash(c.i, 8) * 0.3)); pos.y -= s * (c.y + c.h + 0.2); alpha *= 1 - s; }
    else dim = 0.74 * dimField;
    items.push({ c: pos, alpha, dim, scale: lerp(0.25, 1, k) });
  }
  for (const nd of SYSTEM) {
    const src = nd.from; if (nd.id !== 'A' && t < src.born) continue;
    const k = ease.inOut3(seg(t, nd.t0, nd.t1)), bornK = nd.id === 'A' ? 1 : ease.out5(seg(t, src.born, src.born + 0.55));
    const base = nd.id === 'A' ? null : { x: lerp(FIRST.x, src.x, bornK), z: lerp(FIRST.z, src.z, bornK), y: lerp(FIRST.y + FIRST.h / 2, src.y, bornK) + Math.sin(bornK * Math.PI) * 0.6 };
    if (nd.id === 'A' && t < 1.28) continue;
    let c;
    if (nd.id === 'A') {
      // the builder's own creation: rises out of the monitor (spring), hovers, then flies ahead into the field
      const r = ease.spring(seg(t, 1.28, 1.95), 0.78, 9), m = MONITOR;
      const hov = { x: lerp(m.x, FIRST.x, r), y: lerp(m.y - 0.1, FIRST.y, r), z: lerp(m.z, FIRST.z, r) };
      const sc = lerp(0.12, 1, r);
      c = { ...FIRST, x: lerp(hov.x, nd.x, k), y: lerp(hov.y, 0.06, k) + Math.sin(k * Math.PI) * 1.4, z: lerp(hov.z, nd.z, k), w: lerp(FIRST.w * sc, nd.w, k), h: lerp(FIRST.h * sc, nd.h, k), yaw: lerp(FIRST.yaw, nd.yaw, k), type: 'site' };
      items.push({ c, alpha: Math.min(1, seg(t, 1.28, 1.45) * 1.2), dim: 0, scale: 1, first: true, tether: false, mark: k > 0.9 });
    } else {
      c = { ...nd, x: lerp(base.x, nd.x, k), y: lerp(base.y, 0.06, k) + Math.sin(k * Math.PI) * 0.5, z: lerp(base.z, nd.z, k), w: lerp(src.w, nd.w, k), h: lerp(src.h, nd.h, k), yaw: lerp(src.yaw, nd.yaw, k), type: k < 0.5 ? src.type : nd.type };
      const flip = 1 - Math.abs(k - 0.5) * 2; // the type changes mid-flight; hide the swap in a brief shrink
      items.push({ c, alpha: Math.min(1, seg(t, src.born, src.born + 0.15) * 1.5), dim: (nd.dim ?? 0) * k + 0.4 * dimField * (1 - k) * (src.z > 25 ? 1 : 0), scale: lerp(0.25, 1, bornK) * (1 - 0.35 * flip * (k > 0 && k < 1)) });
    }
  }
  for (const c of NEAR) if (t >= c.born) items.push({ c, alpha: seg(t, c.born, c.born + 0.4), dim: 0, scale: 1, tether: false, mark: false });
  // painter's order by depth; very near items go to the out-of-focus layer
  items.forEach((it) => (it.d = depthOf(cam, it.c)));
  items.sort((a, b) => b.d - a.d);
  // the workstation and builder sit at depth ~ cam->desk; draw them in order with the creations
  const deskD = cam.view({ x: 0.4, y: 1, z: 0 }).z;
  let deskDrawn = false;
  const drawDesk = () => {
    if (deskDrawn) return; deskDrawn = true; if (deskD < 0.3) return;
    workstation(e, cam, { ink: P.ink, bg: P.bg, screen: 1 });
    billboard(e, cam, { x: FIG.x, y: 0, z: -0.02 }, (g, s) => figure(g, s, { ink: P.ink, bg: P.bg, pose: ease.inOut3(seg(t, 0.1, 0.5)) }));
    // the AI panel: prompt typed, answer builds; it folds away as the creation rises
    const pk = 1 - smoothstep(seg(t, 1.55, 2.0));
    if (pk > 0.01) {
      const a = cam.project({ x: 0.58, y: 1.64, z: -0.2 }), m = cam.project({ x: 0.88, y: 1.5, z: 0.25 });
      if (a && m) { e.save(); e.globalAlpha = pk * ease.out3(seg(t, 0.15, 0.4)); e.strokeStyle = `rgba(${INK},0.55)`; e.lineWidth = 1.3; e.setLineDash([5, 6]); e.beginPath(); e.moveTo(m.x, m.y); e.lineTo(a.x, a.y); e.stroke(); e.setLineDash([]); e.fillStyle = P.ink; e.beginPath(); e.arc(m.x, m.y, 4, 0, Math.PI * 2); e.fill(); e.restore(); }
      const prompt = 'build a booking site', tf = Math.round(t * 30) / 30;
      const typed = prompt.slice(0, Math.round(seg(tf, 0.42, 0.98) * prompt.length));
      const caret = tf < 1.0 ? 1 : (Math.floor(tf * 3.5) % 2 ? 0.25 : 1);
      e.save(); e.globalAlpha = pk * ease.out3(seg(t, 0.12, 0.35));
      panel(e, cam, { x: 0.96, y: 1.64 - 0.05 * (1 - ease.out3(seg(t, 0.12, 0.45))), z: -0.3 }, 0.84, 0.48, -0.28, (g, w, h, s) => aiPanel(g, w, h, s, { ink: P.ink, bg: P.bg, live: P.live, prompt: typed, caret, progress: ease.inOut3(seg(t, 1.0, 1.35)) }));
      e.restore();
    }
  };
  for (const it of items) {
    if (!deskDrawn && it.d < deskD) drawDesk();
    if (it.d < 0.25) continue;
    const near = it.d < 3.0;
    if (near) nearUsed = true;
    placeCreation(near ? n : e, cam, it.c, { dim: it.dim, alpha: it.alpha, scale: it.scale, tether: it.tether ?? true, mark: it.mark ?? true });
    if (it.first && t > 1.3 && t < 2.9) { // the light tether from the screen to the rising creation
      const m = cam.project({ x: 0.84, y: 1.45, z: 0.1 }), b = cam.project({ x: it.c.x, y: it.c.y, z: it.c.z });
      if (m && b) { e.save(); e.globalAlpha = 0.7 * seg(t, 1.3, 1.5) * (1 - seg(t, 2.7, 2.9)); e.strokeStyle = P.ink; e.lineWidth = 1.5; e.setLineDash([4, 6]); e.beginPath(); e.moveTo(m.x, m.y); e.lineTo(b.x, b.y); e.stroke(); e.restore(); }
    }
  }
  drawDesk();

  /* ---- scale callout: an upright marker on the floor that counts the copies ---- */
  const ck = smoothstep(seg(t, 1.8, 2.0)) * (1 - smoothstep(seg(t, 2.85, 3.1)));
  if (ck > 0.01) {
    const tf = Math.round(t * 30) / 30, born = FIELD.filter((c) => tf >= c.born).length / FIELD.length;
    const count = Math.max(1, Math.round(10 ** (4 * born)));
    const nice = count >= 10000 ? 10000 : count < 10 ? count : count < 100 ? Math.round(count / 5) * 5 : count < 1000 ? Math.round(count / 50) * 50 : Math.round(count / 500) * 500;
    const base = cam.project({ x: 2.75, y: 0, z: -1.1 });
    ring(e, cam, 1.95, -1.1, 0.32, { alpha: 0.5 * ck, dash: [3, 5] });
    e.save(); e.globalAlpha = ck;
    panel(e, cam, { x: 2.05, y: 0.1, z: -1.1 }, 1.3, 0.5, -0.12, (g, w, h, s) => {
      const px = (v) => v / s;
      g.fillStyle = P.ink; g.fillRect(0, h - px(1.5), w, px(1.5));
      g.fillRect(0, h - px(12), px(1.5), px(12)); g.fillRect(w - px(1.5), h - px(12), px(1.5), px(12));
      g.font = `800 ${px(78)}px "Inter Display"`; g.letterSpacing = `${px(-2)}px`; g.textBaseline = 'alphabetic';
      g.fillText('×' + nice.toLocaleString('en-US'), 0, h - px(26));
      g.font = `500 ${px(17)}px "JetBrains Mono"`; g.letterSpacing = `${px(4)}px`; g.globalAlpha = 0.55; g.fillText('COPIES', 0, h - px(110));
    });
    e.restore();
  }

  /* ---- headline (shot 1): supports, does not lead ---- */
  const hx = 1 - smoothstep(seg(t, 1.35, 1.65));
  if (hx > 0.01) {
    e.save(); e.font = '800 112px "Inter Display"'; e.letterSpacing = '-3px'; e.fillStyle = P.ink;
    [['Everybody', 330, 0.15], ['can build.', 444, 0.28]].forEach(([s, y, d]) => {
      const k = ease.out5(seg(t, d, d + 0.45));
      e.save(); e.beginPath(); e.rect(0, y - 110, W, 132); e.clip();
      e.globalAlpha = hx; e.fillText(s, 76, y + (1 - k) * 120 - (1 - hx) * 30); e.restore();
    });
    e.restore();
  }
  dust(e, cam, 140, 11, { x0: -1.2, x1: 1.6, y0: 0.3, y1: 3.2, z0: -0.6, z1: 0.8 }, t, { size: 2, alpha: 0.45 * w1 });
  dust(e, cam, 160, 21, { x0: -2, x1: 6, y0: 0.2, y1: 4, z0: -1, z1: 6 }, t, { size: 1.8, alpha: 0.35 * w2 });
  dust(e, cam, 150, 31, { x0: -0.5, x1: 5.5, y0: 0.2, y1: 4, z0: 11, z1: 22 }, t, { size: 2, alpha: 0.35 * w3 });
  kicker(e, t);

  /* ---- composite ---- */
  bloom(ctx, L);
  if (nearUsed) { ctx.save(); ctx.filter = 'blur(9px)'; ctx.globalAlpha = 0.85; ctx.drawImage(L.tmp, 0, 0); ctx.restore(); }
  // lens: a few soft out-of-focus motes that parallax against the camera
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = (hash(i, 41) * W + cam.pos.x * -260 * (0.5 + hash(i, 42))) % (W + 400) - 200, y = (hash(i, 43) * H + cam.pos.z * 60 * (0.5 + hash(i, 44))) % (H + 400) - 200;
    const r = 40 + hash(i, 45) * 80; ctx.filter = `blur(${r * 0.2}px)`; ctx.fillStyle = `rgba(${INK},${0.035 + 0.03 * hash(i, 46)})`; ctx.beginPath(); ctx.arc((x + W + 400) % (W + 400) - 200, (y + H + 400) % (H + 400) - 200, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  vignette(ctx, W, H);
  grain(ctx, L, Math.round(t * 30));
}

export default { width: W, height: H, fps: 30, duration: 5, palette: P, motionBlur: { samples: 4, shutter: 0.5 }, draw };
