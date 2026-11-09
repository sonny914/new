// MiniatureEnvironment: the things people build and the machinery of a working business, in one drawing language:
// luminous cream solids, bg-coloured cut lines, secondary-grey supports, technical-grey annotations.
// Panel art works in metres (origin top-left, y down); 3D pieces use box3 in world space.
import { mix } from './color.js';
import { creation, box3 } from './illustrations.js';
import { panel, floorCircle } from './space.js';

export const SIZE = { site: [1.0, 0.7], store: [0.9, 0.88], app: [0.42, 0.8], product: [0.6, 0.66], building: [0.8, 1.15], course: [0.9, 0.64], calendar: [0.9, 0.9] };

/** Draw any creation type. tone 0..1 = brightness (fog / de-emphasis). done = outcome achieved (calendar check). */
export function thing(c, type, w, h, s, { P, tone = 1, done = 0 }) {
  const ink = mix(P.bg, P.ink, tone), cut = P.bg, px = (v) => v / s;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (type === 'building') {
    c.fillStyle = ink; c.beginPath(); c.roundRect(0.04, 0.08, w - 0.08, h - 0.08, [0.02, 0.02, 0, 0]); c.fill();
    c.fillRect(0, 0.04, w, 0.06);                                                       // parapet
    c.fillStyle = cut;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) c.fillRect(0.12 + k * (w - 0.24) / 3 + 0.02, 0.18 + r * 0.17, (w - 0.24) / 3 - 0.06, 0.1);
    c.beginPath(); c.roundRect(w / 2 - 0.09, h - 0.24, 0.18, 0.24, [0.05, 0.05, 0, 0]); c.fill(); // door
  } else if (type === 'course') {
    c.fillStyle = ink; c.beginPath(); c.roundRect(0, 0, w, h, 0.035); c.fill();
    c.fillStyle = cut; c.beginPath(); c.roundRect(0.05, 0.05, w - 0.1, h * 0.55, 0.02); c.fill();
    c.fillStyle = ink; c.beginPath(); const cx = w / 2, cy = 0.05 + h * 0.275, r = 0.075; c.moveTo(cx - r * 0.6, cy - r); c.lineTo(cx + r, cy); c.lineTo(cx - r * 0.6, cy + r); c.closePath(); c.fill();
    c.fillStyle = cut; c.fillRect(0.05, h * 0.7, w - 0.1, px(3)); c.fillRect(0.05, h * 0.7 - px(2), (w - 0.1) * 0.38, px(7));
    c.fillRect(0.05, h * 0.8, w * 0.5, px(4)); c.fillRect(0.05, h * 0.88, w * 0.34, px(4));
  } else if (type === 'calendar') {
    const live = done;
    c.fillStyle = mix(P.bg, ink, 0.25 + 0.75 * live); c.beginPath(); c.roundRect(0, 0.06, w, h - 0.06, 0.035); c.fill();
    c.fillStyle = cut; c.fillRect(0, 0.2, w, px(2.5));
    for (const x of [0.22, w - 0.22]) { c.fillStyle = P.ink2; c.beginPath(); c.roundRect(x - 0.02, 0, 0.04, 0.12, 0.02); c.fill(); }
    const cols = 5, rows = 4, gw = (w - 0.12) / cols, gh = (h - 0.36) / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = 0.06 + k * gw, y = 0.28 + r * gh, hit = r === 1 && k === 3;
      c.fillStyle = cut; c.beginPath(); c.roundRect(x + 0.012, y + 0.012, gw - 0.024, gh - 0.024, 0.008); c.fill();
      if (hit) { // the booked slot: empty and dashed until the system delivers it, then filled with a check
        c.save(); c.strokeStyle = ink; c.lineWidth = px(2); if (live < 1) c.setLineDash([px(4), px(4)]);
        c.beginPath(); c.roundRect(x + 0.02, y + 0.02, gw - 0.04, gh - 0.04, 0.008); c.stroke(); c.restore();
        if (live > 0) { c.globalAlpha = live; c.fillStyle = ink; c.beginPath(); c.roundRect(x + 0.02, y + 0.02, gw - 0.04, gh - 0.04, 0.008); c.fill();
          c.strokeStyle = cut; c.lineWidth = px(4); c.beginPath(); c.moveTo(x + gw * 0.28, y + gh * 0.52); c.lineTo(x + gw * 0.44, y + gh * 0.68); c.lineTo(x + gw * 0.74, y + gh * 0.32); c.stroke(); c.globalAlpha = 1; }
      }
    }
  } else creation(c, type, w, h, s, { ink, bg: P.bg, live: P.live, alpha: c.globalAlpha }); // inherit the caller's fade
}

/** Stand a thing in space. Floating digital things get a floor mark and a tether; grounded ones a contact shadow line. */
export function place(e, cam, it, { P, tone = 1, mark = true, tether = true, done = 0 }) {
  const p = cam.project({ x: it.x, y: 0, z: it.z }); if (!p) return;
  const floating = it.y > 0.12;
  if (mark) { e.save(); e.strokeStyle = P.tech; e.globalAlpha *= Math.min(1, tone * 1.1); e.lineWidth = 1.2; if (!floating) e.setLineDash([3, 4]); floorCircle(e, cam, it.x, it.z, it.w * 0.55, 0, 48); e.stroke(); e.restore(); }
  if (tether && floating) { const a = cam.project({ x: it.x, y: it.y, z: it.z }); if (a) { e.save(); e.globalAlpha *= Math.min(1, tone * 1.1); e.strokeStyle = P.tech; e.lineWidth = 1; e.setLineDash([3, 5]); e.beginPath(); e.moveTo(p.x, p.y); e.lineTo(a.x, a.y); e.stroke(); e.restore(); } }
  panel(e, cam, { x: it.x, y: it.y, z: it.z }, it.w, it.h, it.yaw ?? 0, (g, w, h, s) => thing(g, it.type, w, h, s, { P, tone, done }));
}

/** The process: a machine housing fed by a conveyor. items = 0..1 phase of the goods on the belt (null = stalled, empty). */
export function machine(e, cam, { P, x, z, items = null, tone = 1 }) {
  const lit = mix(P.bg, P.ink, tone), mid = mix(P.bg, P.ink2, 0.5 * tone), dark = mix(P.bg, P.ink2, 0.22 * tone), edge = mix(P.bg, P.ink2, tone);
  // conveyor in from the left: belt on two legs, rollers implied by end caps
  for (const lx of [x - 1.3, x - 0.62]) box3(e, cam, [lx, lx + 0.04], [0, 0.42], [z - 0.12, z - 0.08], { front: mid, side: dark, edge, line: 1 });
  box3(e, cam, [x - 1.4, x - 0.45], [0.42, 0.47], [z - 0.2, z + 0.2], { top: mid, front: dark, side: dark, edge, line: 1.1 });
  if (items != null) for (let i = 0; i < 3; i++) { const u = (items + i / 3) % 1, bx = x - 1.35 + u * 0.85; box3(e, cam, [bx, bx + 0.14], [0.47, 0.6], [z - 0.08, z + 0.06], { top: lit, front: mid, side: dark, edge: lit, line: 1 }); }
  // housing
  box3(e, cam, [x - 0.45, x + 0.45], [0, 1.05], [z - 0.35, z + 0.35], { top: lit, front: mid, side: dark, edge: lit, line: 1.3 });
  box3(e, cam, [x - 0.3, x + 0.3], [1.05, 1.13], [z - 0.2, z + 0.2], { top: lit, front: mid, side: dark, edge: lit, line: 1.1 });
  // front face: gauge (needle shows load), intake slot, three status ticks
  panel(e, cam, { x, y: 0.0, z: z - 0.352 }, 0.9, 1.05, 0, (c, w, h, s) => {
    const px = (v) => v / s;
    c.strokeStyle = P.bg; c.lineWidth = px(2); c.lineCap = 'round';
    c.beginPath(); c.arc(w / 2, 0.36, 0.17, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
    for (let i = 0; i <= 6; i++) { const a = Math.PI * (0.8 + i * 1.4 / 6); c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 0.13, 0.36 + Math.sin(a) * 0.13); c.lineTo(w / 2 + Math.cos(a) * 0.17, 0.36 + Math.sin(a) * 0.17); c.stroke(); }
    const load = items == null ? 0.05 : 0.7, a = Math.PI * (0.8 + load * 1.4);
    c.lineWidth = px(3); c.beginPath(); c.moveTo(w / 2, 0.36); c.lineTo(w / 2 + Math.cos(a) * 0.12, 0.36 + Math.sin(a) * 0.12); c.stroke();
    c.fillStyle = P.bg; c.beginPath(); c.roundRect(0.14, 0.66, w - 0.28, 0.07, 0.02); c.fill();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.roundRect(0.14 + i * 0.1, 0.84, 0.06, 0.06, 0.01); c.fill(); }
  });
}
