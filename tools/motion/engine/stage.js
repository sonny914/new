// The render harness. A composition is a pure function draw(ctx, t). The stage owns the canvas,
// the background, and true motion blur: several sub-frame samples across the shutter, averaged in float
// (no 8-bit drift, so the background stays exactly the brand black).
// Exposes window.motion = {ready, fps, frames, width, height, draw(n)} for the headless renderer.
export function stage(comp, { canvas = document.getElementById('c'), samples, shutter } = {}) {
  const { width: W, height: H, fps, duration } = comp;
  canvas.width = W; canvas.height = H;
  const out = canvas.getContext('2d');
  const scratch = document.createElement('canvas'); scratch.width = W; scratch.height = H;
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  const S = samples ?? comp.motionBlur?.samples ?? 1, shut = shutter ?? comp.motionBlur?.shutter ?? 0.5;
  const frames = Math.round(duration * fps);
  let acc = null;

  function paint(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = comp.palette.bg; ctx.fillRect(0, 0, W, H);
    comp.draw(ctx, Math.max(0, Math.min(duration, t)), { W, H, fps });
  }
  function draw(n) {
    const t0 = n / fps;
    if (S <= 1) { paint(t0); out.drawImage(scratch, 0, 0); return; }
    acc ??= new Float32Array(W * H * 4); acc.fill(0);
    for (let s = 0; s < S; s++) {
      paint(t0 + ((s + 0.5) / S - 0.5) * shut / fps);
      const d = ctx.getImageData(0, 0, W, H).data;
      for (let i = 0; i < d.length; i++) acc[i] += d[i];
    }
    const img = out.createImageData(W, H), o = img.data;
    for (let i = 0; i < o.length; i++) o[i] = acc[i] / S + 0.5;
    out.putImageData(img, 0, 0);
  }
  window.motion = { ready: true, fps, frames, width: W, height: H, draw };
  return window.motion;
}
