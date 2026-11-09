// Light and atmosphere. The look comes from here, not from more particles:
//  - emissive layer: everything luminous is drawn on its own canvas, then bloomed twice (tight + wide halo)
//  - volumetric cones and floor pools are soft additive gradients
//  - grain and vignette finish the frame like a lens, not a screen
import { rng } from './math.js';

export function makeLayers(W, H) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const emit = mk(), tmp = mk();
  // film grain: fixed seeded noise, shifted per frame (deterministic)
  const grain = document.createElement('canvas'); grain.width = 512; grain.height = 512;
  const g = grain.getContext('2d'), img = g.createImageData(512, 512), r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { emit, ectx: emit.getContext('2d'), tmp, grain, W, H };
}

/** Composite the emissive layer onto ctx with bloom. strength scales both halos. */
export function bloom(ctx, L, { tight = 10, wide = 42, a1 = 0.55, a2 = 0.38, strength = 1 } = {}) {
  ctx.save();
  ctx.drawImage(L.emit, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = `blur(${tight}px)`; ctx.globalAlpha = a1 * strength; ctx.drawImage(L.emit, 0, 0);
  ctx.filter = `blur(${wide}px)`; ctx.globalAlpha = a2 * strength; ctx.drawImage(L.emit, 0, 0);
  ctx.restore();
}

/** Soft volumetric cone from a point above, spreading to a floor ellipse (screen-space trapezoid, blurred). */
export function cone(ctx, top, topW, bottom, bottomW, { color = '246,244,238', alpha = 0.16, blur = 26 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(0, top.y, 0, bottom.y);
  g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(0.55, `rgba(${color},${alpha * 0.45})`); g.addColorStop(1, `rgba(${color},${alpha * 0.18})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(top.x - topW / 2, top.y); ctx.lineTo(top.x + topW / 2, top.y); ctx.lineTo(bottom.x + bottomW / 2, bottom.y); ctx.lineTo(bottom.x - bottomW / 2, bottom.y); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Radial glow (screen space), additive. ry/rx gives an ellipse (floor pools). */
export function glow(ctx, x, y, rx, ry, { color = '246,244,238', alpha = 0.2, stops = [0, 0.35, 1], falloff = [1, 0.35, 0] } = {}) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  stops.forEach((s, i) => g.addColorStop(s, `rgba(${color},${alpha * falloff[i]})`));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function vignette(ctx, W, H, { amount = 0.72, inner = 0.42 } = {}) {
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * inner, W / 2, H * 0.48, Math.hypot(W, H) * 0.56);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${amount})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/** Zero-mean-ish grain: lighten with the noise, darken with its inverse at the same strength. */
export function grain(ctx, L, frame = 0, amount = 0.045) {
  const r = rng(frame * 977 + 13), ox = Math.floor(r() * 512), oy = Math.floor(r() * 512);
  ctx.save();
  const pat = ctx.createPattern(L.grain, 'repeat'); pat.setTransform(new DOMMatrix([1, 0, 0, 1, -ox, -oy]));
  ctx.fillStyle = pat;
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = amount * 6; ctx.fillRect(0, 0, L.W, L.H);
  ctx.restore();
}
