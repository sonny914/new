// Cast: recurring characters and story props for the Quiet Bands films, drawn in billboard space
// (metres, origin on the floor under the subject, y up = negative). Same drawing language as the engine:
// luminous cream solids, bg-coloured cut lines, orange only where the story says so.
import { mix } from './color.js';
import { lerp, clamp } from './math.js';

const pill = (c, x0, y0, x1, y1, w, style) => { c.strokeStyle = style; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };

/**
 * THE YES MAN: a small floating assistant. Screen head, capsule body, pill arms. No face: the screen speaks.
 * screen: 'idle' | 'dots' | 'check' | 'q' | 'x' | 'scan' | 'arrow'   (screenK 0..1 cross-fades from prevScreen)
 * arms: 'down' | 'thumbs' | 'point' | 'cross' | 'push'   (armK blends from 'down')
 * nod: radians of head tilt; hot: 0..1 orange on the glyph (approval glow); dir: 1 faces +x, -1 faces -x
 */
export function yesMan(c, s, P, { screen = 'idle', prevScreen = 'idle', screenK = 1, arms = 'down', armK = 1, nod = 0, hot = 0, scanU = 0, dir = 1, light = 1 } = {}) {
  const ink = mix(P.bg, P.ink, light), dim = mix(P.bg, P.ink2, 0.8 * light), px = (v) => v / s;
  c.save(); c.scale(dir, 1);
  // arms behind/beside the body
  const sh = { x: 0.11, y: -0.25 }, a = clamp(armK);
  const hand = {
    down: [{ x: 0.17, y: -0.06 }, { x: -0.17, y: -0.06 }],
    thumbs: [{ x: 0.27, y: -0.5 }, { x: -0.17, y: -0.06 }],
    point: [{ x: 0.42, y: -0.32 }, { x: -0.17, y: -0.06 }],
    cross: [{ x: -0.08, y: -0.16 }, { x: 0.08, y: -0.16 }],
    push: [{ x: 0.36, y: -0.24 }, { x: 0.36, y: -0.14 }],
  }[arms] ?? [{ x: 0.17, y: -0.06 }, { x: -0.17, y: -0.06 }];
  const rest = [{ x: 0.17, y: -0.06 }, { x: -0.17, y: -0.06 }];
  const R = { x: lerp(rest[0].x, hand[0].x, a), y: lerp(rest[0].y, hand[0].y, a) }, Lh = { x: lerp(rest[1].x, hand[1].x, a), y: lerp(rest[1].y, hand[1].y, a) };
  pill(c, -sh.x, sh.y, Lh.x, Lh.y, 0.055, dim);
  // body
  c.fillStyle = ink; c.beginPath(); c.roundRect(-0.1, -0.31, 0.2, 0.31, 0.1); c.fill();
  pill(c, sh.x, sh.y, R.x, R.y, 0.055, ink);
  if (arms === 'thumbs' && a > 0.5) { pill(c, R.x, R.y, R.x + 0.005, R.y - 0.07 * a, 0.045, ink); }   // the thumb
  // head: a screen, tilting for a nod
  c.save(); c.translate(0, -0.34); c.rotate(nod); c.translate(0, 0.34);
  c.fillStyle = ink; c.beginPath(); c.roundRect(-0.2, -0.62, 0.4, 0.28, 0.07); c.fill();
  c.fillStyle = P.bg; c.beginPath(); c.roundRect(-0.165, -0.595, 0.33, 0.225, 0.045); c.fill();
  const glyph = (kind, alpha) => {
    if (alpha <= 0.01) return;
    c.save(); c.globalAlpha *= alpha; const col = kind === 'check' ? mix(P.ink, P.live, hot) : P.ink;
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = px(5); c.lineCap = 'round'; c.lineJoin = 'round';
    const cx = 0, cy = -0.483;
    if (kind === 'check') { c.beginPath(); c.moveTo(cx - 0.07, cy); c.lineTo(cx - 0.02, cy + 0.05); c.lineTo(cx + 0.075, cy - 0.06); c.stroke(); }
    else if (kind === 'x') { c.beginPath(); c.moveTo(cx - 0.055, cy - 0.055); c.lineTo(cx + 0.055, cy + 0.055); c.moveTo(cx + 0.055, cy - 0.055); c.lineTo(cx - 0.055, cy + 0.055); c.stroke(); }
    else if (kind === 'q') { c.font = `800 ${0.17}px "Inter Display"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.scale(dir, 1); c.fillText('?', 0, cy + 0.008); }
    else if (kind === 'dots') { for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(cx + i * 0.05, cy, 0.016, 0, Math.PI * 2); c.fill(); } }
    else if (kind === 'scan') { c.lineWidth = px(3); for (let i = 0; i < 3; i++) { const y = cy - 0.07 + ((scanU + i / 3) % 1) * 0.14; c.globalAlpha = alpha * (0.4 + 0.6 * (i === 0)); c.beginPath(); c.moveTo(cx - 0.12, y); c.lineTo(cx + 0.12, y); c.stroke(); } }
    else if (kind === 'arrow') { c.beginPath(); c.moveTo(cx - 0.07, cy); c.lineTo(cx + 0.07, cy); c.moveTo(cx + 0.03, cy - 0.04); c.lineTo(cx + 0.07, cy); c.lineTo(cx + 0.03, cy + 0.04); c.stroke(); }
    else if (kind === 'idle') { c.lineWidth = px(3); c.beginPath(); c.moveTo(cx - 0.05, cy); c.lineTo(cx + 0.05, cy); c.stroke(); }
    c.restore();
  };
  glyph(prevScreen, 1 - screenK); glyph(screen, screenK);
  c.restore();
  // a soft contact shadow under the hover
  c.restore();
}

/**
 * The storefront the builder makes. Front-facing, origin at the floor, centre of the facade.
 * rise 0..1 (grows up out of the floor) · extras 0..1 (the unproven add-ons: a "premium" floor, a giant sign, flags)
 * awning 0..1 · handle 0..1 · price 0..1 · sold: number or null (counter plate hidden) · soldHot 0..1 · door 0..1 (opens)
 */
export function storefront(c, s, P, { w = 1.7, h = 1.25, rise = 1, extras = 0, extrasDrop = 0, awning = 0, handle = 0, price = 0, sold = null, soldHot = 0, door = 0, light = 1 } = {}) {
  if (rise <= 0.001) return;
  const ink = mix(P.bg, P.ink, light), cut = P.bg, px = (v) => v / s;
  c.save();
  c.beginPath(); c.rect(-w, -h * 3, w * 2, h * 3); c.clip();            // rises out of the floor
  c.translate(0, (1 - rise) * (h + 1.2));
  // the unproven extras (drawn first: they sit on top and behind)
  if (extras > 0.01) {
    c.save(); c.globalAlpha *= extras; c.translate(0, extrasDrop * 1.6); c.rotate(extrasDrop * 0.12);
    c.fillStyle = ink; c.beginPath(); c.roundRect(-w * 0.34, -h - 0.62, w * 0.68, 0.6, [0.03, 0.03, 0, 0]); c.fill();
    c.fillStyle = cut; for (let i = 0; i < 4; i++) c.fillRect(-w * 0.28 + i * w * 0.15, -h - 0.5, w * 0.1, 0.16);
    c.font = `800 ${0.1}px "Inter Display"`; c.textAlign = 'center'; c.fillText('PREMIUM', 0, -h - 0.12);
    // a giant sign on poles and two flags: confidence, not evidence
    pill(c, -w * 0.25, -h - 0.62, -w * 0.25, -h - 0.95, px(3), ink); pill(c, w * 0.25, -h - 0.62, w * 0.25, -h - 0.95, px(3), ink);
    c.fillStyle = ink; c.beginPath(); c.roundRect(-w * 0.42, -h - 1.22, w * 0.84, 0.3, 0.03); c.fill();
    c.fillStyle = cut; c.font = `800 ${0.15}px "Inter Display"`; c.fillText('WORLDWIDE', 0, -h - 1.02);
    for (const sx of [-1, 1]) { pill(c, sx * w * 0.47, -h, sx * w * 0.47, -h - 0.5, px(2.5), ink); c.fillStyle = ink; c.beginPath(); c.moveTo(sx * w * 0.47, -h - 0.5); c.lineTo(sx * w * 0.47 + sx * 0.2, -h - 0.44); c.lineTo(sx * w * 0.47, -h - 0.38); c.fill(); }
    c.restore();
  }
  // the building
  c.fillStyle = ink; c.beginPath(); c.roundRect(-w / 2, -h, w, h, [0.03, 0.03, 0, 0]); c.fill();
  c.fillRect(-w / 2 - 0.04, -h - 0.06, w + 0.08, 0.07);
  // awning (scalloped) the assistant adds
  if (awning > 0.01) {
    const n = 6, sw = w / n, ay = -h + 0.06, drop = 0.18 * awning;
    c.fillStyle = ink; c.save(); c.globalAlpha *= awning; c.beginPath(); c.moveTo(-w / 2 - 0.05, ay); c.lineTo(w / 2 + 0.05, ay); c.lineTo(w / 2 + 0.05, ay + drop);
    for (let i = n - 1; i >= 0; i--) c.arc(-w / 2 + sw * i + sw / 2, ay + drop, sw / 2, 0, Math.PI, false);
    c.closePath(); c.fill(); c.fillStyle = cut; for (let i = 1; i < n; i++) c.fillRect(-w / 2 + sw * i - px(1.1), ay, px(2.2), drop); c.restore();
  }
  // display window and the product in it; the price tag
  c.fillStyle = cut; c.beginPath(); c.roundRect(-w / 2 + 0.12, -h + 0.42, w * 0.46, h * 0.42, 0.02); c.fill();
  c.fillStyle = ink; c.beginPath(); c.roundRect(-w / 2 + 0.3, -h + 0.62, 0.22, 0.27, 0.02); c.fill(); c.fillRect(-w / 2 + 0.34, -h + 0.56, 0.14, 0.07);
  if (price > 0.01) { c.save(); c.globalAlpha *= price; c.strokeStyle = ink; c.lineWidth = px(1.5); c.beginPath(); c.moveTo(-w / 2 + 0.6, -h + 0.42); c.lineTo(-w / 2 + 0.62, -h + 0.5); c.stroke();
    c.fillStyle = ink; c.beginPath(); c.roundRect(-w / 2 + 0.55, -h + 0.5, 0.18, 0.1, 0.015); c.fill(); c.fillStyle = cut; c.font = `800 ${0.06}px "Inter Display"`; c.textAlign = 'center'; c.fillText('$12', -w / 2 + 0.64, -h + 0.575); c.restore(); }
  // the door (opens inward: the panel narrows), and its handle
  const dx = w / 2 - 0.5, dw = 0.36, dh = 0.78;
  c.fillStyle = cut; c.beginPath(); c.roundRect(dx, -dh, dw, dh, [0.08, 0.08, 0, 0]); c.fill();
  if (door > 0.01) { c.fillStyle = mix(P.bg, P.ink, 0.18); c.beginPath(); c.roundRect(dx, -dh, dw * (1 - 0.75 * door), dh, [0.08, 0, 0, 0]); c.fill(); }
  if (handle > 0.01 && door < 0.5) { c.save(); c.globalAlpha *= handle; c.fillStyle = ink; c.beginPath(); c.arc(dx + dw - 0.07, -dh * 0.48, 0.028, 0, Math.PI * 2); c.fill(); c.restore(); }
  // the counter plate: what the store has actually sold
  if (sold != null) {
    c.fillStyle = cut; c.beginPath(); c.roundRect(dx - 0.02, -h + 0.14, dw + 0.04, 0.2, 0.025); c.fill();
    c.fillStyle = mix(P.ink2, P.live, soldHot); c.font = `500 ${0.05}px "JetBrains Mono"`; c.textAlign = 'center'; c.fillText('SOLD', dx + dw / 2, -h + 0.2);
    c.font = `800 ${0.11}px "Inter Display"`; c.fillStyle = mix(P.ink, P.live, soldHot); c.fillText(String(sold), dx + dw / 2, -h + 0.31);
  }
  c.restore();
}
