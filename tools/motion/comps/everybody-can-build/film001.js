// FILM 001: EVERYBODY CAN BUILD (AI & the creative economy). The full film after the approved opening.
// This comp renders t = 5.0 s -> end; the delivered film splices it onto the approved opening MP4 at 5.0 s.
// At t = 5 it reproduces the opening's last frame (same world via openingWorld, same camera), so the cut is invisible.
// Every beat is timed from the narration (films/001-everybody-can-build/timeline.json), not the other way round.
//
//  1 IDEA          0-7.4   (opening) title holds, then leaves as the camera starts to move
//  2 EVERYONE      7.4-16.4  dashed "team" appears around the creator and dissolves: one person, one prompt;
//                            a store and a small business join the creations; the camera pulls back on dozens of creators
//  3 THE FLOOD     16.4-23.2 every creator's screen fills the world; hundreds of near-identical things; a live count
//  4 THE PROBLEM   23.2-30.2 one impressive creation; a customer comes, finds no way in, leaves; "problems solved 0"
//  5 CONNECTION    30.2-42.4 another creation is followed to a customer with a need: request -> business -> workflow ->
//                            person -> confirmation; orange only when the loop closes
//  6 DISTINCTION   42.4-48.0 pull back: a grey crowd of disconnected things vs one small working loop
//  7 QUIET BANDS   48.0-end  the loop draws together into a point; the actual mark and wordmark; BUILD WHAT MATTERS.
import { clamp, hash, smoothstep, lerp, seg, ease } from '../../engine/math.js';
import { cam3, panel, billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, halo, cone, glow, vignette, grain } from '../../engine/light.js';
import { human, chair, deskSeated, bulb } from '../../engine/humans.js';
import { place, machine, SIZE } from '../../engine/environments.js';
import { box3 } from '../../engine/illustrations.js';
import { PALETTES, mix } from '../../engine/color.js';
import { setPalette, P, floorDots, mono } from './film-keys.js';
import { coverType, loadBrand, lockup } from './cover.js';
import { openingWorld, openingCam, SCR_MID } from './cover-open.js';

const W = 1080, H = 1920, FPS = 30, T0 = 5;
let L, TL, B, MARK, WORD, WARP;
/** current narration time -> the choreography's time (piecewise linear through warp.json anchors) */
const unwarp = (t) => { if (!WARP) return t; let i = 0; while (i < WARP.length - 2 && t > WARP[i + 1][1]) i++; const [o0, n0] = WARP[i], [o1, n1] = WARP[i + 1]; return o0 + (o1 - o0) * Math.min(1, Math.max(0, (t - n0) / (n1 - n0))); };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');

/* ======================= the world ======================= */
const ORIGIN_SCREEN = { x: 0.65, y: 1.06, z: 0.07 };
const H_ITEM = { id: 'hero', type: 'site', x: 6.3, y: 1.32, z: 14.2, w: 1.5, h: 1.05, yaw: -0.04 };
const CARD = { id: 'card', type: 'site', x: 8.4, y: 1.55, z: 12.9, w: 0.82, h: 0.57, yaw: 0.1 };
const SYS = {
  cust: { x: 10.45, z: 15.5 }, store: { type: 'store', x: 12.3, y: 0, z: 15.9, w: 1.3, h: 1.27, yaw: -0.08 },
  cardAt: { x: 12.3, y: 1.74, z: 15.9 }, mach: { x: 14.0, z: 18.7 }, emp: { x: 11.0, z: 19.6 },
  ctr: { x: 12.25, y: 0.6, z: 17.6 },
};
// clear zones: nothing else stands where the two vignettes are staged
const clearH = (x, z) => x > 2.6 && x < 9.8 && z > 7.5 && z < 16.4;
const clearS = (x, z) => x > 8.2 && x < 16.6 && z > 11.5 && z < 22.5;
// other creators: same workstation, everywhere
const CREATORS = [];
for (let i = 0; i < 400 && CREATORS.length < 30; i++) {
  const x = -15 + hash(i, 101) * 33, z = 3.2 + hash(i, 102) * 40;
  if (Math.hypot(x - 0.3, z) < 5 || clearH(x, z) || clearS(x, z)) continue;
  if (CREATORS.some((c) => Math.hypot(c.x - x, (c.z - z) * 0.8) < 4.2)) continue;
  CREATORS.push({ i, x, z, d: Math.hypot(x, z) });
}
const DMAX = Math.max(...CREATORS.map((c) => c.d));
const DIGITAL = ['site', 'app', 'course'], GROUND = ['store', 'building'];
// the flood: each creator's screen produces its own things, nearly the same as everyone else's
const ITEMS = [];
const mkItem = (base, j, k, src, born) => {
  const ground = hash(j, 7) < 0.3, type = ground ? GROUND[Math.floor(hash(j, 8) * 2)] : DIGITAL[Math.floor(hash(j, 8) * 3)];
  const [w, h] = SIZE[type], sc = 0.8 + hash(j, 9) * 0.4, a = hash(j, 10) * Math.PI * 2, r = 1.3 + hash(j, 11) * 2.2;
  return { id: `f${j}`, type, x: base.x + Math.cos(a) * r, z: base.z + 0.8 + Math.sin(a) * r * 0.8, y: ground ? 0 : 0.9 + hash(j, 12) * 2.1, w: w * sc, h: h * sc, yaw: (hash(j, 13) - 0.5) * 0.5, src, born, travel: 0.55 };
};
let j = 0;
for (const c of CREATORS) {
  const k = 6 + Math.floor(hash(c.i, 14) * 5), src = { x: c.x + 0.65, y: 1.06, z: c.z + 0.07 };
  for (let m = 0; m < k; m++, j++) {
    const it = mkItem(c, j, m, src, 16.7 + 3.6 * (c.d / DMAX) ** 0.8 + m * 0.11 + hash(j, 15) * 0.2);
    if (clearH(it.x, it.z) || clearS(it.x, it.z)) continue;
    ITEMS.push(it);
  }
}
// the horizon: more of the same, too far to see where they came from
for (let m = 0; m < 170; m++, j++) {
  const z = 44 + hash(j, 20) * 34, x = -22 + hash(j, 21) * 50, ground = hash(j, 22) < 0.35;
  const type = ground ? GROUND[Math.floor(hash(j, 23) * 2)] : DIGITAL[Math.floor(hash(j, 23) * 3)], [w, h] = SIZE[type];
  ITEMS.push({ id: `h${m}`, type, x, z, y: ground ? 0 : 1 + hash(j, 24) * 3, w, h, yaw: 0, born: 18.6 + hash(j, 25) * 2.6, travel: 0, far: true });
}
// the creator's own next two: a storefront and a small business, from the same prompt
const OWN = [
  { id: 'store0', type: 'store', x: 2.15, y: 0, z: 2.7, w: 1.15, h: 1.13, yaw: -0.15, src: ORIGIN_SCREEN, born: 10.35, travel: 0.7 },
  { id: 'bldg0', type: 'building', x: -1.85, y: 0, z: 3.2, w: 0.9, h: 1.3, yaw: 0.15, src: ORIGIN_SCREEN, born: 10.6, travel: 0.7 },
];
ITEMS.push(...OWN, { ...H_ITEM, src: { x: 4.9 + 0.65, y: 1.06, z: 10.6 }, born: 18.1, travel: 0.6 }, { ...CARD, src: { x: 4.9 + 0.65, y: 1.06, z: 10.6 }, born: 18.5, travel: 0.6 });
// the "team" it used to take: dashed outlines, behind and around the creator
const TEAM = [[-2.25, 1.9], [-1.45, 2.35], [-0.55, 2.55], [0.45, 2.6], [1.4, 2.35], [2.2, 1.95]].map(([x, z], k) => ({ x, z, k }));

/* ======================= camera ======================= */
// keys: [time, pos, pitch, f]. Moves ease between keys; a key may repeat to hold.
function keys() {
  const o = openingCam(5);
  return [
    [5.0, o.pos, -0.03, 1650],
    [7.3, { x: 0.42, y: 1.07, z: -5.32 }, -0.03, 1650],                 // the opening's drift, continued
    [9.7, { x: 0.36, y: 1.1, z: -5.75 }, -0.01, 1650],                  // ease back to include the team
    [11.9, { x: 0.36, y: 1.12, z: -5.6 }, -0.01, 1650],
    [16.2, { x: 1.6, y: 3.6, z: -15.5 }, 0.1, 1650],                    // pull back: the others appear
    [22.9, { x: 2.6, y: 6.2, z: -15.2 }, 0.27, 1600],                   // rise over it: the flood
    [25.0, { x: 6.0, y: 2.0, z: 7.9 }, 0.22, 1650],                     // dive to one creation
    [30.2, { x: 5.85, y: 2.02, z: 8.25 }, 0.22, 1650],
    [32.8, { x: 11.95, y: 3.9, z: 10.4 }, 0.38, 1550],                 // follow another
    [42.3, { x: 12.0, y: 3.95, z: 10.75 }, 0.38, 1550],
    [44.7, { x: 8.5, y: 7.5, z: -4.0 }, 0.33, 1500],                    // the distinction
    [47.7, { x: 8.6, y: 7.6, z: -4.3 }, 0.33, 1500],
    [49.3, { x: 12.25, y: 9.0, z: 4.5 }, 0.6, 1500],                    // centre the loop as it draws in
    [99, { x: 12.25, y: 9.0, z: 4.5 }, 0.6, 1500],
  ];
}
let KEYS;
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [ta, pa, ka, fa] = KEYS[i], [tb, pb, kb, fb] = KEYS[i + 1];
  // long moves get quintic in-out (they read as one gesture); holds are linear drifts
  const still = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z) < 0.6;
  const k = still ? seg(t, ta, tb) : ease.inOut5(seg(t, ta, tb));
  const pos = { x: lerp(pa.x, pb.x, k), y: lerp(pa.y, pb.y, k), z: lerp(pa.z, pb.z, k) };
  // the dive from the flood arcs over the field instead of cutting through it
  if (ta === 22.9) pos.y += Math.sin(k * Math.PI) * 2.2;
  return cam3({ W, H, pos, pitch: lerp(ka, kb, k), f: lerp(fa, fb, k) });
}

/* ======================= helpers ======================= */
const quad = (a, c, b) => (u) => { const v = 1 - u; return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y, z: v * v * a.z + 2 * u * v * c.z + u * u * b.z }; };
const arcFrom = (src, dst, lift = 1.2) => quad(src, { x: (src.x + dst.x) / 2, y: Math.max(src.y, dst.y) + lift, z: (src.z + dst.z) / 2 }, dst);
const tone = (cam, it, k = 1) => { const p = cam.view({ x: it.x, y: 0, z: it.z }); return (1 - 0.7 * smoothstep(clamp((p.z - 12) / 46))) * k; };
const near = (d) => smoothstep(clamp((d - 1.1) / 2.4));           // nothing slabs past the lens
function ghost(ctx, s, P, a) {                                    // a dashed outline figure: someone who is not there
  ctx.save(); ctx.globalAlpha *= a * 0.85; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.3 / s; ctx.setLineDash([7 / s, 6 / s]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0.03, -1.615, 0.098, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-0.15, -1.54, 0.3, 0.64, 0.15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.04, -0.88); ctx.lineTo(-0.06, -0.05); ctx.moveTo(0.06, -0.88); ctx.lineTo(0.08, -0.05); ctx.stroke();
  ctx.restore();
}
function walker(ctx, s, P, { flip = false, step = 0, look = 0, light = 1 }) {
  ctx.save(); if (flip) ctx.scale(-1, 1); ctx.translate(0, -0.012 * Math.abs(Math.sin(step * Math.PI)));
  human(ctx, s, { P, pose: 'stand', reach: 0.15, lean: 0.03, look, light }); ctx.restore();
}
function otherCreator(e, cam, c, a) {
  if (a <= 0.01) return;
  e.save(); e.globalAlpha = a;
  billboard(e, cam, { x: c.x - 0.38, y: 0, z: c.z + 0.04 }, (g, s) => chair(g, s, { P }));
  deskSeated(e, cam, { P, x0: c.x - 0.05, z0: c.z, lines: 3 });
  billboard(e, cam, { x: c.x - 0.38, y: 0, z: c.z }, (g, s) => human(g, s, { P, pose: 'sit', reach: 1, lean: 0.1, light: 0.92 }));
  e.restore();
}
/** a moving token (request, coin, confirmation) along a floor path, floating at y */
const along = (pts, u, y = 0.3) => { const f = clamp(u) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i; return { x: lerp(pts[i].x, pts[i + 1].x, k), y, z: lerp(pts[i].z, pts[i + 1].z, k) }; };
const floorCurve = (a, b, bend = 0.12, n = 48) => Array.from({ length: n + 1 }, (_, k) => { const u = k / n, mx = (a.x + b.x) / 2 + (b.z - a.z) * bend, mz = (a.z + b.z) / 2 - (b.x - a.x) * bend; return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y: 0, z: (1 - u) ** 2 * a.z + 2 * u * (1 - u) * mz + u * u * b.z }; });
// the working loop: customer -> business -> workflow -> person -> back to the customer
const LOOP = [
  floorCurve({ x: SYS.cust.x + 0.35, z: SYS.cust.z }, { x: SYS.store.x - 0.75, z: SYS.store.z }, -0.12),
  floorCurve({ x: SYS.store.x + 0.5, z: SYS.store.z + 0.45 }, { x: SYS.mach.x - 1.45, z: SYS.mach.z - 0.25 }, 0.1),
  floorCurve({ x: SYS.mach.x - 0.5, z: SYS.mach.z + 0.45 }, { x: SYS.emp.x + 0.6, z: SYS.emp.z }, 0.08),
  floorCurve({ x: SYS.emp.x - 0.35, z: SYS.emp.z - 0.4 }, { x: SYS.cust.x + 0.05, z: SYS.cust.z + 0.45 }, 0.1),
];

/* ======================= the frame ======================= */
function draw(ctx, tNow) {
  const t = unwarp(tNow);
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H); e.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000000'); g.addColorStop(0.55, '#08080A'); g.addColorStop(1, '#000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = camAt(t), tf = Math.round(t * FPS) / FPS, LIVE = rgb(P.live);
  B.served = null;
  const end = 48.0;                                               // the loop starts drawing together
  const worldFade = 1 - smoothstep(seg(t, end + 0.1, end + 1.2)); // everything but the loop leaves for the logo
  const sel = smoothstep(seg(t, B.s4, B.s4 + 0.9));               // the crowd steps back
  const s5 = smoothstep(seg(t, B.s5 + 1.6, B.s5 + 2.6));

  /* ---------- atmosphere ---------- */
  const fieldGlow = smoothstep(seg(t, 15.2, 18.5)) * (1 - sel * 0.6) * worldFade;
  const fc = cam.project({ x: 3, y: 0, z: 22 });
  if (fc && fieldGlow > 0) glow(ctx, fc.x, fc.y - 120, 1000, 380, { alpha: 0.07 * fieldGlow });
  const hp = cam.project({ x: H_ITEM.x, y: H_ITEM.y + 0.5, z: H_ITEM.z }), hb = cam.project({ x: H_ITEM.x, y: 0, z: H_ITEM.z });
  const hk = smoothstep(seg(t, B.s4 + 0.4, B.s4 + 1.4)) * (1 - smoothstep(seg(t, B.s5 + 0.4, B.s5 + 1.6)));
  if (hp && hb && hk > 0) { glow(ctx, hp.x, hp.y, 520, 520, { alpha: 0.1 * hk }); cone(ctx, { x: hp.x, y: -60 }, 180, hb, 620, { alpha: 0.09 * hk, L, blur: 40 }); }
  const sp = cam.project({ x: SYS.ctr.x, y: 0, z: SYS.ctr.z });
  const sk = s5 * worldFade + (t > end ? 0 : 0);
  if (sp && sk > 0) { glow(ctx, sp.x, sp.y - 140, 760, 560, { alpha: 0.08 * sk }); cone(ctx, { x: sp.x, y: -60 }, 220, sp, 820, { alpha: 0.07 * sk, L, blur: 40 }); }

  /* ---------- floor: the opening's grid, extended (the new part fades in so 5.0 s matches the opening) ---------- */
  {
    const ext = smoothstep(seg(t, 5.2, 9.0)) * worldFade, base = worldFade;
    e.fillStyle = P.tech;
    const step = 0.32;
    for (let z = -3; z <= 78; z += step) {
      // past 18 m use a coarser lattice (it is all fog-thinned anyway); keeps the same phase as the opening near the desk
      const st = z > 18 ? step * 2 : step; if (z > 18 && Math.round((z + 3) / step) % 2) continue;
      for (let x = -26; x <= 34; x += st) {
        const inOld = x >= -7 && x <= 11 && z <= 18; const a0 = inOld ? base : ext; if (a0 <= 0.01) continue;
        const p = cam.project({ x, y: 0, z }); if (!p || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
        const fog = 1 - smoothstep(clamp((p.z - 3) / 30)), d = Math.hypot(x - 0.1, z - 0.2);
        const pS = 1 - smoothstep(clamp(Math.hypot(x - SYS.ctr.x, z - SYS.ctr.z) / 4.5)), pH = 1 - smoothstep(clamp(Math.hypot(x - H_ITEM.x, z - H_ITEM.z) / 3));
        const a = fog * (0.1 + 0.6 * (1 - smoothstep(clamp(d / 2.4))) + 0.3 * pS * s5 + 0.25 * pH * hk) * a0;
        if (a < 0.015) continue;
        e.globalAlpha = Math.min(1, a); e.beginPath(); e.arc(p.x, p.y, Math.max(0.9, 0.011 * p.s), 0, Math.PI * 2); e.fill();
      }
    }
    e.globalAlpha = 1;
    // scale, in the flood: a 10 m bar on the floor
    const bk = smoothstep(seg(t, 17.2, 18.2)) * (1 - smoothstep(seg(t, 22.6, 23.2)));
    if (bk > 0.01) {
      const z = 6, x0 = -4, x1 = 6;
      e.save(); e.globalAlpha = bk; e.strokeStyle = P.ink2; e.lineWidth = 1.3; path3(e, cam, [{ x: x0, y: 0, z }, { x: x1, y: 0, z }]); e.stroke();
      for (let i = 0; i <= 10; i++) path3(e, cam, [{ x: x0 + i, y: 0, z }, { x: x0 + i, y: 0, z: z - (i % 5 ? 0.25 : 0.55) }]), e.stroke();
      e.restore();
      const a = cam.project({ x: x0, y: 0, z: z - 1.1 }), b = cam.project({ x: x1, y: 0, z: z - 1.1 });
      if (a && b) { mono(e, '0', a.x, a.y, { size: 16, align: 'center', alpha: bk }); mono(e, '10 M', b.x, b.y, { size: 16, align: 'center', alpha: bk }); }
    }
  }

  /* ---------- collect everything that stands, then paint far to near ---------- */
  const D = [];
  const push = (d, fn) => D.push({ d, fn });
  const deskD = cam.view({ x: 0.4, y: 0.8, z: 0 }).z;

  // creations
  for (const it of ITEMS) {
    if (tf < it.born) continue;
    let k = it.travel ? ease.out5(seg(t, it.born, it.born + it.travel)) : 1, alpha = it.travel ? Math.min(1, seg(t, it.born, it.born + 0.14) * 2) : smoothstep(seg(t, it.born, it.born + 0.8));
    let pos = { ...it }, sc = it.travel ? lerp(0.18, 1, k) : 1, tn = tone(cam, it);
    if (it.travel) { const c = arcFrom(it.src, { x: it.x, y: it.y + it.h * 0.5, z: it.z }, 1.1)(k); pos.x = c.x; pos.z = c.z; pos.y = c.y - it.h * 0.5 * sc; }
    const isH = it.id === 'hero', isCard = it.id === 'card', own = it.id === 'store0' || it.id === 'bldg0';
    // selection: the crowd recedes to grey; whatever stands in front of the two vignettes steps aside
    if (!isH && !isCard) {
      const inFront = (it.x > 2.4 && it.x < 10.5 && it.z < 14.6 && it.z > 6) || (it.x > 8 && it.x < 17 && it.z < 22.5 && it.z > 9);
      if (inFront) { const s = ease.in3(seg(t, B.s4 - 0.3 + hash(it.born * 97, 3) * 0.3, B.s4 + 0.45 + hash(it.born * 97, 3) * 0.3)); pos.y -= s * (it.y + it.h + 0.3); alpha *= 1 - s; }
      else tn = lerp(tn, tone(cam, it, 0.34), sel);
    }
    if (isH) tn = lerp(tn, 1, hk) * (1 - 0.55 * s5);
    if (isCard) {
      // followed: it leaves the crowd and flies to the business that needs it
      const fk = ease.inOut3(seg(t, B.s5 + 0.15, B.s5 + 2.3));
      if (fk > 0) { const c = arcFrom({ x: CARD.x, y: CARD.y, z: CARD.z }, SYS.cardAt, 0.9)(fk); pos = { ...pos, ...c }; tn = lerp(tone(cam, it, 0.34), 1, smoothstep(seg(t, B.s5, B.s5 + 0.5))); }
      else if (sel > 0) tn = lerp(tn, tone(cam, it, 0.34), sel);
    }
    if (it.far) tn *= 0.75;
    const conv = seg(t, end, end + 1.1);
    alpha *= (isCard ? 1 - smoothstep(conv) : worldFade);
    if (isCard && conv > 0) { const c = ease.inOut3(conv); pos.x = lerp(pos.x, SYS.ctr.x, c); pos.y = lerp(pos.y, SYS.ctr.y, c); pos.z = lerp(pos.z, SYS.ctr.z, c); sc *= 1 - c; }
    if (alpha <= 0.01 || sc <= 0.01) continue;
    const d = cam.view({ x: pos.x, y: pos.y + pos.h * 0.5, z: pos.z }).z; if (d < 0.6) continue;
    alpha *= near(d); if (alpha <= 0.01) continue;
    { const k6 = smoothstep(seg(t, 42.4, 44.2)); if (k6 > 0) { const q = cam.project({ x: pos.x, y: pos.y, z: pos.z }); if (q) alpha *= 1 - k6 * smoothstep(clamp((q.y - 1150) / 140)); } }
    if (alpha <= 0.01) continue;
    const showPath = it.travel && !it.far && k < 1 && !isCard && (own || hash(it.born * 31, 5) < 0.45);
    const P2 = { ...pos, w: it.w * sc, h: it.h * sc };
    push(d, () => {
      if (showPath) { const curve = arcFrom(it.src, { x: it.x, y: it.y + it.h * 0.5, z: it.z }, 1.1); e.save(); e.globalAlpha = 0.5 * alpha * tn; e.strokeStyle = P.ink2; e.lineWidth = 1.2; e.lineCap = 'round'; e.setLineDash([0.1, 6]); path3(e, cam, Array.from({ length: 31 }, (_, q) => curve((q / 30) * k))); e.stroke(); e.restore(); }
      e.save(); e.globalAlpha = alpha; place(e, cam, P2, { P, tone: tn, mark: k > 0.85 && !it.far, tether: k > 0.85 && !it.far }); e.restore();
    });
  }

  // the team that used to be needed: dashed, there for a breath, then gone
  for (const m of TEAM) {
    const a = smoothstep(seg(t, 7.5 + m.k * 0.13, 7.95 + m.k * 0.13)) * (1 - smoothstep(seg(t, 9.62 + m.k * 0.06, 10.2 + m.k * 0.06)));
    if (a <= 0.01) continue;
    const rise = 0.18 * smoothstep(seg(t, 9.62 + m.k * 0.06, 10.2 + m.k * 0.06));
    push(cam.view({ x: m.x, y: 0.9, z: m.z }).z, () => billboard(e, cam, { x: m.x, y: rise, z: m.z }, (g2, s) => ghost(g2, s, P, a)));
  }

  // everyone else, at their own desks
  for (const c of CREATORS) {
    const a = smoothstep(seg(t, 12.35 + 3.0 * (c.d / DMAX) ** 0.9, 12.95 + 3.0 * (c.d / DMAX) ** 0.9)) * lerp(1, 0.45, sel) * worldFade;
    if (a <= 0.01) continue;
    const d = cam.view({ x: c.x + 0.4, y: 0.8, z: c.z }).z; if (d < 0.8) continue;
    let a2 = a * near(d) * (1 - 0.8 * smoothstep(clamp((d - 12) / 30)));
    { const k6 = smoothstep(seg(t, 42.4, 44.2)); const q = cam.project({ x: c.x, y: 0, z: c.z }); if (k6 > 0 && q) a2 *= 1 - k6 * smoothstep(clamp((q.y - 1150) / 140)); }
    push(d, () => {
      otherCreator(e, cam, c, a2);
      const bk = smoothstep(seg(t, 13.0 + 3.0 * (c.d / DMAX) ** 0.9, 13.5 + 3.0 * (c.d / DMAX) ** 0.9)) * (1 - sel * 0.7);
      if (bk > 0.01) { e.save(); e.globalAlpha = a2 * bk; billboard(e, cam, { x: c.x - 0.31, y: 1.64, z: c.z }, (g2, s) => bulb(g2, s, { P, glow: 0.7 })); e.restore(); }
    });
  }

  // vignette 4: the customer who finds no way in
  {
    const t1 = B.s4 + 0.85, arrive = t1 + 1.6, tryA = arrive + 0.15, turn = tryA + 1.25, gone = turn + 2.1;
    const k1 = ease.inOut3(seg(t, t1, arrive)), k2 = ease.inOut3(seg(t, turn + 0.15, gone));
    const x = k2 > 0 ? lerp(5.3, 2.4, k2) : lerp(3.2, 5.3, k1), a = smoothstep(seg(t, t1, t1 + 0.4)) * (1 - smoothstep(seg(t, gone - 0.7, gone)));
    const walking = (t > t1 && t < arrive) || (t > turn + 0.15 && t < gone);
    if (a > 0.01) {
      const zc = 13.35;
      push(cam.view({ x, y: 0.9, z: zc }).z, () => {
        e.save(); e.globalAlpha = a;
        e.strokeStyle = P.tech; e.lineWidth = 1.2; floorCircle(e, cam, x, zc, 0.36); e.stroke();
        billboard(e, cam, { x, y: 0, z: zc }, (g2, s) => walker(g2, s, P, { flip: t > turn, step: walking ? t * 2.2 : 0, look: t > tryA && t < turn ? 0.8 : 0 }));
        e.restore();
        // the attempt: a dotted reach toward the creation that stops short, and fades
        const rk = ease.out3(seg(t, tryA, tryA + 0.55)) * (1 - smoothstep(seg(t, turn - 0.2, turn + 0.25)));
        if (rk > 0.01) {
          const from = { x: 5.45, y: 1.45, z: zc }, to = { x: H_ITEM.x - H_ITEM.w / 2 + 0.05, y: H_ITEM.y + 0.2, z: H_ITEM.z }, u = 0.62 * rk;
          const pts = Array.from({ length: 24 }, (_, q) => { const v = (q / 23) * u; return { x: lerp(from.x, to.x, v), y: lerp(from.y, to.y, v) + Math.sin(v * Math.PI) * 0.15, z: lerp(from.z, to.z, v) }; });
          e.save(); e.globalAlpha = rk; e.strokeStyle = P.ink2; e.lineWidth = 1.5; e.lineCap = 'round'; e.setLineDash([0.1, 7]); path3(e, cam, pts); e.stroke();
          const tip = cam.project(pts[pts.length - 1]); if (tip) { e.setLineDash([]); e.beginPath(); e.arc(tip.x, tip.y, 4, 0, Math.PI * 2); e.stroke(); }
          e.restore();
        }
      });
    }
    // under the creation: a measure of what it actually did
    const mk = hk;
    if (mk > 0.01) push(cam.view({ x: H_ITEM.x, y: 1.0, z: H_ITEM.z }).z - 0.01, () => {
      e.save(); e.globalAlpha = mk;
      panel(e, cam, { x: H_ITEM.x, y: H_ITEM.y - 0.3, z: H_ITEM.z }, 1.3, 0.2, H_ITEM.yaw, (c2, w, h, s) => {
        const px = (v) => v / s;
        c2.fillStyle = P.tech; c2.fillRect(0, h - px(2), w, px(2));
        const fill = 0.32 * ease.out3(seg(t, tryA + 0.1, tryA + 0.45)) * (1 - ease.inOut3(seg(t, tryA + 0.55, tryA + 1.05)));
        c2.fillStyle = P.ink; c2.fillRect(0, h - px(3), w * fill, px(4));
        c2.font = `500 ${px(15)}px "JetBrains Mono"`; c2.letterSpacing = `${px(3)}px`; c2.fillStyle = P.ink2; c2.fillText('PROBLEMS SOLVED', 0, h - px(14));
        c2.textAlign = 'right'; c2.fillStyle = P.ink; c2.font = `700 ${px(22)}px "JetBrains Mono"`; c2.fillText('0', w, h - px(12));
      });
      e.restore();
    });
  }

  // vignette 5: the working loop
  {
    const t5 = B.s5, build = smoothstep(seg(t, t5 + 2.2, t5 + 3.2)), conv = ease.inOut3(seg(t, end, end + 1.1));
    const C = (p, y = 0) => conv > 0 ? { x: lerp(p.x, SYS.ctr.x, conv), y: lerp(y, SYS.ctr.y, conv), z: lerp(p.z, SYS.ctr.z, conv) } : { x: p.x, y, z: p.z };
    const sc = 1 - conv;
    if (build > 0.01 && sc > 0.01) {
      const b = B.need, req = [b, b + 0.95], wf = [B.use, B.use + 0.75], hand = [B.use + 1.2, B.use + 1.65], conf = [B.pay - 0.5, B.pay + 0.2], coin = [B.pay + 0.45, B.pay + 1.15];
      const closed = smoothstep(seg(t, conf[1], conf[1] + 0.25));
      // the paths: cream when built; orange once the loop has delivered (and only then)
      const pathA = (i) => smoothstep(seg(t, t5 + 2.6 + i * 0.18, t5 + 3.1 + i * 0.18));
      for (let i = 0; i < 4; i++) {
        const k = pathA(i); if (k <= 0) continue;
        const pts = LOOP[i].slice(0, Math.max(2, Math.round(k * LOOP[i].length))).map((q) => C(q));
        const lit = closed * (1 - 0.35 * smoothstep(seg(t, conf[1] + 0.3, conf[1] + 1.2)));
        push(cam.view(LOOP[i][Math.floor(LOOP[i].length / 2)]).z + 3, () => {
          e.save(); e.globalAlpha = sc; e.lineCap = 'round';
          e.strokeStyle = mix(P.ink, P.live, lit); e.lineWidth = 2.6 + 0.8 * lit; path3(e, cam, pts); e.stroke();
          e.strokeStyle = P.tech; e.lineWidth = 1; e.setLineDash([2, 7]); path3(e, cam, pts.map((q) => ({ ...q, x: q.x + 0.13 }))); e.stroke();
          e.restore();
        });
      }
      // the people and the places
      const aCust = build, aMach = smoothstep(seg(t, t5 + 2.4, t5 + 3.3)), aEmp = smoothstep(seg(t, t5 + 2.55, t5 + 3.4));
      const custP = C(SYS.cust), empP = C(SYS.emp);
      push(cam.view({ x: custP.x, y: 0.9, z: custP.z }).z, () => {
        e.save(); e.globalAlpha = aCust * sc; e.strokeStyle = closed > 0 ? mix(P.tech, P.live, closed) : P.tech; e.lineWidth = 1.2; floorCircle(e, cam, custP.x, custP.z, 0.42 * sc); e.stroke(); e.restore();
        e.save(); e.globalAlpha = aCust * sc; billboard(e, cam, { x: custP.x, y: custP.y, z: custP.z }, (g2, s) => { g2.scale(sc, sc); human(g2, s * sc, { P, pose: 'stand', reach: 0.3 + 0.4 * ease.out3(seg(t, b - 0.3, b)) * (1 - ease.out3(seg(t, b + 0.4, b + 0.8))), lean: 0.03 }); }); e.restore();
      });
      push(cam.view({ x: SYS.store.x, y: 0.6, z: SYS.store.z }).z, () => { e.save(); e.globalAlpha = build * sc; place(e, cam, { ...SYS.store, ...C(SYS.store), w: SYS.store.w * sc, h: SYS.store.h * sc }, { P, tone: 1 }); e.restore(); });
      push(cam.view({ x: SYS.mach.x, y: 0.6, z: SYS.mach.z }).z, () => {
        if (conv > 0.6) return;
        e.save(); e.globalAlpha = aMach * (1 - smoothstep(seg(conv, 0, 0.6))); const run = t > wf[1] && t < wf[1] + 0.9 ? (t - wf[1]) * 1.4 : (t > coin[1] ? (t - coin[1]) * 0.5 : null);
        machine(e, cam, { P, x: SYS.mach.x, z: SYS.mach.z, items: run, tone: 0.9 }); e.restore();
      });
      push(cam.view({ x: empP.x, y: 0.9, z: empP.z }).z, () => {
        e.save(); e.globalAlpha = aEmp * sc;
        billboard(e, cam, { x: empP.x, y: empP.y, z: empP.z + 0.05 }, (g2, s) => { g2.scale(-sc, sc); human(g2, s * sc, { P, pose: 'stand', reach: ease.inOut3(seg(t, hand[0], hand[1])) * (1 - ease.inOut3(seg(t, hand[1] + 0.5, hand[1] + 0.9))), lean: 0.05 }); });
        if (conv < 0.3) box3(e, cam, [SYS.emp.x - 1.15, SYS.emp.x - 0.35], [0, 0.8], [SYS.emp.z - 0.2, SYS.emp.z + 0.2], { top: P.ink, front: mix(P.bg, P.ink2, 0.45), side: mix(P.bg, P.ink2, 0.22), edge: P.ink2, line: 1.1 });
        e.restore();
      });
      // labels: what each part is
      const lk = smoothstep(seg(t, t5 + 3.0, t5 + 3.6)) * (1 - smoothstep(seg(t, 44.0, 45.0)));
      // labels sit above each part (the lower third belongs to the captions)
      if (lk > 0.01) for (const [x, y, z, n, name] of [[SYS.cust.x, 2.1, SYS.cust.z, '01', 'REQUEST'], [SYS.store.x + 0.75, 1.45, SYS.store.z, '02', 'BUSINESS'], [SYS.mach.x, 1.45, SYS.mach.z, '03', 'WORKFLOW'], [SYS.emp.x, 2.1, SYS.emp.z, '04', 'DONE']]) {
        const p0 = cam.project({ x, y, z }); if (!p0) continue;
        push(0.5, () => { mono(e, n, p0.x, p0.y - 34, { size: 15, align: 'center', color: P.tech, track: 2, alpha: lk }); mono(e, name, p0.x, p0.y - 12, { size: 15, align: 'center', color: P.ink2, track: 4, alpha: lk }); });
      }
      // what moves: a request, the work, the person, the confirmation, the payment; then it keeps going
      const token = (pts, u, kind, a = 1) => {
        const q = along(pts, u, kind === 'coin' ? 0.22 : 0.32), pos = C(q, q.y);
        push(cam.view(pos).z - 0.05, () => {
          e.save(); e.globalAlpha = a * sc;
          if (kind === 'conf') panel(e, cam, { x: pos.x, y: pos.y, z: pos.z }, 0.42, 0.42, 0, (c2, w, h, s) => { thingCal(c2, w, h, s); });
          else billboard(e, cam, pos, (g2, s) => {
            g2.fillStyle = P.ink; g2.strokeStyle = P.bg; g2.lineWidth = 1.6 / s;
            if (kind === 'coin') { g2.beginPath(); g2.arc(0, -0.08, 0.08, 0, Math.PI * 2); g2.fill(); g2.beginPath(); g2.arc(0, -0.08, 0.05, 0, Math.PI * 2); g2.stroke(); }
            else { g2.beginPath(); g2.roundRect(-0.12, -0.2, 0.24, 0.17, 0.02); g2.fill(); g2.fillStyle = P.bg; g2.fillRect(-0.08, -0.16, 0.12, 0.016); g2.fillRect(-0.08, -0.12, 0.08, 0.016); }
          });
          e.restore();
        });
      };
      const thingCal = (c2, w, h, s) => { const px = (v) => v / s; c2.fillStyle = P.ink; c2.beginPath(); c2.roundRect(0, 0, w, h, 0.03); c2.fill(); c2.strokeStyle = P.bg; c2.lineWidth = px(4); c2.lineCap = 'round'; c2.beginPath(); c2.moveTo(w * 0.28, h * 0.52); c2.lineTo(w * 0.44, h * 0.68); c2.lineTo(w * 0.74, h * 0.32); c2.stroke(); };
      if (t > req[0] && t < req[1] + 0.1) token(LOOP[0], ease.inOut3(seg(t, req[0], req[1])), 'req');
      if (t > wf[0] && t < wf[1] + 0.05) token(LOOP[1], ease.inOut3(seg(t, wf[0], wf[1])), 'req');
      if (t > wf[1] + 0.85 && t < hand[0] + 0.1) token(LOOP[2], ease.inOut3(seg(t, wf[1] + 0.85, hand[0])), 'req');
      if (t > conf[0] && t < conf[1] + 0.6) token(LOOP[3], ease.inOut3(seg(t, conf[0], conf[1])), 'conf', 1 - smoothstep(seg(t, conf[1] + 0.2, conf[1] + 0.6)));
      if (t > coin[0] && t < coin[1] + 0.1) token(LOOP[0], ease.inOut3(seg(t, coin[0], coin[1])), 'coin');
      // after the first delivery the loop simply runs: requests and confirmations keep moving
      if (t > coin[1]) for (let q = 0; q < 4; q++) for (let r = 0; r < 2; r++) {
        const u = ((t - coin[1]) * 0.42 + r * 0.5 + q * 0.13) % 1;
        token(LOOP[q], u, q === 3 ? 'coin' : 'req', smoothstep(seg(t, coin[1], coin[1] + 0.5)) * (1 - smoothstep(seg(u, 0.88, 1))) * smoothstep(seg(u, 0, 0.08)));
      }
      // the confirmation stays with the customer for a moment: done
      const held = smoothstep(seg(t, conf[1], conf[1] + 0.2)) * (1 - smoothstep(seg(t, conf[1] + 1.4, conf[1] + 1.8)));
      if (held > 0.01) push(cam.view({ x: SYS.cust.x, y: 2, z: SYS.cust.z }).z - 0.1, () => { e.save(); e.globalAlpha = held * sc; panel(e, cam, C({ x: SYS.cust.x + 0.05, z: SYS.cust.z }, 2.0), 0.44, 0.44, 0, (c2, w, h, s) => thingCal(c2, w, h, s)); e.restore(); });
      // served: counts real deliveries in this scene
      B.served = t < conf[1] ? 0 : 1 + Math.max(0, Math.floor((tf - coin[1]) / (1 / 0.42)));
    }
    // the point the loop becomes
    const pk = smoothstep(seg(t, end + 0.75, end + 1.2)) * (1 - smoothstep(seg(t, end + 1.5, end + 2.1)));
    if (pk > 0.01) { const p = cam.project(SYS.ctr); if (p) { glow(ctx, p.x, p.y, 220, 220, { alpha: 0.5 * pk }); push(0.1, () => { e.save(); e.globalAlpha = pk; e.fillStyle = P.ink; e.beginPath(); e.arc(p.x, p.y, 9 * (1 - 0.4 * conv) + 3, 0, Math.PI * 2); e.fill(); e.restore(); }); } }
  }

  // paint: far things first, the opening's desk group in its place, then whatever is nearer than the desk
  D.sort((a, b) => b.d - a.d);
  let deskDone = deskD < 1.2;
  for (const x of D) {
    if (!deskDone && x.d < deskD) { openingWorld(ctx, e, t, cam, { noFloor: true }); deskDone = true; e.globalAlpha = 1; }
    x.fn();
  }
  if (!deskDone) openingWorld(ctx, e, t, cam, { noFloor: true });

  halo(ctx, L);

  /* ---------- typography (crisp, after the glow) ---------- */
  // the opening's title holds, then leaves as the camera starts to move
  const ta = 1 - smoothstep(seg(t, 6.95, 7.45));
  if (ta > 0.01) { ctx.save(); ctx.globalAlpha = ta; coverType(ctx); ctx.restore(); }
  const stmt = (lines, y0, a, { size = 112, color = P.ink, rise = 0 } = {}) => {
    if (a <= 0.01) return;
    ctx.save(); ctx.font = `800 ${size}px "Inter Display"`; ctx.letterSpacing = '0px';
    lines.forEach(([txt, col], i) => { const y = y0 + i * size * 1.02; ctx.save(); ctx.beginPath(); ctx.rect(0, y - size, W, size * 1.24); ctx.clip(); ctx.fillStyle = col ?? color; ctx.globalAlpha = a; ctx.fillText(txt, 72, y + (1 - ease.out5(clamp(rise * 1.5 - i * 0.3))) * size * 1.1); ctx.restore(); });
    ctx.restore();
  };
  const kick = (txt, y, a) => { if (a <= 0.01) return; mono(ctx, txt, 80, y, { size: 20, color: P.ink2, track: 5, alpha: a }); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.tech; ctx.fillRect(80, y + 18, 44, 1.5); ctx.restore(); };
  // 3: the line the flood earns
  { const r = seg(t, B.flood, B.flood + 0.7), a = 1 - smoothstep(seg(t, B.s4 - 0.3, B.s4 + 0.2)); if (r > 0) { kick('02 — THE FLOOD', 250, a * smoothstep(r)); stmt([['BUILDING ISN’T'], ['THE ADVANTAGE.']], 400, a, { rise: r }); } }
  // live count of the flood
  { const ck = smoothstep(seg(t, 16.9, 17.6)) * (1 - smoothstep(seg(t, B.s4 - 0.2, B.s4 + 0.3)));
    if (ck > 0.01) { const n = ITEMS.filter((it) => tf >= it.born + 0.1).length + 5; mono(ctx, 'CREATIONS IN VIEW', W - 80, 1290, { size: 16, color: P.tech, align: 'right', alpha: ck }); ctx.save(); ctx.globalAlpha = ck; ctx.font = '800 64px "Inter Display"'; ctx.fontVariantNumeric = 'tabular-nums'; ctx.textAlign = 'right'; ctx.fillStyle = P.ink2; ctx.fillText(n.toLocaleString('en-US'), W - 74, 1360); ctx.restore(); } }
  // "one person, one prompt": two hairline annotations on the creator
  { const ak = smoothstep(seg(t, 9.9, 10.4)) * (1 - smoothstep(seg(t, 12.0, 12.5)));
    if (ak > 0.01) {
      const hd = camAt(t).project({ x: -0.33, y: 1.75, z: 0 }), sc2 = camAt(t).project({ x: 0.66, y: 1.32, z: 0.07 });
      for (const [p, label, dx, dy] of [[hd, '1 PERSON', -150, -120], [sc2, '1 PROMPT', 150, -170]]) {
        if (!p) continue; const ex = p.x + dx, ey = p.y + dy;
        ctx.save(); ctx.globalAlpha = ak; ctx.strokeStyle = P.ink2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ex, ey); ctx.lineTo(ex + (dx < 0 ? -40 : 40), ey); ctx.stroke(); ctx.fillStyle = P.ink2; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        mono(ctx, label, ex + (dx < 0 ? -48 : 48), ey + 6, { size: 18, color: P.ink, align: dx < 0 ? 'right' : 'left', alpha: ak });
      }
    } }
  // served counter during the loop
  { const sk2 = smoothstep(seg(t, B.pay - 0.4, B.pay)) * (1 - smoothstep(seg(t, 44.2, 45.0)));
    if (sk2 > 0.01 && B.served != null) { mono(ctx, 'PROBLEMS SOLVED', W - 80, 1290, { size: 16, color: P.tech, align: 'right', alpha: sk2 }); ctx.save(); ctx.globalAlpha = sk2; ctx.font = '800 64px "Inter Display"'; ctx.fontVariantNumeric = 'tabular-nums'; ctx.textAlign = 'right'; ctx.fillStyle = B.served > 0 ? P.live : P.ink2; ctx.fillText(String(B.served), W - 74, 1360); ctx.restore(); } }
  // 6: the distinction
  { const r1 = seg(t, B.l11a, B.l11a + 0.7), r2 = seg(t, B.l11b, B.l11b + 0.7), a = 1 - smoothstep(seg(t, end - 0.2, end + 0.4));
    if (r1 > 0) { kick('06 — THE DISTINCTION', 250, a * smoothstep(r1)); stmt([['AI CHANGED WHO'], ['GETS TO BUILD.']], 390, a, { size: 96, rise: r1 }); }
    if (r2 > 0) stmt([['IT DIDN’T CHANGE'], ['WHY PEOPLE BUY.', P.live]], 610, a, { size: 96, rise: r2 }); }
  // 7: the mark, then the wordmark, then the line
  { const mk = smoothstep(seg(t, end + 1.25, end + 1.95)), wk = smoothstep(seg(t, end + 1.75, end + 2.35)), lk = seg(t, B.l12b - 0.1, B.l12b + 0.5);
    if (mk > 0.01) {
      const markH = 150, s = lerp(0.94, 1, ease.out3(mk)), mw = markH * 823 / 658;
      ctx.save(); ctx.globalAlpha = mk; ctx.fillStyle = P.ink; ctx.translate(W / 2, 830); ctx.scale(s, s); ctx.translate(-mw / 2, -markH / 2); ctx.scale(markH / 658, markH / 658); ctx.fill(MARK); ctx.restore();
    }
    if (wk > 0.01) { const wh = 54, ww = wh * 845 / 155; ctx.save(); ctx.globalAlpha = wk; ctx.fillStyle = P.ink; ctx.translate(W / 2 - ww / 2, 985 + 8 * (1 - ease.out3(wk))); ctx.scale(wh / 155, wh / 155); ctx.fill(WORD); ctx.restore(); }
    if (lk > 0) { ctx.save(); ctx.font = '800 60px "Inter Display"'; ctx.letterSpacing = '1px'; ctx.textAlign = 'center'; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.rect(0, 1100, W, 90); ctx.clip(); ctx.globalAlpha = smoothstep(lk); ctx.fillText('BUILD WHAT MATTERS.', W / 2, 1160 + (1 - ease.out5(clamp(lk * 1.4))) * 70); ctx.restore(); }
  }

  vignette(ctx, W, H, { amount: 0.66 });
  grain(ctx, L, Math.round(t * FPS));
}

async function load() {
  await loadBrand();
  // choreographed against timeline_v1 (the first narration); warp.json maps the current narration's clock onto it
  TL = await (await fetch('/tools/motion/films/001-everybody-can-build/timeline_v1.json')).json();
  const TLnow = await (await fetch('/tools/motion/films/001-everybody-can-build/timeline.json')).json();
  WARP = await (await fetch('/tools/motion/films/001-everybody-can-build/warp.json')).json();
  const l = (n) => TL.lines[n - 1];
  B = {
    s4: l(7).at, s5: l(8).at, flood: l(6).pauses[0][1],
    need: l(10).at, use: l(10).pauses[1][1], pay: l(10).pauses[2][1],
    l11a: l(11).at, l11b: l(11).pauses[0][1], l12b: l(12).pauses[0][1],
    end: TL.total,
  };
  KEYS = keys();
  const pathOf = async (u) => new Path2D((await (await fetch(u)).text()).match(/ d="([^"]+)"/)[1]);
  MARK = await pathOf('/assets/brand/mark.svg'); WORD = await pathOf('/assets/brand/wordmark.svg');
  comp.duration = TLnow.total;
}

const comp = { width: W, height: H, fps: FPS, duration: 55, start: T0, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load, draw };
export default comp;
