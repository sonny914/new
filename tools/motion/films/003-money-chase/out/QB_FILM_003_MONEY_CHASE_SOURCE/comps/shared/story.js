// Story kit: the pieces every Quiet Bands film reuses on top of the engine.
// Camera keys, arcs and floor paths, a walking figure, editorial headlines, and the end card.
import { clamp, lerp, seg, ease, smoothstep } from '../../engine/math.js';
import { cam3 } from '../../engine/space.js';
import { human } from '../../engine/humans.js';

/** Camera from keys [[t, pos, pitch, f, opts?], ...]. Long moves ease in-out (quintic); near-still keys drift linearly. opts.arc lifts a move. */
export function cameraKeys(keys, W, H) {
  return (t) => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const [ta, pa, ka, fa] = keys[i], [tb, pb, kb, fb, ob = {}] = keys[i + 1];
    const still = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z) < 0.6;
    const k = still ? seg(t, ta, tb) : ease.inOut5(seg(t, ta, tb));
    const pos = { x: lerp(pa.x, pb.x, k), y: lerp(pa.y, pb.y, k) + (ob.arc ?? 0) * Math.sin(k * Math.PI), z: lerp(pa.z, pb.z, k) };
    return cam3({ W, H, pos, pitch: lerp(ka, kb, k), f: lerp(fa, fb, k) });
  };
}

export const quad = (a, c, b) => (u) => { const v = 1 - u; return { x: v * v * a.x + 2 * u * v * c.x + u * u * b.x, y: v * v * a.y + 2 * u * v * c.y + u * u * b.y, z: v * v * a.z + 2 * u * v * c.z + u * u * b.z }; };
export const arcFrom = (src, dst, lift = 1.2) => quad(src, { x: (src.x + dst.x) / 2, y: Math.max(src.y, dst.y) + lift, z: (src.z + dst.z) / 2 }, dst);
export const along = (pts, u, y = 0.3) => { const f = clamp(u) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i; return { x: lerp(pts[i].x, pts[i + 1].x, k), y, z: lerp(pts[i].z, pts[i + 1].z, k) }; };
export const floorCurve = (a, b, bend = 0.12, n = 48) => Array.from({ length: n + 1 }, (_, k) => { const u = k / n, mx = (a.x + b.x) / 2 + (b.z - a.z) * bend, mz = (a.z + b.z) / 2 - (b.x - a.x) * bend; return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mx + u * u * b.x, y: 0, z: (1 - u) ** 2 * a.z + 2 * u * (1 - u) * mz + u * u * b.z }; });
/** Fade for things close to the lens: nothing slabs past the camera. */
export const nearFade = (d) => smoothstep(clamp((d - 1.1) / 2.4));

/** A standing figure that can face either way, with a barely-there step. */
export function walker(ctx, s, P, { flip = false, step = 0, look = 0, light = 1, lean = 0.03, reach = 0.15 } = {}) {
  ctx.save(); if (flip) ctx.scale(-1, 1); ctx.translate(0, -0.012 * Math.abs(Math.sin(step * Math.PI)));
  human(ctx, s, { P, pose: 'stand', reach, lean, look, light }); ctx.restore();
}

/** Editorial headline: lines rise into place behind a mask. lines = [[text, colour?], ...] or [[[run, colour], ...], ...] for mixed runs. */
export function headline(ctx, P, W, lines, y0, a, rise, { size = 112, x = 72 } = {}) {
  if (a <= 0.01) return;
  ctx.save(); ctx.font = `800 ${size}px "Inter Display"`; ctx.letterSpacing = '0px';
  lines.forEach((ln, i) => {
    const y = y0 + i * size * 1.02, dy = (1 - ease.out5(clamp(rise * 1.5 - i * 0.3))) * size * 1.1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y - size, W, size * 1.24); ctx.clip(); ctx.globalAlpha = a;
    const runs = Array.isArray(ln[0]) ? ln : [[ln[0], ln[1]]]; let cx = x;
    for (const [txt, col] of runs) { ctx.fillStyle = col ?? P.ink; ctx.fillText(txt, cx, y + dy); cx += ctx.measureText(txt).width; }
    ctx.restore();
  });
  ctx.restore();
}
export function kicker(ctx, P, text, y, a, mono) {
  if (a <= 0.01) return;
  mono(ctx, text, 80, y, { size: 20, color: P.ink2, track: 5, alpha: a });
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = P.tech; ctx.fillRect(80, y + 18, 44, 1.5); ctx.restore();
}

/** The series end card: the actual mark, then the wordmark, then the line. mk/wk/lk are 0..1 progress values. */
export function endCard(ctx, P, W, MARK, WORD, mk, wk, lk) {
  if (mk > 0.01) {
    const markH = 150, s = lerp(0.94, 1, ease.out3(mk)), mw = markH * 823 / 658;
    ctx.save(); ctx.globalAlpha = mk; ctx.fillStyle = P.ink; ctx.translate(W / 2, 830); ctx.scale(s, s); ctx.translate(-mw / 2, -markH / 2); ctx.scale(markH / 658, markH / 658); ctx.fill(MARK); ctx.restore();
  }
  if (wk > 0.01) { const wh = 54, ww = wh * 845 / 155; ctx.save(); ctx.globalAlpha = wk; ctx.fillStyle = P.ink; ctx.translate(W / 2 - ww / 2, 985 + 8 * (1 - ease.out3(wk))); ctx.scale(wh / 155, wh / 155); ctx.fill(WORD); ctx.restore(); }
  if (lk > 0) { ctx.save(); ctx.font = '800 60px "Inter Display"'; ctx.letterSpacing = '1px'; ctx.textAlign = 'center'; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.rect(0, 1100, W, 90); ctx.clip(); ctx.globalAlpha = smoothstep(clamp(lk)); ctx.fillText('BUILD WHAT MATTERS.', W / 2, 1160 + (1 - ease.out5(clamp(lk * 1.4))) * 70); ctx.restore(); }
}
export const brandPath = async (u) => new Path2D((await (await fetch(u)).text()).match(/ d="([^"]+)"/)[1]);

/** Beat lookup by word position: the pause nearest to fraction `frac` of line n (1-based) in a timeline.json. */
export function brk(TL, n, frac) {
  const l = TL.lines[n - 1], want = l.at + frac * (l.end - l.at);
  if (!l.pauses.length) return [want, want];
  return l.pauses.reduce((best, p) => (Math.abs((p[0] + p[1]) / 2 - want) < Math.abs((best[0] + best[1]) / 2 - want) ? p : best));
}
