// World kit (Film 003 onward): monumental architecture, a figure that can be seen from any side, the money beacon,
// flows along paths, and a look-at camera. Everything is deterministic and works with the 2.5D camera in space.js.
import { clamp, lerp, ease, smoothstep } from './math.js';
import { cam3, path3 } from './space.js';
import { human } from './humans.js';
import { mix } from './color.js';

/* ---------------- camera ---------------- */
/** A camera at `pos` looking at `tgt` (positive pitch looks down). */
export function lookAt(W, H, pos, tgt, f = 1600) {
  const dx = tgt.x - pos.x, dy = tgt.y - pos.y, dz = tgt.z - pos.z;
  return cam3({ W, H, pos, yaw: Math.atan2(dx, dz), pitch: Math.atan2(-dy, Math.hypot(dx, dz)), f });
}
export const v3 = (x, y, z) => ({ x, y, z });
export const lerp3 = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });

/* ---------------- paths ---------------- */
/** Arc-length table for a polyline (floor or 3D). */
export function track(pts) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, (pts[i].y ?? 0) - (pts[i - 1].y ?? 0), pts[i].z - pts[i - 1].z));
  return { pts, L, len: L[L.length - 1] };
}
/** Point (and heading) at distance fraction u along a track. */
export function at(tr, u) {
  const d = clamp(u) * tr.len; let i = 1; while (i < tr.L.length - 1 && tr.L[i] < d) i++;
  const a = tr.pts[i - 1], b = tr.pts[i], k = tr.L[i] === tr.L[i - 1] ? 0 : (d - tr.L[i - 1]) / (tr.L[i] - tr.L[i - 1]);
  return { x: lerp(a.x, b.x, k), y: lerp(a.y ?? 0, b.y ?? 0, k), z: lerp(a.z, b.z, k), hx: b.x - a.x, hz: b.z - a.z };
}
/** Sub-polyline between fractions u0..u1 (for drawing a path being laid, or a moving segment). */
export function part(tr, u0, u1, n = 40) { const out = []; for (let i = 0; i <= n; i++) out.push(at(tr, lerp(u0, u1, i / n))); return out; }
/** Rounded floor path through corner points (quadratic fillets of radius r). */
export function fillet(pts, r = 0.8, n = 8) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1], la = Math.hypot(b.x - a.x, b.z - a.z), lc = Math.hypot(c.x - b.x, c.z - b.z), rr = Math.min(r, la / 2, lc / 2);
    const p0 = { x: b.x - (b.x - a.x) / la * rr, y: 0, z: b.z - (b.z - a.z) / la * rr }, p1 = { x: b.x + (c.x - b.x) / lc * rr, y: 0, z: b.z + (c.z - b.z) / lc * rr };
    for (let k = 0; k <= n; k++) { const u = k / n, v = 1 - u; out.push({ x: v * v * p0.x + 2 * u * v * b.x + u * u * p1.x, y: 0, z: v * v * p0.z + 2 * u * v * b.z + u * u * p1.z }); }
  }
  out.push(pts[pts.length - 1]); return out;
}
/** A raised arc between two points (for transfers through the air). */
export function arc3(a, b, lift = 1, n = 32) { return Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return { x: lerp(a.x, b.x, u), y: lerp(a.y ?? 0, b.y ?? 0, u) + lift * Math.sin(Math.PI * u), z: lerp(a.z, b.z, u) }; }); }

/** Stroke a polyline in space. */
export function line3(e, cam, pts, { color, width = 1.5, alpha = 1, dash = null, cap = 'round' } = {}) {
  if (alpha <= 0.01 || pts.length < 2) return;
  e.save(); e.globalAlpha *= alpha; e.strokeStyle = color; e.lineWidth = width; e.lineCap = cap; e.lineJoin = 'round'; if (dash) e.setLineDash(dash); path3(e, cam, pts); e.stroke(); e.restore();
}
/** A pulse travelling along a track: a bright head with a fading tail. */
export function pulse(e, cam, tr, u, { color, len = 0.12, width = 3, alpha = 1, head = 6 } = {}) {
  if (alpha <= 0.01 || u <= 0 || u >= 1.0 + len) return;
  const segs = 10;
  for (let i = 0; i < segs; i++) { const a = u - len * (i + 1) / segs, b = u - len * i / segs; if (b <= 0) continue; line3(e, cam, part(tr, Math.max(0, a), Math.min(1, b), 4), { color, width: width * (1 - i / segs * 0.6), alpha: alpha * (1 - i / segs) }); }
  if (u <= 1) { const p = cam.project(at(tr, u)); if (p) { e.save(); e.globalAlpha *= alpha; e.fillStyle = color; e.beginPath(); e.arc(p.x, p.y, head, 0, Math.PI * 2); e.fill(); e.restore(); } }
}

/* ---------------- architecture ---------------- */
const F = (x0, x1, y0, y1, z0, z1) => ({
  top: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], bottom: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
  front: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], back: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
  left: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], right: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]],
});
function poly(e, cam, q) { e.beginPath(); let ok = true; q.forEach(([x, y, z], i) => { const p = cam.project({ x, y, z }); if (!p) { ok = false; return; } i ? e.lineTo(p.x, p.y) : e.moveTo(p.x, p.y); }); e.closePath(); return ok; }
/** A solid box seen from any side: only the faces turned to the camera, lit top / sides / ends. b = {x, z, w, d, h, y0} */
export function solid(e, cam, b, { top, side, end, edge, line = 1.1, alpha = 1 } = {}) {
  if (alpha <= 0.01) return;
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, y0 = b.y0 ?? 0, y1 = y0 + b.h, c = cam.pos, f = F(x0, x1, y0, y1, z0, z1), faces = [];
  if (c.z < z0) faces.push([end, f.front]); if (c.z > z1) faces.push([end, f.back]);
  if (c.x < x0) faces.push([side, f.left]); if (c.x > x1) faces.push([side, f.right]);
  if (c.y > y1) faces.push([top, f.top]); if (c.y < y0) faces.push([side, f.bottom]);
  e.save(); e.globalAlpha *= alpha; e.lineJoin = 'round';
  for (const [fill, q] of faces) { if (!poly(e, cam, q)) continue; if (fill) { e.fillStyle = fill; e.fill(); } if (edge) { e.strokeStyle = edge; e.lineWidth = line; e.stroke(); } }
  e.restore();
}
/** Wireframe box: the fine architectural linework (edges only). */
export function wire(e, cam, b, { color, width = 1, alpha = 1, rungs = 0 } = {}) {
  if (alpha <= 0.01) return;
  const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, y0 = b.y0 ?? 0, y1 = y0 + b.h;
  const E = [[[x0, y0, z0], [x0, y1, z0]], [[x1, y0, z0], [x1, y1, z0]], [[x0, y0, z1], [x0, y1, z1]], [[x1, y0, z1], [x1, y1, z1]],
    [[x0, y1, z0], [x1, y1, z0]], [[x1, y1, z0], [x1, y1, z1]], [[x1, y1, z1], [x0, y1, z1]], [[x0, y1, z1], [x0, y1, z0]],
    [[x0, y0, z0], [x1, y0, z0]], [[x1, y0, z0], [x1, y0, z1]], [[x1, y0, z1], [x0, y0, z1]], [[x0, y0, z1], [x0, y0, z0]]];
  for (let r = 1; r <= rungs; r++) { const y = y0 + (y1 - y0) * r / (rungs + 1); E.push([[x0, y, z0], [x1, y, z0]], [[x0, y, z1], [x1, y, z1]], [[x0, y, z0], [x0, y, z1]], [[x1, y, z0], [x1, y, z1]]); }
  e.save(); e.globalAlpha *= alpha; e.strokeStyle = color; e.lineWidth = width; e.beginPath();
  for (const [a, b2] of E) { const p = cam.project({ x: a[0], y: a[1], z: a[2] }), q = cam.project({ x: b2[0], y: b2[1], z: b2[2] }); if (p && q) { e.moveTo(p.x, p.y); e.lineTo(q.x, q.y); } }
  e.stroke(); e.restore();
}
/** Long soft shadow on the floor from `foot`, cast away from a light at `light` (floor coords). */
export function shadow(e, cam, foot, light, { len = 3, w = 0.45, alpha = 0.6 } = {}) {
  const dx = foot.x - light.x, dz = foot.z - light.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, px = -uz, pz = ux;
  const q = [[foot.x + px * w / 2, 0, foot.z + pz * w / 2], [foot.x + ux * len + px * w * 0.9, 0, foot.z + uz * len + pz * w * 0.9], [foot.x + ux * len - px * w * 0.9, 0, foot.z + uz * len - pz * w * 0.9], [foot.x - px * w / 2, 0, foot.z - pz * w / 2]];
  const a = cam.project(foot), b = cam.project({ x: foot.x + ux * len, y: 0, z: foot.z + uz * len }); if (!a || !b) return;
  e.save(); const g = e.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(1, 'rgba(0,0,0,0)'); e.fillStyle = g; if (poly(e, cam, q)) e.fill(); e.restore();
}

/* ---------------- characters ---------------- */
const pill = (c, x0, y0, x1, y1, w, st) => { c.strokeStyle = st; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
/**
 * The luminous figure seen from behind (or the front: there is no face). run 0..1 blends standing into a run;
 * phase is the stride (radians). Same proportions as humans.js: 1.75 m, head disc, capsule torso, pill limbs.
 */
export function figureBack(c, s, P, { phase = 0, run = 0, light = 1, lean = 0 } = {}) {
  const front = mix(P.bg, P.ink, light), back = mix(P.bg, P.ink, 0.62 * light + 0.12), far = mix(P.bg, P.ink2, 0.75 * light + 0.05);
  const g = c.createLinearGradient(-0.17, 0, 0.17, 0); g.addColorStop(0, back); g.addColorStop(0.55, front); g.addColorStop(1, back);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const bob = run * 0.035 * Math.abs(Math.sin(phase)), hip = -0.9 + bob * -1, top = hip - 0.64;
  // legs: alternate lift (the foot rises and shortens as it swings forward, away from us)
  for (const side of [-1, 1]) {
    const ph = phase + (side > 0 ? Math.PI : 0), lift = run * Math.max(0, Math.sin(ph)), x = side * 0.065;
    const foot = -0.03 - lift * 0.3, knee = { x: x + side * 0.01, y: lerp(hip, foot, 0.5) - lift * 0.12 };
    pill(c, x, hip, knee.x, knee.y, 0.115, side < 0 ? far : g); pill(c, knee.x, knee.y, x, foot, 0.1, side < 0 ? far : g);
  }
  c.save(); c.translate(0, hip); c.rotate(lean); c.translate(0, -hip);
  // arms swing opposite the legs
  for (const side of [-1, 1]) {
    const sw = run * Math.sin(phase + (side > 0 ? 0 : Math.PI)), sh = { x: side * 0.17, y: top + 0.13 };
    const el = { x: side * (0.21 + 0.03 * run), y: sh.y + 0.26 - 0.06 * run * Math.max(0, sw) }, hd = { x: side * (0.2 + 0.02 * run), y: el.y + 0.24 - 0.18 * run * (0.5 + 0.5 * sw) };
    pill(c, sh.x, sh.y, el.x, el.y, 0.058, side < 0 ? far : back); pill(c, el.x, el.y, hd.x, hd.y, 0.052, side < 0 ? far : back);
  }
  c.fillStyle = g; c.beginPath(); c.roundRect(-0.15, top, 0.3, 0.64, 0.15); c.fill();
  const hg = c.createRadialGradient(0.02, top - 0.15, 0.015, 0, top - 0.123, 0.13); hg.addColorStop(0, front); hg.addColorStop(1, mix(back, front, 0.55));
  c.fillStyle = hg; c.beginPath(); c.arc(0, top - 0.123, 0.098, 0, Math.PI * 2); c.fill();
  c.restore();
}
/**
 * The figure placed in the world facing (hx, hz), drawn correctly for the camera: from behind or in front it is the
 * symmetric back view; side-on it is the profile from humans.js. view = angle between its heading and the camera's.
 */
export function figure(e, cam, pos, { hx = 0, hz = 1, phase = 0, run = 0, light = 1, alpha = 1, look = 0, reach = 0, lean = 0.04 } = {}) {
  const p = cam.project({ x: pos.x, y: 0, z: pos.z }); if (!p || alpha <= 0.01) return;
  // heading relative to the camera's view direction
  const vx = pos.x - cam.pos.x, vz = pos.z - cam.pos.z, rel = Math.atan2(hx * vz - hz * vx, hx * vx + hz * vz);  // 0: walking away from us
  const side = Math.abs(Math.sin(rel)), prof = smoothstep(clamp((side - 0.55) / 0.3)), flip = Math.sin(rel) > 0;
  e.save(); e.translate(p.x, p.y); e.scale(p.s, p.s);
  if (prof < 1) { e.globalAlpha = alpha * (1 - prof); figureBack(e, p.s, PAL, { phase, run, light, lean: 0 }); }
  if (prof > 0) { e.globalAlpha = alpha * prof; if (!flip) e.scale(-1, 1); human(e, p.s, { P: PAL, pose: 'stand', lean: lean + 0.1 * run, look, reach: reach + 0.3 * run, light }); }
  e.restore();
}
let PAL; export const setWorldPalette = (P) => { PAL = P; };

/** The money: an orange disc with a cut-out $, a thin outer ring. Billboard space, centred at (0, -r). */
export function coin(c, s, P, { r = 0.3, spin = 0 } = {}) {
  const sx = Math.max(0.12, Math.abs(Math.cos(spin)));
  c.save(); c.translate(0, -r); c.scale(sx, 1);
  c.fillStyle = P.live; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = P.bg; c.lineWidth = r * 0.06; c.beginPath(); c.arc(0, 0, r * 0.8, 0, Math.PI * 2); c.stroke();
  c.fillStyle = P.bg; c.font = `800 ${r * 1.05}px "Inter Display"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, r * 0.05);
  c.restore();
}
