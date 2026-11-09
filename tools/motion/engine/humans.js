// LuminousHuman: the recurring Quiet Bands figure, and the seated workstation it uses.
// Proportions (metres, standing 1.75): head disc r 0.098 floating 0.025 above a capsule torso 0.30 x 0.64;
// limbs are pills (0.08-0.13 wide). No face, no clothing. Filled surfaces, lit from the front (the work it faces).
// Billboard space: x forward (the figure faces +x), y up = negative, origin on the floor under the hips.
import { mix } from './color.js';
import { box3 } from './illustrations.js';
import { panel } from './space.js';

const pill = (ctx, x0, y0, x1, y1, w, style) => { ctx.strokeStyle = style; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };

/** pose: 'stand' | 'sit'. reach 0..1 brings the near hand forward to a keyboard; look tilts the head up (toward an idea). */
export function human(ctx, s, { P, pose = 'stand', reach = 0, lean = 0.06, look = 0, light = 1 } = {}) {
  const front = mix(P.bg, P.ink, light), back = mix(P.bg, P.ink, 0.62 * light + 0.12), far = mix(P.bg, P.ink2, 0.75 * light + 0.05);
  const grad = ctx.createLinearGradient(-0.17, 0, 0.17, 0); grad.addColorStop(0, back); grad.addColorStop(1, front);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const sit = pose === 'sit', hipY = sit ? -0.5 : -0.9, top = hipY - 0.64;
  // legs
  if (sit) {
    pill(ctx, -0.04, -0.53, 0.3, -0.55, 0.12, far); pill(ctx, 0.3, -0.55, 0.32, -0.06, 0.105, far); pill(ctx, 0.32, -0.05, 0.43, -0.045, 0.08, far);
    pill(ctx, -0.02, -0.53, 0.36, -0.55, 0.13, grad); pill(ctx, 0.36, -0.55, 0.39, -0.06, 0.115, grad); pill(ctx, 0.39, -0.05, 0.5, -0.045, 0.085, grad);
  } else {
    pill(ctx, -0.035, -0.9, -0.06, -0.07, 0.112, far); pill(ctx, -0.06, -0.06, 0.07, -0.055, 0.085, far);
    pill(ctx, 0.045, -0.9, 0.075, -0.07, 0.118, grad); pill(ctx, 0.075, -0.06, 0.215, -0.055, 0.09, grad);
  }
  const hand = sit ? { x: 0.12 + 0.36 * reach, y: -0.78 - 0.02 * reach } : { x: 0.06 + 0.33 * reach, y: -0.93 - 0.11 * reach };
  const el = sit ? { x: 0.1 + 0.06 * reach, y: -0.78 + 0.02 * reach } : { x: 0.07 + 0.07 * reach, y: -1.12 };
  const sh = { x: 0.03, y: top + 0.13 };
  // far arm (behind the torso)
  pill(ctx, sh.x - 0.03, sh.y, el.x - 0.03, el.y - 0.01, 0.054, far); pill(ctx, el.x - 0.03, el.y - 0.01, hand.x - 0.04, hand.y + 0.005, 0.05, far);
  // torso + head lean about the hip
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(lean); ctx.translate(0, -hipY);
  ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(-0.15, top, 0.3, 0.64, 0.15); ctx.fill();
  const hx = 0.03 + 0.02 * look, hy = top - 0.123 - 0.01 * look;
  const hg = ctx.createRadialGradient(hx + 0.04, hy - 0.03, 0.015, hx, hy, 0.13); hg.addColorStop(0, front); hg.addColorStop(1, mix(back, front, 0.55));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 0.098, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // near arm, engraved where it crosses the torso
  ctx.strokeStyle = P.bg; ctx.lineWidth = 0.06 + 5 / s;
  ctx.beginPath(); ctx.moveTo(sh.x + 0.015, sh.y); ctx.lineTo(el.x, el.y); ctx.lineTo(hand.x, hand.y); ctx.stroke();
  ctx.strokeStyle = front; ctx.lineWidth = 0.06;
  ctx.beginPath(); ctx.moveTo(sh.x + 0.015, sh.y); ctx.lineTo(el.x, el.y); ctx.lineTo(hand.x, hand.y); ctx.stroke();
}

/** The chair, drawn behind a seated human (same billboard space). Secondary tone: support, not subject. */
export function chair(ctx, s, { P }) {
  const c = mix(P.bg, P.ink2, 0.85), e = P.ink2;
  ctx.lineCap = 'round';
  pill(ctx, -0.27, -0.5, -0.3, -1.02, 0.045, c);                         // back post
  ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(-0.33, -1.06, 0.08, 0.34, 0.04); ctx.fill(); // back pad
  ctx.beginPath(); ctx.roundRect(-0.27, -0.51, 0.45, 0.045, 0.02); ctx.fill();                  // seat
  pill(ctx, -0.05, -0.46, -0.05, -0.08, 0.04, c);                         // column
  pill(ctx, -0.3, -0.05, 0.2, -0.05, 0.03, c);                            // base
  ctx.strokeStyle = e; ctx.lineWidth = 1.4 / s;
  for (const x of [-0.3, 0.2]) { ctx.beginPath(); ctx.arc(x, -0.025, 0.025, 0, Math.PI * 2); ctx.stroke(); }
}

/** EditorialWorkstation (seated): a slim desk, keyboard and a monitor turned toward the figure. x0 = desk's near edge. */
export function deskSeated(ctx, cam, { P, x0 = 0, screen = 1, lines = 4, prompt = '', font = '"JetBrains Mono"' }) {
  const lit = P.ink, mid = mix(P.bg, P.ink2, 0.42), dark = mix(P.bg, P.ink2, 0.2), edge = P.ink2;
  box3(ctx, cam, [x0 + 0.02, x0 + 0.06], [0, 0.72], [-0.28, -0.24], { front: mid, side: dark, edge, line: 1 });  // legs
  box3(ctx, cam, [x0 + 1.02, x0 + 1.06], [0, 0.72], [-0.28, -0.24], { front: mid, side: dark, edge, line: 1 });
  box3(ctx, cam, [x0, x0 + 1.1], [0.72, 0.755], [-0.32, 0.32], { top: lit, front: mid, side: dark, edge: lit, line: 1.2 });
  box3(ctx, cam, [x0 + 0.06, x0 + 0.38], [0.755, 0.768], [-0.15, 0.03], { top: mid, front: dark, edge, line: 1 });   // keyboard
  box3(ctx, cam, [x0 + 0.7, x0 + 0.75], [0.755, 0.86], [0.02, 0.07], { front: mid, side: dark, edge, line: 1 });    // neck
  panel(ctx, cam, { x: x0 + 0.7, y: 0.85, z: 0.07 }, 0.68, 0.43, 0.86, (c, w, h, s) => {
    const px = (v) => v / s;
    c.fillStyle = dark; c.beginPath(); c.roundRect(0, 0, w, h, 0.022); c.fill();
    c.strokeStyle = edge; c.lineWidth = px(1.5); c.stroke();
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, mix(P.bg, P.ink, 0.7 * screen + 0.1)); g.addColorStop(1, mix(P.bg, P.ink, 0.38 * screen + 0.08));
    c.fillStyle = g; c.beginPath(); c.roundRect(0.026, 0.026, w - 0.052, h - 0.052, 0.012); c.fill();
    c.fillStyle = P.bg; c.globalAlpha = 0.6 * screen;
    if (prompt) { c.save(); c.beginPath(); c.rect(0.04, 0.04, w - 0.08, h - 0.08); c.clip(); c.font = `500 ${px(12)}px ${font}`; c.textBaseline = 'middle'; c.fillText('› ' + prompt, 0.07, 0.1); c.restore(); }
    for (let i = 0; i < Math.ceil(lines); i++) c.fillRect(0.07, 0.17 + i * 0.062, (0.4 - i * 0.07) * Math.min(1, lines - i), 0.02);
    c.globalAlpha = 1;
  });
}

/** The idea: a small bulb (billboard space, origin at the bulb's base). glow 0..1 lights the filament. */
export function bulb(ctx, s, { P, glow = 1, live = 0 }) {
  const px = (v) => v / s, r = 0.11, hot = live ? mix(P.ink, P.live, live) : P.ink;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const g = ctx.createRadialGradient(0, -0.2, 0, 0, -0.2, r * 1.05);
  const lift = live ? 0.4 : 0; // a lit orange bulb stays bright to its edge (it is the light, not a tinted glass)
  g.addColorStop(0, mix(P.bg, live ? mix(hot, P.ink, 0.35) : hot, 0.95 * glow)); g.addColorStop(0.6, mix(P.bg, hot, (0.55 + lift * 0.6) * glow)); g.addColorStop(1, mix(P.bg, hot, (0.25 + lift) * glow));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, -0.2, r, Math.PI * 0.78, Math.PI * 2.22); ctx.lineTo(0.045, -0.06); ctx.lineTo(-0.045, -0.06); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = P.ink; ctx.lineWidth = px(2); ctx.stroke();
  ctx.strokeStyle = P.bg; ctx.lineWidth = px(1.6);
  ctx.beginPath(); ctx.moveTo(-0.03, -0.08); ctx.lineTo(-0.03, -0.17); ctx.lineTo(-0.012, -0.21); ctx.lineTo(0.004, -0.17); ctx.lineTo(0.02, -0.21); ctx.lineTo(0.03, -0.17); ctx.lineTo(0.03, -0.08); ctx.stroke();
  ctx.strokeStyle = P.ink; ctx.lineWidth = px(2);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-0.042 + i * 0.004, -0.045 + i * 0.018); ctx.lineTo(0.042 - i * 0.004, -0.045 + i * 0.018); ctx.stroke(); }
}
