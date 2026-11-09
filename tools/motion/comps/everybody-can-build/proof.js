// PHASE 3 proof (5 s): one object multiplies into hundreds, then reorganizes into a functioning system.
// Idea per beat:
//   0.0-0.9  one built thing (drawn on, close up: it has an interface, an identity)
//   0.9-2.8  1 -> 10 -> 100 -> 512: each new object divides out of its nearest neighbour (creation is cheap);
//            the camera pulls back at the same log rate, and the objects lose their detail (they stop being special)
//   2.8-3.1  hold: a field of near-identical things; the count lands in orange (the event)
//   3.0-4.3  they reorganize in flow order, top to bottom, into modules and wires (coordination)
//   3.9-5.0  information runs through it (the system works)
import { clamp, lerp, seg, ease, arc, hash, smax } from '../../engine/math.js';
import { key } from '../../engine/timeline.js';
import { camera } from '../../engine/camera.js';
import { tile } from '../../engine/glyphs.js';
import { phyllo, parents, birthTimes, assign, jitter } from '../../engine/field.js';
import { network, flowAt } from '../../engine/network.js';
import { mix, PALETTES } from '../../engine/color.js';

const W = 1080, H = 1920, N = 512, PITCH = 19, TILE = 14;
const P = PALETTES.brief;

// --- creation: sunflower slots, each born from its nearest elder, in three multiplying gestures
// shifted so the first object sits exactly at the origin (the close-up is centred on it)
const S0 = phyllo(0, PITCH);
const slots = Array.from({ length: N }, (_, k) => phyllo(k, PITCH, -S0.x, -S0.y));
const parent = parents(slots);
const born = birthTimes(N, [{ count: 10, at: 0.95, dur: 0.38 }, { count: 100, at: 1.55, dur: 0.5 }, { count: N, at: 2.18, dur: 0.6, curve: 0.7 }], 0.12);
const TRAVEL = 0.42;
const fit = (n) => 330 / (PITCH * Math.sqrt(n)); // zoom that frames n objects

function fieldPos(k, t) {
  if (k === 0) return slots[0];
  const b = born[k], q = ease.out5(seg(t, b, b + TRAVEL));
  return arc(fieldPos(parent[k], b), slots[k], q, 0.22 * jitter(k, 3)); // leaves from where the parent was at birth
}

// --- coordination: a seven-module pipeline (portrait), depth = order information passes through it
const sys = network({
  nodes: [
    { id: 'A', x: 0, y: -560, depth: 0 },
    { id: 'B', x: -290, y: -270, depth: 1 }, { id: 'C', x: 290, y: -270, depth: 1 },
    { id: 'D', x: 0, y: 20, depth: 2 },
    { id: 'E', x: -290, y: 310, depth: 3 }, { id: 'F', x: 290, y: 310, depth: 3 },
    { id: 'G', x: 0, y: 600, depth: 4 },
  ],
  edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E'], ['D', 'F'], ['E', 'G'], ['F', 'G']],
  grid: 5, cell: 19, dotTotal: N - 7 * 25,
});
const map = assign(slots, sys.slots, { band: 25 });
const REORG = 2.98, SPREAD = 0.5, MOVE = 0.92, FLOW = { start: 3.86, speed: 4.6, period: 0.95, width: 0.42 };

function draw(ctx, t) {
  const zoom = key(t, [[0, 17], [0.95, 15.5], [1.42, fit(10), ease.inOut3], [2.08, fit(100), ease.inOut3], [2.95, 1, ease.inOut3], [5, 0.94, ease.inOut3]]);
  const cam = camera({ W, H, zoom, x: 0, y: key(t, [[0, 0], [2.9, 0], [4.4, 20, ease.inOut3]]) });

  for (let k = 0; k < N; k++) {
    if (t < born[k]) continue;
    const target = map[k], s = target >= 0 ? sys.slots[target] : null;
    // reorganize: departures ordered by where the particle lands in the flow (the system assembles input -> output)
    const d0 = REORG + (s ? (s.flow / 4) * SPREAD : 0.1) + jitter(k, 7) * 0.06;
    const m = ease.inOut5(seg(t, d0, d0 + MOVE));
    let p = fieldPos(k, t), size = TILE, round = 0.28, fill = 0, color = P.ink, alpha = 1;
    // birth: grow out of the parent
    const g = seg(t, born[k], born[k] + 0.3);
    size *= lerp(0.35, 1, ease.out3(g)); alpha *= ease.out3(clamp(g * 2));
    if (s) {
      p = arc(p, s, m, 0.14 * jitter(k, 11));
      if (s.kind === 'dot') { const mm = ease.inOut3(seg(m, 0.15, 0.85)); size = lerp(size, 3.4, mm); round = lerp(round, 1, mm); fill = mm; }
      const f = m >= 1 ? flowAt(s.kind === 'cell' ? s.flow + s.ring * 0.05 : s.flow, t, FLOW) : 0;
      if (f > 0) { color = mix(P.ink, P.live, f); if (s.kind === 'cell') fill = Math.max(fill, f * 0.9); else size *= 1 + 0.45 * f; }
    } else {
      // not needed by the system: thins out and drops back
      const out = seg(t, REORG, REORG + 0.5); alpha *= 1 - ease.out3(out); p = { ...p, z: 400 * ease.in3(out) };
    }
    const sp = cam.project(p), px = size * sp.s;
    // the first object keeps its interface detail only while it is alone and close
    tile(ctx, sp.x, sp.y, px, { round, fill, color, alpha, line: px > 40 ? 2 : 1.6, trim: k === 0 ? ease.inOut3(seg(t, 0.12, 0.8)) : 1, detail: k === 0 ? ease.out3(seg(t, 0.5, 0.85)) : g * clamp((px - 30) / 60), accent: P.live });
  }

  // data callout: the count, with a log-length rule under it
  // whole-frame time: a number must not change inside one motion-blur exposure (it would double-print)
  const tf = Math.round(t * 30) / 30;
  const count = born.reduce((n, b) => n + (tf >= b ? 1 : 0), 0);
  const show = seg(t, 0.85, 1.05) * (1 - seg(t, 2.95, 3.25));
  if (show > 0) {
    const hit = seg(t, 2.78, 2.86), live = hit * (1 - seg(t, 3.0, 3.2));
    ctx.save();
    ctx.globalAlpha = show; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '300 96px "Inter Display"'; ctx.fontVariantNumeric = 'tabular-nums'; ctx.letterSpacing = '-2px';
    ctx.fillStyle = mix(P.ink, P.live, live);
    ctx.fillText(String(count), W / 2, 1640);
    const L = 300 * Math.log(count) / Math.log(N);
    ctx.globalAlpha = show * 0.5; ctx.fillStyle = P.ink; ctx.fillRect(W / 2 - 150, 1676, 300, 1);
    ctx.globalAlpha = show; ctx.fillStyle = mix(P.ink, P.live, live); ctx.fillRect(W / 2 - 150, 1675, L, 3);
    ctx.restore();
  }
}

export default { width: W, height: H, fps: 30, duration: 5, palette: P, motionBlur: { samples: 8, shutter: 0.5 }, draw };
