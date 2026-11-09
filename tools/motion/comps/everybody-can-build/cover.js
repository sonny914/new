// Cover for EVERYBODY CAN BUILD, in the Quiet Bands identity palette (assets/brand + qb-identity):
// black ground, cream lines and type, orange for the one live item (the idea).
// The world is keyframe A's, re-skinned. The mark and wordmark are the supplied vectors, read from assets/brand.
// Key content stays inside the centre 3:4 band (y 240-1680), which is what a profile grid shows.
//   node tools/motion/render.mjs everybody-can-build/cover --frames=0 --blur=1
import { A, setPalette, P } from './film-keys.js';
import { makeLayers, halo, vignette, grain } from '../../engine/light.js';
import { PALETTES } from '../../engine/color.js';

const W = 1080, H = 1920;
let L, MARK, WORD;
const pathOf = async (url) => new Path2D((await (await fetch(url)).text()).match(/ d="([^"]+)"/)[1]);

function lockup(ctx, cx, y, markH) {
  // header lockup rule: mark then wordmark, both centred on one axis; gap scales with the mark (10px at 20px tall)
  const mw = markH * 823 / 658, wh = markH * 0.77, ww = wh * 845 / 155, gap = markH * 0.5, x0 = cx - (mw + gap + ww) / 2;
  ctx.save(); ctx.fillStyle = P.ink;
  ctx.save(); ctx.translate(x0, y - markH / 2); ctx.scale(markH / 658, markH / 658); ctx.fill(MARK); ctx.restore();
  ctx.save(); ctx.translate(x0 + mw + gap, y - wh / 2 - wh * 0.04); ctx.scale(wh / 155, wh / 155); ctx.fill(WORD); ctx.restore();
  ctx.restore();
}

function draw(ctx) {
  setPalette(PALETTES.brand);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000000'); g.addColorStop(0.55, '#08080A'); g.addColorStop(1, '#000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  A(ctx, e, { pos: { x: 0.33, y: 1.0, z: -4.55 }, pitch: -0.03, text: false, liveBulb: 1, ruler: false });
  halo(ctx, L);
  // type: statement + the hook question
  ctx.save();
  ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '5px'; ctx.fillStyle = P.ink2; ctx.fillText('FILM 01 — AI & THE CREATIVE ECONOMY', 80, 262);
  ctx.fillStyle = P.tech; ctx.fillRect(80, 280, 44, 1.5);
  ctx.font = '800 136px "Inter Display"'; ctx.letterSpacing = '0px'; ctx.fillStyle = P.ink;
  ctx.fillText('EVERYBODY', 72, 418); ctx.fillText('CAN BUILD.', 72, 556);
  ctx.font = '500 50px "Inter Display"'; ctx.letterSpacing = '-0.5px'; ctx.fillStyle = P.ink2;
  ctx.fillText('So what makes you different?', 78, 636);
  ctx.restore();
  lockup(ctx, W / 2, 1610, 46);
  vignette(ctx, W, H, { amount: 0.66 });
  grain(ctx, L, 3);
}

export default { width: W, height: H, fps: 1, duration: 1, palette: PALETTES.brand, load: async () => { MARK = await pathOf('/assets/brand/mark.svg'); WORD = await pathOf('/assets/brand/wordmark.svg'); }, draw };
