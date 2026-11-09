// Vector object construction. Every object is drawn from parameters, never from bitmaps, so it stays sharp at
// any camera zoom and can morph continuously. Line weights are given in *screen* pixels: a hairline stays a
// hairline whether the camera is at 10x or 1x.
import { clamp, lerp } from './math.js';

/** Rounded-rect path centred at 0,0. r is 0..1 of the half-size (1 = circle). */
export function roundRect(ctx, w, h, r) {
  const rr = Math.min(w, h) / 2 * clamp(r);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, rr);
}

/**
 * The unit object ("a thing someone built"): a thin-line tile that can morph toward a dot or a filled cell.
 *  size   on-screen size in px            round  0 square .. 1 circle
 *  fill   0 outline .. 1 solid            trim   0..1 draw-on of the outline (stroke reveal)
 *  detail 0..1 interior UI detail (only legible when large: fades by on-screen size)
 */
export function tile(ctx, x, y, size, o = {}) {
  const { round = 0.28, fill = 0, rot = 0, line = 1.6, color = '#F6F4EE', alpha = 1, trim = 1, detail = 0, accent, dash = 0 } = o;
  if (alpha <= 0.002 || size < 0.2) return;
  ctx.save();
  ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = line; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  roundRect(ctx, size, size, round);
  if (fill > 0) { ctx.globalAlpha = alpha * fill; ctx.fill(); ctx.globalAlpha = alpha; }
  if (fill < 1 && size > line * 1.5) {
    // dash 1 = an idea (not yet real); as it falls to 0 the gaps close and the outline becomes solid (built)
    if (dash > 0) { const seg = Math.max(2, size * 0.06); ctx.setLineDash([seg, seg * 0.9 * dash]); }
    else if (trim < 1) { const L = size * 4.2; ctx.setLineDash([L * trim, L]); ctx.lineDashOffset = L * 0.125; }
    if (trim > 0) ctx.stroke();
    ctx.setLineDash([]);
  }
  // interior detail: a title bar and one control. Legibility-gated so it dissolves as the object becomes one of many.
  const d = detail * clamp((size - 34) / 50);
  if (d > 0.01) {
    ctx.globalAlpha = alpha * d;
    const s = size / 2, lw = Math.max(1, line * 0.85);
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(-s, -s * 0.52); ctx.lineTo(s, -s * 0.52); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-s * 0.72 + i * s * 0.17, -s * 0.76, s * 0.045, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.18); ctx.lineTo(s * 0.4, -s * 0.18); ctx.moveTo(-s * 0.6, s * 0.06); ctx.lineTo(s * 0.1, s * 0.06); ctx.stroke();
    // one live control (the accent): sits alone in the lower right, clear of the text lines
    ctx.strokeStyle = accent ?? color; ctx.translate(s * 0.38, s * 0.52);
    roundRect(ctx, s * 0.5, s * 0.24, 1); ctx.stroke();
  }
  ctx.restore();
}

/** Sample a closed shape to n points (unit size, centred). Used for morphing one outline into another. */
export function shapePoints(kind, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = i / n, a = u * Math.PI * 2 - Math.PI / 2;
    if (kind === 'circle') pts.push({ x: Math.cos(a) / 2, y: Math.sin(a) / 2 });
    else if (kind === 'square') { const s = u * 4, side = Math.floor(s), f = s - side; const P = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5], [-.5, -.5]]; pts.push({ x: lerp(P[side][0], P[side + 1][0], f), y: lerp(P[side][1], P[side + 1][1], f) }); }
    else if (kind === 'triangle') { const s = u * 3, side = Math.floor(s), f = s - side; const P = [[0, -.5], [.5, .4], [-.5, .4], [0, -.5]]; pts.push({ x: lerp(P[side][0], P[side + 1][0], f), y: lerp(P[side][1], P[side + 1][1], f) }); }
    else if (kind === 'diamond') { const s = u * 4, side = Math.floor(s), f = s - side; const P = [[0, -.5], [.5, 0], [0, .5], [-.5, 0], [0, -.5]]; pts.push({ x: lerp(P[side][0], P[side + 1][0], f), y: lerp(P[side][1], P[side + 1][1], f) }); }
  }
  return pts;
}
export const morphPoints = (a, b, k) => a.map((p, i) => ({ x: lerp(p.x, b[i].x, k), y: lerp(p.y, b[i].y, k) }));
export function strokePoints(ctx, pts, x, y, size, { line = 1.6, color = '#F6F4EE', alpha = 1, closed = true } = {}) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = line; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + p.x * size, y + p.y * size)); if (closed) ctx.closePath(); ctx.stroke(); ctx.restore();
}

/** A hairline between two screen points with optional draw-on (0..1). */
export function hairline(ctx, a, b, { line = 1.2, color = '#F6F4EE', alpha = 1, trim = 1, from = 0 } = {}) {
  if (alpha <= 0 || trim <= from) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = line; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(lerp(a.x, b.x, from), lerp(a.y, b.y, from)); ctx.lineTo(lerp(a.x, b.x, trim), lerp(a.y, b.y, trim)); ctx.stroke(); ctx.restore();
}
