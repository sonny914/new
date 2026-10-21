// Typography: small, tracked, cream lines that move with the film, and the end title. Styles:
//   rise   letters rise out of a mask, staggered; leave upward with a blur      (calm)
//   slide  letters slide in from the right with motion blur; leave to the left  (motion)
// The end title resolves from wide tracking and blur; the tagline rises beneath it; one accent hairline is drawn under.
import { clamp, lerp, seg, smooth, outExpo, rgb } from './timeline.js';

export function createType(ctx, cfg, P, scale) {
  const W = cfg.width, T = cfg.type, CREAM = rgb(cfg.colors.type), LIVE = rgb(cfg.colors.accent);
  const lines = (cfg.copy ?? []).map((c) => ({ ...c, at: P.time(c.in), out: P.time(c.out) }));
  const end = cfg.end?.title ? { ...cfg.end, at: P.time(cfg.end.in), tagAt: P.time(cfg.end.tagIn ?? cfg.end.in) } : null;
  const font = (w, s) => `${w} ${s}px ${T.family}`;
  const blur = (px) => (px > 0.3 ? `blur(${(px * scale).toFixed(2)}px)` : 'none');

  function measure(s, size, wght, track) {
    ctx.font = font(wght, size);
    const ws = [...s].map((ch) => ctx.measureText(ch).width + track * size);
    return { ws, total: ws.reduce((a, b) => a + b, 0) - track * size };
  }

  function drawLine(item, t, drift) {
    const L = T.line, k = t - item.at, x = W / 2 + drift, y = L.y, size = L.size;
    if (k < 0 || t > item.out + 0.45) return;
    const ex = seg(t, item.out, item.out + 0.4);
    const tr = lerp(L.track[0], L.track[1], outExpo(seg(k, 0, 0.9)));
    const { ws, total } = measure(item.text, size, L.weight, tr);
    let cx = x - total / 2;
    ctx.textBaseline = 'alphabetic';
    [...item.text].forEach((ch, j) => {
      const d = j * 0.032, kk = outExpo(seg(k, d, d + 0.55)), ej = smooth(clamp(ex * 1.6 - j * 0.05));
      let dx = 0, dy = 0, b = 0, a = kk * (1 - ej);
      if (item.style === 'slide') { dx = (1 - kk) * 70 - ej * 120; b = (1 - kk) * 8 + ej * 9; a = Math.min(1, kk * 1.4) * (1 - ej); }
      else { dy = (1 - kk) * size * 1.1 - ej * 26; b = ej * 6; }
      if (a > 0.005) {
        ctx.save();
        if (item.style !== 'slide') { ctx.beginPath(); ctx.rect(0, y - size * 1.1 - 40, W, size * 1.4 + 40); ctx.clip(); }
        ctx.filter = blur(b);
        ctx.globalAlpha = a; ctx.fillStyle = `rgb(${CREAM})`; ctx.font = font(L.weight, size);
        ctx.fillText(ch, cx + dx, y + dy);
        ctx.restore();
      }
      cx += ws[j];
    });
  }

  let wordmark = null;
  function drawEnd(t, drift) {
    const k = t - end.at;
    if (k < 0) return;
    const E = T.title, kk = outExpo(seg(k, 0, 1.1)), y = E.y, x = W / 2 + drift;
    ctx.save();
    ctx.globalAlpha = Math.min(1, kk * 1.25); ctx.filter = kk < 0.98 ? blur((1 - kk) * 10) : 'none';
    if (end.mark === 'wordmark' && wordmark) {
      const w = E.wordmarkWidth * lerp(1.06, 1, kk), h = (w * 155) / 845;
      ctx.drawImage(wordmark, x - w / 2, y - h + 8, w, h);
    } else {
      const tr = lerp(E.track[0], E.track[1], kk);
      const { ws, total } = measure(end.title, E.size, E.weight, tr);
      let cx = x - total / 2; ctx.fillStyle = `rgb(${CREAM})`; ctx.font = font(E.weight, E.size);
      [...end.title].forEach((ch, j) => { ctx.fillText(ch, cx, y); cx += ws[j]; });
    }
    ctx.restore();
    const G = T.tag, tk = outExpo(seg(t - end.tagAt, 0, 0.9));
    if (end.tag && tk > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y + 30, W, 80); ctx.clip();
      ctx.globalAlpha = tk * G.opacity; ctx.fillStyle = `rgb(${CREAM})`; ctx.font = font(G.weight, G.size); ctx.textAlign = 'center';
      ctx.letterSpacing = `${G.tracking}px`;
      ctx.fillText(end.tag, x, y + G.gap + (1 - tk) * 40);
      ctx.restore();
    }
    const lk = outExpo(seg(t - end.at - 0.25, 0, 1));
    if (T.hairline && lk > 0) { ctx.fillStyle = `rgba(${LIVE},${0.9 * lk})`; const lw = 56 * lk; ctx.fillRect(x - lw / 2, y + 26, lw, 3); }
  }

  async function ready() {
    for (const [w, s] of [[T.line.weight, T.line.size], [T.title.weight, T.title.size], [T.tag.weight, T.tag.size]]) await document.fonts.load(font(w, s));
    if (end?.mark === 'wordmark') {
      const svg = (await (await fetch('/assets/brand/wordmark.svg')).text()).replaceAll('#000000', cfg.colors.type);
      const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(svg); await img.decode(); wordmark = img;
    }
  }

  return {
    ready,
    draw(t, drift) { for (const item of lines) drawLine(item, t, drift); if (end) drawEnd(t, drift * 0.5); },
  };
}
