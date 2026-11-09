// Quiet Bands illustration kit: luminous cream solids with bg-coloured cut lines, drawn in metres.
// Original artwork: a working figure in profile (not a front-facing pawn), a standing workstation,
// a floating AI panel, and four kinds of creation (site, store, app, product).
import { path3, panel } from './space.js';
import { mix } from './color.js';

/* ---------- the figure: 1.75 m, profile facing +x, anchored at the feet (billboard space, y up = negative) ---------- */
export function figure(ctx, s, { ink, bg, pose = 0, light = 1 } = {}) {
  // pose 0 = hands at sides, 1 = reaching to the keyboard
  const back = mix(bg, ink, 0.62 * light + 0.2), front = mix(bg, ink, Math.min(1, light));
  const grad = ctx.createLinearGradient(-0.16, 0, 0.18, 0); grad.addColorStop(0, back); grad.addColorStop(1, front);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // far leg (darker: depth)
  ctx.strokeStyle = mix(bg, ink, 0.55 * light + 0.15); ctx.lineWidth = 0.112;
  ctx.beginPath(); ctx.moveTo(-0.045, -0.9); ctx.lineTo(-0.075, -0.07); ctx.lineTo(0.06, -0.055); ctx.stroke();
  // far arm
  const reach = pose;
  ctx.lineWidth = 0.082;
  ctx.beginPath(); ctx.moveTo(0.0, -1.37); ctx.quadraticCurveTo(0.03 + 0.06 * reach, -1.12, 0.05 + 0.25 * reach, -1.02 - 0.06 * reach); ctx.stroke();
  // torso
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-0.05, -1.46);
  ctx.bezierCurveTo(-0.15, -1.42, -0.165, -1.2, -0.135, -0.98);
  ctx.quadraticCurveTo(-0.125, -0.86, -0.06, -0.85);
  ctx.lineTo(0.07, -0.85);
  ctx.quadraticCurveTo(0.125, -0.86, 0.13, -0.98);
  ctx.bezierCurveTo(0.15, -1.16, 0.16, -1.36, 0.08, -1.45);
  ctx.quadraticCurveTo(0.015, -1.49, -0.05, -1.46);
  ctx.fill();
  // near leg
  ctx.strokeStyle = grad; ctx.lineWidth = 0.118;
  ctx.beginPath(); ctx.moveTo(0.04, -0.9); ctx.lineTo(0.085, -0.07); ctx.lineTo(0.225, -0.055); ctx.stroke();
  // near arm (front of torso)
  ctx.strokeStyle = front; ctx.lineWidth = 0.088;
  ctx.beginPath(); ctx.moveTo(0.05, -1.36); ctx.quadraticCurveTo(0.1 + 0.03 * reach, -1.1 + 0.02 * reach, 0.1 + 0.27 * reach, -1.0 - 0.07 * reach); ctx.stroke();
  // separation cut between arm and torso: a bg-coloured hairline reads as an overlap, like an engraving
  ctx.strokeStyle = bg; ctx.lineWidth = 2.2 / s;
  ctx.beginPath(); ctx.moveTo(0.012, -1.33); ctx.quadraticCurveTo(0.055 + 0.03 * reach, -1.1, 0.06 + 0.27 * reach, -1.04 - 0.07 * reach); ctx.stroke();
  // head (slightly forward, attentive)
  const hg = ctx.createRadialGradient(0.07, -1.66, 0.02, 0.03, -1.62, 0.15); hg.addColorStop(0, front); hg.addColorStop(1, mix(back, front, 0.6));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0.035, -1.615, 0.122, 0, Math.PI * 2); ctx.fill();
}

/* ---------- boxes: faces lit from above-front; only faces that look at the camera are drawn ---------- */
export function box3(ctx, cam, [x0, x1], [y0, y1], [z0, z1], { top, front, side, edge, line = 1.2 }) {
  const P = cam.pos, faces = [];
  if (P.y > y1) faces.push([top, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]]);
  if (P.z < z0) faces.push([front, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]]]);
  if (P.x < x0) faces.push([side, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]]);
  if (P.x > x1) faces.push([side, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]]]);
  for (const [fill, q] of faces) {
    path3(ctx, cam, [...q, q[0]].map(([x, y, z]) => ({ x, y, z })));
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = line; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
}

/* ---------- the workstation: standing desk, keyboard, monitor turned toward the figure ---------- */
export function workstation(ctx, cam, { ink, bg, x = 0, screen = 1 } = {}) {
  const lit = mix(bg, ink, 0.92), mid = mix(bg, ink, 0.34), dark = mix(bg, ink, 0.16), edge = mix(bg, ink, 0.85);
  box3(ctx, cam, [x + 0.86, x + 1.26], [0, 0.03], [-0.3, 0.3], { top: mid, front: dark, side: dark, edge });       // foot
  box3(ctx, cam, [x + 1.02, x + 1.09], [0.03, 0.97], [-0.035, 0.035], { front: mid, side: dark, edge });          // column
  box3(ctx, cam, [x + 0.98, x + 1.13], [0.5, 0.56], [-0.07, 0.07], { top: mid, front: dark, side: dark, edge });  // collar
  box3(ctx, cam, [x + 0.02, x + 1.3], [0.965, 1.015], [-0.34, 0.34], { top: lit, front: mid, side: dark, edge });  // top
  box3(ctx, cam, [x + 0.2, x + 0.56], [1.015, 1.03], [-0.16, 0.04], { top: mid, front: dark, edge, line: 1 });    // keyboard
  box3(ctx, cam, [x + 0.86, x + 0.92], [1.015, 1.15], [0.0, 0.06], { front: mid, side: dark, edge });              // monitor neck
  // the screen faces the figure (turned ~50 deg); its light is what lights the figure's front
  panel(ctx, cam, { x: x + 0.84, y: 1.12, z: 0.06 }, 0.74, 0.46, 0.88, (c, w, h, s) => {
    c.lineJoin = 'round';
    c.fillStyle = dark; c.beginPath(); c.roundRect(0, 0, w, h, 0.025); c.fill();
    c.strokeStyle = edge; c.lineWidth = 1.6 / s; c.stroke();
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, mix(bg, ink, 0.55 * screen + 0.1)); g.addColorStop(1, mix(bg, ink, 0.25 * screen + 0.08));
    c.fillStyle = g; c.beginPath(); c.roundRect(0.03, 0.03, w - 0.06, h - 0.06, 0.012); c.fill();
    c.fillStyle = bg; c.globalAlpha = 0.55 * screen;
    for (let i = 0; i < 4; i++) c.fillRect(0.08, 0.1 + i * 0.075, (0.42 - i * 0.07), 0.022);
    c.globalAlpha = 1;
  });
}

/* ---------- AI panel: a floating glass sheet with one prompt ---------- */
export function aiPanel(c, w, h, s, { ink, bg, live, prompt = '', caret = 1, progress = 0, font = '"JetBrains Mono"' }) {
  const px = (v) => v / s; // screen px -> metres in this panel
  c.lineJoin = 'round';
  c.fillStyle = 'rgba(246,244,238,0.05)'; c.beginPath(); c.roundRect(0, 0, w, h, 0.03); c.fill();
  c.strokeStyle = mix(bg, ink, 0.8); c.lineWidth = px(1.6); c.stroke();
  // corner registration ticks (technical frame)
  c.strokeStyle = ink; c.lineWidth = px(2.2); const t = 0.05;
  for (const [x, y, dx, dy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]]) { c.beginPath(); c.moveTo(x + dx * t, y); c.lineTo(x, y); c.lineTo(x, y + dy * t); c.stroke(); }
  // header: mark + label
  c.strokeStyle = ink; c.lineWidth = px(1.8);
  c.beginPath(); c.arc(0.075, 0.075, 0.03, 0, Math.PI * 2); c.stroke();
  c.fillStyle = ink; c.beginPath(); c.arc(0.075, 0.075, 0.009, 0, Math.PI * 2); c.fill();
  c.font = `500 ${px(19)}px ${font}`; c.letterSpacing = `${px(3)}px`; c.fillStyle = mix(bg, ink, 0.6); c.textBaseline = 'middle';
  c.fillText('ASSISTANT', 0.125, 0.077);
  c.strokeStyle = mix(bg, ink, 0.3); c.lineWidth = px(1); c.beginPath(); c.moveTo(0, 0.15); c.lineTo(w, 0.15); c.stroke();
  // prompt
  c.font = `400 ${px(25)}px ${font}`; c.letterSpacing = '0px'; c.fillStyle = ink;
  c.fillText('›', 0.04, 0.22);
  c.fillText(prompt, 0.085, 0.22);
  const pw = c.measureText(prompt).width;
  if (caret > 0) { c.fillStyle = live; c.globalAlpha = caret; c.fillRect(0.09 + pw, 0.2, px(12), px(26) * 0.85); c.globalAlpha = 1; }
  // response skeleton: lines that fill as it builds
  for (let i = 0; i < 3; i++) {
    const L = [0.62, 0.48, 0.3][i] * w, k = Math.max(0, Math.min(1, progress * 3 - i));
    c.fillStyle = mix(bg, ink, 0.18); c.fillRect(0.04, 0.3 + i * 0.055, L, px(9));
    c.fillStyle = mix(bg, ink, 0.85); c.fillRect(0.04, 0.3 + i * 0.055, L * k, px(9));
  }
}

/* ---------- creations: four recognisable kinds of thing people build ---------- */
export const CREATION_SIZE = { site: [1.0, 0.7], store: [0.86, 0.84], app: [0.42, 0.8], product: [0.6, 0.66] };

export function creation(c, type, w, h, s, { ink, bg, alpha = 1, live, accent = 0 }) {
  const px = (v) => v / s, cut = bg;
  c.globalAlpha = alpha; c.lineJoin = 'round'; c.lineCap = 'round';
  const solid = (fn) => { c.fillStyle = ink; c.beginPath(); fn(); c.fill(); };
  if (type === 'site') {
    solid(() => c.roundRect(0, 0, w, h, 0.035));
    c.fillStyle = cut; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0.05 + i * 0.04, 0.045, 0.012, 0, Math.PI * 2); c.fill(); }
    c.fillRect(0, 0.088, w, px(2.2));
    c.beginPath(); c.roundRect(0.06, 0.15, w * 0.88, h * 0.36, 0.015); c.fill();          // hero
    c.fillStyle = ink; c.fillRect(0.1, 0.22, w * 0.42, px(5)); c.fillRect(0.1, 0.26, w * 0.28, px(4));
    c.fillStyle = cut; for (let i = 0; i < 3; i++) c.fillRect(0.06 + i * (w * 0.3), h * 0.62, w * 0.24, h * 0.22); // cards
  } else if (type === 'store') {
    // awning (scalloped), body, door, window
    c.fillStyle = ink; c.fillRect(0.04, h * 0.3, w - 0.08, h * 0.7);
    c.beginPath(); c.moveTo(0, h * 0.06); c.lineTo(w, h * 0.06); c.lineTo(w, h * 0.24);
    const n = 5, sw = w / n; for (let i = n - 1; i >= 0; i--) c.arc(sw * i + sw / 2, h * 0.24, sw / 2, 0, Math.PI, false);
    c.closePath(); c.fill();
    c.fillStyle = cut; for (let i = 1; i < n; i++) c.fillRect(sw * i - px(1.1), h * 0.06, px(2.2), h * 0.18);
    c.beginPath(); c.roundRect(w * 0.1, h * 0.46, w * 0.42, h * 0.26, 0.01); c.fill();
    c.beginPath(); c.roundRect(w * 0.62, h * 0.46, w * 0.24, h * 0.54, [0.06, 0.06, 0, 0]); c.fill();
  } else if (type === 'app') {
    solid(() => c.roundRect(0, 0, w, h, 0.06));
    c.fillStyle = cut; c.beginPath(); c.roundRect(0.025, 0.025, w - 0.05, h - 0.05, 0.045); c.fill();
    c.fillStyle = ink; c.beginPath(); c.roundRect(w * 0.36, 0.04, w * 0.28, px(6), 0.01); c.fill();
    c.beginPath(); c.arc(w / 2, h * 0.3, w * 0.17, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.roundRect(0.06, h * 0.5 + i * h * 0.12, w - 0.12, h * 0.075, 0.012); c.fill(); }
  } else if (type === 'product') {
    // a bottle-and-box pairing: a product, not a dashboard
    c.fillStyle = ink;
    c.beginPath(); c.roundRect(w * 0.08, h * 0.32, w * 0.42, h * 0.68, 0.03); c.fill();
    c.beginPath(); c.roundRect(w * 0.2, h * 0.16, w * 0.18, h * 0.18, 0.01); c.fill();
    c.beginPath(); c.roundRect(w * 0.18, h * 0.06, w * 0.22, h * 0.09, 0.012); c.fill();
    c.beginPath(); c.roundRect(w * 0.56, h * 0.52, w * 0.4, h * 0.48, 0.02); c.fill();
    c.fillStyle = cut; c.fillRect(w * 0.08, h * 0.56, w * 0.42, px(2.2)); c.fillRect(w * 0.08, h * 0.78, w * 0.42, px(2.2));
    c.fillRect(w * 0.56, h * 0.64, w * 0.4, px(2.2));
  }
  if (accent > 0) { c.globalAlpha = alpha * accent; c.strokeStyle = live; c.lineWidth = px(3); c.beginPath(); c.roundRect(-0.03, -0.03, w + 0.06, h + 0.06, 0.05); c.stroke(); }
  c.globalAlpha = 1;
}
