// FILM 003: THE MONEY CHASE. One continuous world, one figure, one orange beacon.
// The picture argues on its own: he chases the money through a maze of shortcuts, builds a machine that makes nothing,
// and then the camera orbits and shows what was there all along: people with problems, and money that only moves
// when one of those problems is solved.
//
//  urgency     0.0   a tiny figure alone; far ahead an orange glow resolves into money. He walks, then runs
//  temptation  2.8   the hustle maze: every structure offers a lit shortcut. Dead ends. A loop back to the start. Bills fall
//  accel.     16.7   overhead: 10 apps, 5 businesses, 100 automations assemble around him in rings
//  exhaustion 23.4   REVENUE $0. The machine keeps running. The camera comes down to him. ACTIVITY ≠ INCOME
//  revelation 30.9   a 180° orbit: the machine sinks, and a network of people with problems lights up across the whole world
//  exchange   40.8   one customer, one broken step. He builds the missing piece; it works; only then does money move, to him
//  question   45.4   top-down: two paths. "How do I make $10,000?" shatters. "What problem is worth solving?" becomes a system
//  clarity    64.1   he stands beside a working system. A customer comes, is helped, pays. Pull back. Quiet Bands
import { clamp, lerp, seg, ease, smoothstep, hash } from '../../engine/math.js';
import { billboard, path3, floorCircle } from '../../engine/space.js';
import { makeLayers, halo, glow, cone, vignette, grain } from '../../engine/light.js';
import { human } from '../../engine/humans.js';
import { thing } from '../../engine/environments.js';
import { PALETTES, mix } from '../../engine/color.js';
import { setPalette, P, mono } from '../everybody-can-build/film-keys.js';
import { headline, kicker, endCard, brandPath, brk } from '../shared/story.js';
import { lookAt, v3, lerp3, track, at, part, fillet, arc3, line3, pulse, solid, wire, shadow, figure, setWorldPalette, coin } from '../../engine/world.js';

const W = 1080, H = 1920, FPS = 30;
let L, TL, B, MARK, WORD;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
const C = { x: 0, y: 0, z: 30 };                              // the plaza at the centre of the world

/* ======================= the figure's route ======================= */
// [t, x, z]: the chase (0-3.6), the maze (3.6-16.6, turns, two dead ends, a loop back), then he stands in the plaza.
const ROUTE = [[0, 0, 0], [1.4, 0, 0], [2.3, 0, 1.1], [3.6, 0, 7.5], [5.0, 0, 13.0], [6.4, 4.6, 16.2], [6.9, 4.6, 16.2], [8.0, 2.6, 20.5], [9.3, -3.0, 23.5],
  [10.3, -5.6, 21.0], [10.6, -5.6, 21.0], [11.8, -3.6, 16.5], [12.9, -0.4, 13.6], [13.4, -0.4, 13.6], [14.2, 0, 17.4], [15.7, 0, 26.6], [16.6, 0, 30], [999, 0, 30]];
const ROUTE_D = (() => { const d = [0]; for (let i = 1; i < ROUTE.length; i++) d.push(d[i - 1] + Math.hypot(ROUTE[i][1] - ROUTE[i - 1][1], ROUTE[i][2] - ROUTE[i - 1][2])); return d; })();
function figAt(t) {
  let i = 1; while (i < ROUTE.length - 1 && ROUTE[i][0] < t) i++;
  const [t0, x0, z0] = ROUTE[i - 1], [t1, x1, z1] = ROUTE[i], len = ROUTE_D[i] - ROUTE_D[i - 1];
  const stopA = i < 2 || (ROUTE[i - 2][1] === x0 && ROUTE[i - 2][2] === z0), stopB = i >= ROUTE.length - 1 || (ROUTE[i + 1][1] === x1 && ROUTE[i + 1][2] === z1);
  let u = seg(t, t0, t1); if (len > 0) u = stopA && stopB ? ease.inOut3(u) : stopA ? ease.in3(u) * 0.35 + u * 0.65 : stopB ? 1 - (1 - u) ** 2 * 0.5 - (1 - u) * 0.5 : u;
  return { x: lerp(x0, x1, u), z: lerp(z0, z1, u), dist: ROUTE_D[i - 1] + len * u };
}
function figState(t) {
  const p = figAt(t), a = figAt(t - 0.12), b = figAt(t + 0.12), sp = Math.hypot(b.x - a.x, b.z - a.z) / 0.24;
  let hx = b.x - a.x, hz = b.z - a.z;
  if (Math.hypot(hx, hz) < 0.02) { // standing: face where he is about to go, or where he just came from, or the money
    const n = figAt(t + 0.6), q = figAt(t - 0.6); hx = n.x - q.x; hz = n.z - q.z; if (Math.hypot(hx, hz) < 0.02) { hx = 0; hz = 1; }
  }
  const hl = Math.hypot(hx, hz);
  return { x: p.x, z: p.z, hx: hx / hl, hz: hz / hl, run: smoothstep(clamp((sp - 1.4) / 2.2)), walk: smoothstep(clamp(sp / 1.2)), phase: p.dist / 1.7 * Math.PI * 2, sp };
}

/* ======================= the world ======================= */
// architecture: the corridor that rises around the chase, and the giants far off that give the world its size
const CORRIDOR = Array.from({ length: 16 }, (_, i) => { const side = i % 2 ? 1 : -1; return { x: side * (3.2 + 4.8 * hash(i, 1)), z: -1 + i * 0.62 + hash(i, 2) * 0.5, w: 0.5 + 1.3 * hash(i, 3), d: 0.5 + 1.6 * hash(i, 4), h: 6 + 16 * hash(i, 5) ** 1.5, rise: 0.5 + i * 0.16, rungs: Math.floor(hash(i, 6) * 5) }; });
const GIANTS = Array.from({ length: 22 }, (_, i) => { const side = i % 2 ? 1 : -1; return { x: side * (14 + 18 * hash(i, 11)), z: -6 + i * 4.4 + 3 * hash(i, 12), w: 2 + 4 * hash(i, 13), d: 2 + 5 * hash(i, 14), h: 22 + 30 * hash(i, 15), rungs: 2 + Math.floor(hash(i, 16) * 6) }; });

// the maze: named offers (each lights a shortcut toward the money) and the generic hustle around them
const OFFERS = [
  { name: 'NEW APP', type: 'app', x: 2.1, z: 12.0, on: 4.2, off: 6.6, path: [[0, 13.0], [4.6, 16.2], [5.3, 18.4]], wall: { x: 5.3, z: 18.6, w: 2.6 }, dead: 6.4 },
  { name: 'DROPSHIP STORE', type: 'store', x: 4.7, z: 21.6, on: 6.9, off: 8.6, path: [[4.6, 16.2], [2.6, 20.5], [-3.0, 23.5]] },
  { name: 'CREATOR PLATFORM', type: 'course', x: -2.2, z: 25.9, on: 8.6, off: 10.6, path: [[-3.0, 23.5], [-5.6, 21.0], [-6.6, 20.0]], wall: { x: -6.7, z: 19.8, w: 2.6, yaw: 1 }, dead: 10.3 },
  { name: 'AUTOMATION', type: 'calendar', x: -5.1, z: 15.4, on: 10.7, off: 12.9, path: [[-5.6, 21.0], [-3.6, 16.5], [-0.4, 13.6]], loop: 12.9 },
  { name: 'SIDE HUSTLE', type: 'product', x: 2.0, z: 24.4, on: 13.5, off: 16.0, path: [[-0.4, 13.6], [0, 17.4], [0, 26.6], [0, 29.4]] },
].map((o) => ({ ...o, tr: track(fillet(o.path.map(([x, z]) => v3(x, 0, z)), 0.9)) }));
const TYPES = ['app', 'store', 'site', 'product', 'course', 'building', 'calendar'];
const ROUTE_PTS = ROUTE.slice(0, -1).map(([, x, z]) => ({ x, z }));
const nearRoute = (x, z) => { let m = 99; for (let i = 1; i < ROUTE_PTS.length; i++) { const a = ROUTE_PTS[i - 1], b = ROUTE_PTS[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, u = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2); m = Math.min(m, Math.hypot(x - a.x - u * dx, z - a.z - u * dz)); } return m; };
const MAZE = [];
for (let gx = -3; gx <= 2; gx++) for (let gz = 0; gz < 10; gz++) {
  const x = gx * 3 + 1.5, z = 10.5 + gz * 3, i = (gx + 3) * 10 + gz;
  if (nearRoute(x, z) < 1.55 || Math.hypot(x - C.x, z - C.z) < 5.4 || OFFERS.some((o) => Math.hypot(o.x - x, o.z - z) < 1.8)) continue;
  const tall = hash(i, 21) > 0.8 && nearRoute(x, z) > 2.6 && Math.hypot(x - C.x, z - C.z) > 9.5;
  MAZE.push({ x: x + (hash(i, 22) - 0.5) * 0.5, z: z + (hash(i, 23) - 0.5) * 0.5, w: 1.3 + 0.7 * hash(i, 24), d: 1.3 + 0.7 * hash(i, 25), h: tall ? 3.5 + 3 * hash(i, 26) : 0.7 + 1.6 * hash(i, 26), type: TYPES[Math.floor(hash(i, 27) * TYPES.length)] });
}
for (const o of OFFERS) MAZE.push({ x: o.x, z: o.z, w: 1.5, d: 1.5, h: 1.3, type: o.type, offer: o });

// the activity machine (assembles in rings around him in the plaza)
const APPS = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2 + 0.31; return { x: C.x + Math.cos(a) * 2.1, z: C.z + Math.sin(a) * 2.1, k: i }; });
const BIZ = Array.from({ length: 5 }, (_, i) => { const a = i / 5 * Math.PI * 2 + 1.53; return { x: C.x + Math.cos(a) * 3.7, z: C.z + Math.sin(a) * 3.7, k: i }; });
const ring = (r, n = 72) => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI * 2; return v3(C.x + Math.cos(a) * r, 0, C.z + Math.sin(a) * r); });
const LOOP1 = track(ring(2.9)), LOOP2 = track(ring(4.6)), LOOP3 = track(ring(1.35, 48));
const GEARS = Array.from({ length: 4 }, (_, i) => { const a = i / 4 * Math.PI * 2 + 0.2; return { x: C.x + Math.cos(a) * 5.1, z: C.z + Math.sin(a) * 5.1, k: i }; });

// the value network: people with problems, people who solve them, joined by paths through the same streets
const CUST = [[-6, 21], [6, 24], [-9, 27], [9, 27], [-6, 15], [3, 18], [-3, 21], [6, 15], [-9, 33], [9, 21]].map(([x, z], i) => ({ x, z, i }));
const MAKERS = [{ x: -10.5, z: 18 }, { x: 10.5, z: 28.5 }, { x: -1.5, z: 12 }, { x: 10.5, z: 16.5 }, { x: -11, z: 30 }];
const EDGES = CUST.map((c, i) => {
  const m = MAKERS.reduce((best, k, j) => (Math.hypot(k.x - c.x, k.z - c.z) < Math.hypot(MAKERS[best].x - c.x, MAKERS[best].z - c.z) ? j : best), 0), mk = MAKERS[m];
  const pts = fillet([v3(c.x, 0, c.z), v3(c.x, 0, mk.z), v3(mk.x, 0, mk.z)], 1.2);
  return { c, m, tr: track(pts), d: Math.hypot(c.x - C.x, c.z - C.z), fire: 37.4 + [0, 3, 6, 1, 8, 4, 2, 7, 5, 9][i] * 0.62 };
});
// the one exchange we follow (S5): his customer, a broken step, and him
const K0 = { x: -4.5, z: 28.7 }, WA = { x: -3.45, z: 28.7 }, WB = { x: -2.25, z: 28.7 }, WD = { x: -1.15, z: 28.7 };
const FLOW = track([v3(K0.x + 0.3, 0, K0.z), v3(WA.x, 0, WA.z), v3(WB.x, 0, WB.z), v3(WD.x, 0, WD.z)]);
const PAY = track(arc3(v3(K0.x + 0.1, 1.0, K0.z), v3(C.x - 0.15, 1.05, C.z), 1.35, 40));
// the fork (S6): two questions as two paths on the floor, seen from directly above
const PA = track(fillet([v3(0, 0, 29.4), v3(1.2, 0, 27), v3(3.0, 0, 24.5), v3(4.6, 0, 21), v3(5.4, 0, 16.6)], 1.2));
const NODES = [{ x: -2.2, z: 27.2, t: 'COSTLY PROBLEM', g: 'bang' }, { x: -4.4, z: 24.6, t: 'A SPECIFIC CUSTOMER', g: 'person' }, { x: -5.2, z: 21.2, t: 'HOW THEY COPE NOW', g: 'tape' },
  { x: -4.4, z: 17.9, t: 'YOUR SOLUTION', g: 'box' }, { x: -2.6, z: 15.4, t: 'A TESTABLE OFFER', g: 'tag' }];
const PB = track(fillet([v3(0, 0, 29.4), ...NODES.map((n) => v3(n.x, 0, n.z))], 1.0));
const PB_PAY = track(fillet([v3(NODES[1].x, 0, NODES[1].z), v3(-1.9, 0, 25.8), v3(-0.5, 0, 28.2), v3(0, 0, 29.4)], 0.8));
const NODE_U = (() => { let acc = [0], l = 0; const pts = [v3(0, 0, 29.4), ...NODES.map((n) => v3(n.x, 0, n.z))]; for (let i = 1; i < pts.length; i++) { l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); acc.push(l); } return acc.slice(1).map((v) => v / l); })();

/* ======================= camera ======================= */
let SHOTS;
function camAt(t) {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1].a) i++;
  const s = SHOTS[i], v = s.fn(t);
  if (i > 0 && t < s.a + s.d) { const p = SHOTS[i - 1].fn(t), k = ease.inOut3(seg(t, s.a, s.a + s.d)); return lookAt(W, H, lerp3(p.pos, v.pos, k), lerp3(p.tgt, v.tgt, k), lerp(p.f, v.f, k)); }
  return lookAt(W, H, v.pos, v.tgt, v.f);
}

/* ======================= drawing helpers ======================= */
const TONE = { top: () => mix(P.bg, P.ink2, 0.32), side: () => mix(P.bg, P.ink2, 0.12), end: () => mix(P.bg, P.ink2, 0.2), edge: () => mix(P.bg, P.ink2, 0.55) };
function emblem(e, cam, x, y, z, type, size, tone, alpha) {
  if (alpha <= 0.01) return;
  billboard(e, cam, v3(x, y, z), (c, s) => { c.globalAlpha *= alpha; const w = size, h = size * 0.82; c.translate(-w / 2, -h); thing(c, type, w, h, s, { P, tone }); });
}
function tag3(ctx, cam, p3, text, a, { color, dy = -18, size = 18, align = 'center', plate = true } = {}) {
  const p = cam.project(p3); if (!p || a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `500 ${size}px "JetBrains Mono"`; ctx.letterSpacing = '3px';
  const tw = ctx.measureText(text).width, x = clamp(align === 'center' ? p.x - tw / 2 : align === 'left' ? p.x : p.x - tw, 40, W - 40 - tw), y = p.y + dy;
  if (plate) { ctx.fillStyle = P.bg; ctx.globalAlpha = a * 0.82; ctx.beginPath(); ctx.roundRect(x - 9, y - size - 2, tw + 18, size + 14, 4); ctx.fill(); ctx.globalAlpha = a; }
  ctx.fillStyle = color ?? P.ink; ctx.fillText(text, x, y); ctx.restore();
}
function envelope(c, s, a) { c.globalAlpha *= a; c.fillStyle = P.ink; c.beginPath(); c.roundRect(-0.2, -0.27, 0.4, 0.27, 0.015); c.fill(); c.strokeStyle = P.bg; c.lineWidth = 1.6 / s; c.beginPath(); c.moveTo(-0.2, -0.27); c.lineTo(0, -0.13); c.lineTo(0.2, -0.27); c.stroke(); c.fillStyle = P.bg; c.font = `700 ${0.06}px "JetBrains Mono"`; c.textAlign = 'center'; c.fillText('DUE', 0, -0.04); }
function gear(c, s, rot, a) { c.globalAlpha *= a; c.save(); c.translate(0, -0.45); c.rotate(rot); c.fillStyle = mix(P.bg, P.ink2, 0.8); for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.fillRect(-0.05, -0.36, 0.1, 0.1); } c.beginPath(); c.arc(0, 0, 0.3, 0, Math.PI * 2); c.fill(); c.fillStyle = P.bg; c.beginPath(); c.arc(0, 0, 0.12, 0, Math.PI * 2); c.fill(); c.restore(); }
/** problem marker above a head: an open ring (unsolved) that closes into a check (solved) */
function marker(ctx, cam, p3, solved, a) {
  const p = cam.project(p3); if (!p || a <= 0.01) return; const r = Math.max(7, p.s * 0.12);
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = Math.max(1.6, r * 0.18); ctx.lineCap = 'round'; ctx.strokeStyle = P.ink;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, -Math.PI / 2 + 0.9 * (1 - solved), -Math.PI / 2 + Math.PI * 2 - 0.9 * (1 - solved) * 0.2); ctx.stroke();
  if (solved > 0.5) { ctx.globalAlpha = a * smoothstep(seg(solved, 0.5, 1)); ctx.beginPath(); ctx.moveTo(p.x - r * 0.45, p.y + r * 0.02); ctx.lineTo(p.x - r * 0.1, p.y + r * 0.36); ctx.lineTo(p.x + r * 0.5, p.y - r * 0.34); ctx.stroke(); }
  else { ctx.fillStyle = P.ink; ctx.font = `800 ${r * 1.25}px "Inter Display"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', p.x, p.y + r * 0.05); }
  ctx.restore();
}
/** node glyphs for the fork, crisp, in screen space */
function glyph(ctx, x, y, g, r, a, hot = 0) {
  ctx.save(); ctx.globalAlpha = a; const col = mix(P.ink, P.live, hot); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = col;
  const k = r * 0.42;
  if (g === 'bang') { ctx.font = `800 ${r * 1.1}px "Inter Display"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y + 1); }
  else if (g === 'person') { ctx.beginPath(); ctx.arc(x, y - k * 0.55, k * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x, y + k * 0.95, k * 0.9, Math.PI, 0); ctx.fill(); }
  else if (g === 'tape') { ctx.beginPath(); ctx.moveTo(x - k, y + k * 0.3); for (let i = 0; i <= 6; i++) ctx.lineTo(x - k + i * k / 3, y + (i % 2 ? -k * 0.35 : k * 0.35)); ctx.stroke(); }
  else if (g === 'box') { ctx.strokeRect(x - k * 0.8, y - k * 0.6, k * 1.6, k * 1.2); ctx.beginPath(); ctx.moveTo(x - k * 0.8, y - k * 0.1); ctx.lineTo(x + k * 0.8, y - k * 0.1); ctx.stroke(); }
  else if (g === 'tag') { ctx.font = `800 ${r * 0.85}px "Inter Display"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$?', x, y + 1); }
  else if (g === 'you') { ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function counter(ctx, x, y, num, label, a, { size = 96, color } = {}) {
  if (a <= 0.01) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `800 ${size}px "Inter Display"`; ctx.fillStyle = color ?? P.ink; ctx.fillText(num, x, y);
  const w = ctx.measureText(num).width; ctx.restore(); mono(ctx, label, x + w + 22, y - size * 0.12, { size: 22, color: P.ink2, track: 5, alpha: a });
}

/* ======================= the frame ======================= */
function draw(ctx, t) {
  setPalette(PALETTES.brand); setWorldPalette(P);
  L ??= makeLayers(W, H);
  const e = L.ectx; e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, W, H); e.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const cam = camAt(t), tm = t, f = figState(t);
  const fin = B.fin, world = 1 - smoothstep(seg(t, fin + 0.2, fin + 1.2));     // the world goes before the end card
  const top = smoothstep(seg(t, B.fork - 0.6, B.fork + 1.2)) * (1 - smoothstep(seg(t, B.shift - 0.3, B.shift + 1.2)));  // the fork's top-down "drawing" mode
  const dimMaze = 1 - 0.75 * smoothstep(seg(t, B.orbit + 0.5, B.orbit + 5)) * (1 - 0.35 * smoothstep(seg(t, B.pay2 + 1, B.pay2 + 2.5))) - 0.25 * top, rev = smoothstep(seg(t, B.orbit + 1.2, B.orbit + 7.0));

  /* ---- the money: where it is ---- */
  const bob = 0.07 * Math.sin(tm * 2.1);
  let M = v3(f.x * 0.3 + 1.1, 2.5 + bob, f.z + 10.5);                                                             // just ahead, out of reach
  M = lerp3(M, v3(0, 3.3 + bob, 32.4), ease.inOut3(seg(t, 3.4, 5.4)));                                     // up above the maze
  const coinDown = ease.inOut3(seg(t, B.give - 1.0, B.give + 0.7));
  M = lerp3(M, v3(K0.x + 0.12, 1.02, K0.z - 0.02), coinDown);                                              // it belongs to someone: the customer
  const payK = ease.inOut3(seg(t, B.pay, B.pay + 0.9)); if (payK > 0) M = at(PAY, payK);                    // and goes to him only once the problem is solved
  const coinA = smoothstep(seg(t, 0.8, 1.8)) * world * (1 - smoothstep(seg(t, B.pay + 1.0, B.pay + 1.4))) * (1 - top);
  const coinLight = coinA * (1 - 0.6 * coinDown);

  /* ---- atmosphere ---- */
  const mp = cam.project(M);
  if (mp && coinA > 0.01) { glow(ctx, mp.x, mp.y, 520 * Math.min(1.4, mp.s / 120), 520 * Math.min(1.4, mp.s / 120), { alpha: 0.18 * coinLight, color: rgb(P.live) }); }
  const fp = cam.project(v3(f.x, 0, f.z));
  if (fp) glow(ctx, fp.x, fp.y, fp.s * 2.6, fp.s * 0.9, { alpha: 0.2 * world * (1 - top) });
  { const hz = cam.project(v3(cam.pos.x + Math.sin(cam.yaw) * 60, 0, cam.pos.z + Math.cos(cam.yaw) * 60)); if (hz) { const g = ctx.createLinearGradient(0, hz.y - 260, 0, hz.y + 120); g.addColorStop(0, 'rgba(242,238,229,0)'); g.addColorStop(0.7, `rgba(242,238,229,${0.035 * world})`); g.addColorStop(1, 'rgba(242,238,229,0)'); ctx.fillStyle = g; ctx.fillRect(0, hz.y - 260, W, 380); } }  // haze on the horizon

  /* ---- floor: the street grid, lit around him ---- */
  {
    const lit = (x, z) => Math.exp(-Math.hypot(x - f.x, z - f.z) / (7 + 10 * rev + 18 * top)) * (0.25 + 0.75 * smoothstep(seg(t, 0.2, 1.2)));
    e.save(); e.lineWidth = 1; e.strokeStyle = P.tech;
    for (let x = -12; x <= 12; x += 3) for (let z = -6; z < 45; z += 1.5) { const a = lit(x, z + 0.75) * world * 0.5; if (a < 0.02) continue; e.globalAlpha = a; path3(e, cam, [v3(x, 0, z), v3(x, 0, z + 1.5)]); e.stroke(); }
    for (let z = -6; z <= 45; z += 3) for (let x = -12; x < 12; x += 1.5) { const a = lit(x + 0.75, z) * world * 0.5; if (a < 0.02) continue; e.globalAlpha = a; path3(e, cam, [v3(x, 0, z), v3(x + 1.5, 0, z)]); e.stroke(); }
    // fine dots near him: the thin illuminated ground he stands on
    e.fillStyle = P.ink2;
    for (let z = Math.floor(f.z) - 6; z <= f.z + 10; z += 0.5) for (let x = Math.floor(f.x) - 6; x <= f.x + 6; x += 0.5) { const d = Math.hypot(x - f.x, z - f.z), a = Math.exp(-d / 2.2) * 0.8 * world * (1 - top); if (a < 0.03) continue; const p = cam.project(v3(x, 0, z)); if (!p) continue; e.globalAlpha = a; e.fillRect(p.x - 0.9, p.y - 0.9, 1.8, 1.8); }
    e.restore();
  }
  // his long shadow, cast back from the money
  if (coinLight > 0.05 && !top) shadow(e, cam, v3(f.x, 0, f.z), v3(M.x, 0, M.z), { len: 2.2 + 3.5 * (M.y / 3.3), w: 0.42, alpha: 0.75 * coinLight * world });
  // the money's pool of light on the floor
  { const q = cam.project(v3(M.x, 0, M.z)); if (q && coinA > 0.01 && coinDown < 0.9) { e.save(); e.globalCompositeOperation = 'lighter'; const r = q.s * 1.6, g = e.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); g.addColorStop(0, `rgba(${rgb(P.live)},${0.16 * coinLight})`); g.addColorStop(1, 'rgba(0,0,0,0)'); e.fillStyle = g; e.save(); e.translate(q.x, q.y); e.scale(1, 0.32); e.translate(-q.x, -q.y); e.fillRect(q.x - r, q.y - r, 2 * r, 2 * r); e.restore(); e.restore(); } }

  /* ---- floor lines: the maze's shortcuts, the machine's loops, the network ---- */
  for (const o of OFFERS) {
    const lay = ease.out3(seg(t, o.on, o.on + 0.7)), gone = o.dead ? smoothstep(seg(t, o.dead + 0.1, o.dead + 0.9)) : smoothstep(seg(t, o.off, o.off + 0.6));
    if (lay <= 0 || gone >= 1) continue;
    const a = (1 - gone) * world;
    if (o.dead && t > o.dead) {   // the shortcut collapses: its pieces break off and drop away
      for (let k = 0; k < 10; k++) { const u0 = k / 10, u1 = (k + 0.8) / 10, kk = clamp(gone * 1.6 - hash(k, 31) * 0.6), pts = part(o.tr, u0, u1, 4).map((q) => ({ x: q.x + (hash(k, 32) - 0.5) * kk * 0.8, y: -kk * 0.0, z: q.z + (hash(k, 33) - 0.5) * kk * 0.8 })); line3(e, cam, pts, { color: P.ink, width: 2.4, alpha: (1 - kk) * 0.9 }); }
    } else line3(e, cam, part(o.tr, 0, lay), { color: P.ink, width: 2.4, alpha: 0.9 * a });
    // a pulse runs ahead along it: "this way"
    if (lay >= 1 && !(o.dead && t > o.dead)) pulse(e, cam, o.tr, ((t - o.on) * 0.9) % 1.2, { color: P.ink, len: 0.25, width: 3, alpha: a, head: 4 });
  }
  // the start ring: where he first took the bait, and where the loop brings him back
  { const a = smoothstep(seg(t, 4.6, 5.0)) * (1 - smoothstep(seg(t, 5.6, 6.2))) + smoothstep(seg(t, 12.6, 13.0)) * (1 - smoothstep(seg(t, 14.0, 14.6)));
    if (a > 0.01) { e.save(); e.globalAlpha = a * world; e.strokeStyle = P.ink; e.lineWidth = 1.6; e.setLineDash([4, 5]); floorCircle(e, cam, -0.2, 13.4, 0.7); e.stroke(); e.restore(); } }
  // the machine's conveyor loops: busy, closed, going nowhere
  const mach = smoothstep(seg(t, B.auto, B.auto + 1.2)) * (1 - 0.75 * smoothstep(seg(t, B.orbit, B.orbit + 1.6))) * world * (1 - top);
  if (mach > 0.01) for (const [tr, n, sp, r] of [[LOOP1, 40, 0.07, 1], [LOOP2, 44, -0.05, 1], [LOOP3, 16, 0.12, 1]]) {
    line3(e, cam, tr.pts, { color: P.tech, width: 1.2, alpha: mach * 0.8 });
    e.save(); e.fillStyle = P.ink2; e.globalAlpha = mach;
    for (let k = 0; k < n; k++) { const q = cam.project(at(tr, ((k / n + tm * sp) % 1 + 1) % 1)); if (q) e.fillRect(q.x - 2, q.y - 2, 4, 4); }
    e.restore();
  }
  // the network, revealed by the orbit: paths between people with problems and people who solve them
  const netA = world * (1 - 0.85 * top), focusN = 1 - 0.6 * smoothstep(seg(t, B.problem - 0.8, B.problem)) * (1 - smoothstep(seg(t, B.pay + 1.2, B.pay + 2)));
  if (rev > 0) for (const ed of EDGES) {
    const k = smoothstep(seg(rev, ed.d / 16 - 0.25, ed.d / 16 + 0.1)); if (k <= 0.01) continue;
    const fired = smoothstep(seg(t, ed.fire + 1.6, ed.fire + 2.2));
    line3(e, cam, part(ed.tr, 0, k), { color: mix(P.ink, mix(P.ink2, P.live, 0.7), fired), width: 2.6 + 0.8 * fired, alpha: 0.85 * netA * focusN, dash: fired > 0.5 ? null : [6, 6] });
    e.save(); e.globalAlpha = k * netA * focusN * 0.8; e.strokeStyle = P.ink; e.lineWidth = 1.6; floorCircle(e, cam, ed.c.x, ed.c.z, 0.55); e.stroke(); const mk0 = MAKERS[ed.m]; floorCircle(e, cam, mk0.x, mk0.z, 0.55); e.stroke(); e.restore();
    // solution travels maker -> customer (cream), then payment customer -> maker (orange), on every cycle
    for (let cyc = 0; cyc < 6; cyc++) { const t0 = ed.fire + cyc * 7.4; const us = seg(t, t0, t0 + 0.9), up = seg(t, t0 + 1.1, t0 + 2.0);
      if (us > 0 && us < 1) pulse(e, cam, ed.tr, 1 - us + 0.0001, { color: P.ink, len: -0.0001 + 0.0002, width: 2, alpha: netA, head: 3 });
      if (up > 0 && up < 1.15) pulse(e, cam, ed.tr, up, { color: P.live, len: 0.18, width: 3, alpha: netA, head: 4 }); }
  }
  // the exchange we follow: his customer's workflow, with one broken step
  const wfA = smoothstep(seg(t, B.orbit + 5.0, B.orbit + 6.5)) * world * (1 - 0.5 * top);
  const fixK = ease.out3(seg(t, B.fix, B.fix + 0.8)), useK = seg(t, B.use, B.use + 0.8), useK2 = seg(t, B.use2, B.use2 + 0.8);
  if (wfA > 0.01) {
    line3(e, cam, [v3(K0.x + 0.3, 0, K0.z), v3(WA.x, 0, WA.z)], { color: P.ink2, width: 2, alpha: wfA });
    line3(e, cam, [v3(WB.x, 0, WB.z), v3(WD.x, 0, WD.z)], { color: P.ink2, width: 2, alpha: wfA });
    // the broken connection: two stubs and a gap, until the fix fills it
    line3(e, cam, [v3(WA.x + 0.25, 0, WA.z), v3(WA.x + 0.45, 0, WA.z)], { color: P.ink2, width: 2, alpha: wfA * (1 - fixK) });
    line3(e, cam, [v3(WB.x - 0.45, 0, WB.z), v3(WB.x - 0.25, 0, WB.z)], { color: P.ink2, width: 2, alpha: wfA * (1 - fixK) });
    line3(e, cam, [v3(WA.x, 0, WA.z), v3(WB.x, 0, WB.z)], { color: P.ink2, width: 2, alpha: wfA * fixK });
    for (const u of [useK, useK2]) if (u > 0 && u < 1) pulse(e, cam, FLOW, u * 1.1, { color: P.ink, len: 0.18, width: 3.5, alpha: wfA, head: 5 });
  }
  // the fork, on the floor, seen from above
  if (top > 0.01) {
    const aA = ease.inOut3(seg(t, B.fork, B.fork + 1.6)), shat = smoothstep(seg(t, B.shatter, B.shatter + 1.4));
    if (aA > 0) for (let k = 0; k < 6; k++) { // path A: one line that breaks into dead ends
      const u0 = k / 6, u1 = Math.min(aA, (k + 0.85) / 6); if (u1 <= u0) continue; const dx = (hash(k, 41) - 0.2) * 1.9 * shat, dz = (hash(k, 42) - 0.5) * 1.6 * shat;
      const pts = part(PA, u0, u1, 6).map((q) => ({ x: q.x + dx, y: 0, z: q.z + dz }));
      line3(e, cam, pts, { color: mix(P.ink, P.tech, shat), width: 3 - shat, alpha: top });
      if (shat > 0.3) { const q = cam.project(pts[pts.length - 1]); if (q) { e.save(); e.globalAlpha = top * smoothstep(seg(shat, 0.3, 0.8)); e.strokeStyle = P.ink2; e.lineWidth = 2; const r = 7; e.beginPath(); e.moveTo(q.x - r, q.y - r); e.lineTo(q.x + r, q.y + r); e.moveTo(q.x + r, q.y - r); e.lineTo(q.x - r, q.y + r); e.stroke(); e.restore(); } }
    }
    const bK = Math.max(...NODES.map((n, i) => (t >= B.node[i] ? NODE_U[i] : 0)), 0);
    const bLay = clamp(Math.max(seg(t, B.forkB, B.forkB + 0.9) * NODE_U[0] * 0.6, ...NODES.map((n, i) => (t > B.node[i] - 0.6 ? lerp(i ? NODE_U[i - 1] : 0, NODE_U[i], ease.inOut3(seg(t, B.node[i] - 0.6, B.node[i]))) : 0))));
    line3(e, cam, part(PB, 0, bLay), { color: P.ink, width: 3, alpha: top });
    const payB = seg(t, B.closeB, B.closeB + 1.0);
    if (payB > 0) { line3(e, cam, part(PB_PAY, 0, ease.inOut3(payB)), { color: P.live, width: 3.5, alpha: top }); pulse(e, cam, PB_PAY, payB * 1.15, { color: P.live, len: 0.3, width: 4, alpha: top, head: 6 }); }
    B._bK = bK;
  }

  /* ---- everything that stands, far to near ---- */
  const D = []; const dep = (x, y, z) => cam.view(v3(x, y, z)).z, push = (d, fn) => D.push({ d, fn }), nf = (d) => smoothstep(clamp((d - 2.2) / 4));
  const appear = smoothstep(seg(t, 0.3, 2.6));
  for (const g of GIANTS) push(dep(g.x, g.h / 2, g.z), () => { solid(e, cam, g, { top: '#040405', side: '#020203', end: '#030304', alpha: world }); wire(e, cam, g, { color: P.tech, width: 1, alpha: (0.25 + 0.25 * rev) * appear * world, rungs: g.rungs }); });
  for (const g of CORRIDOR) { const r = ease.out3(seg(t, g.rise, g.rise + 1.2)); if (r <= 0.01) continue; const b = { ...g, h: g.h * r };
    const dd = dep(g.x, b.h / 2, g.z); push(dd, () => { solid(e, cam, b, { top: '#050506', side: '#030304', end: '#040405', alpha: world * nf(dd) }); wire(e, cam, b, { color: mix(P.tech, P.ink2, 0.35), width: 1.1, alpha: 0.75 * world * nf(dd), rungs: g.rungs }); }); }
  for (const m of MAZE) {
    const o = m.offer, hot = o ? smoothstep(seg(t, o.on - 0.2, o.on + 0.3)) * (1 - smoothstep(seg(t, o.off, o.off + 0.5))) + (o?.loop ? 0 : 0) : 0;
    const again = o?.name === 'NEW APP' ? smoothstep(seg(t, 12.6, 13.0)) * (1 - smoothstep(seg(t, 14.0, 14.5))) : 0;
    const k = Math.max(hot, again), dm = dep(m.x, m.h / 2, m.z), a = world * dimMaze * nf(dm) * (0.55 + 0.45 * smoothstep(seg(t, 2.6, 4.2)));
    push(dm, () => {
      solid(e, cam, m, { top: mix(TONE.top(), P.ink2, 0.35 * k), side: TONE.side(), end: TONE.end(), edge: mix(TONE.edge(), P.ink, k), line: 1 + k, alpha: a });
      emblem(e, cam, m.x, m.h + 0.12, m.z, m.type, o ? 0.85 : 0.62, 0.45 + 0.55 * k, a * (o ? 1 : 0.8) * (1 - top));
    });
    if (o?.wall) { const r = ease.out3(seg(t, o.dead - 0.2, o.dead + 0.35)) * (1 - smoothstep(seg(t, o.dead + 3, o.dead + 4))); if (r > 0.01) { const wb = { x: o.wall.x, z: o.wall.z, w: o.wall.yaw ? 0.18 : o.wall.w, d: o.wall.yaw ? o.wall.w : 0.18, h: 2.6 * r };
      push(dep(wb.x, 1, wb.z), () => { solid(e, cam, wb, { top: TONE.top(), side: mix(P.bg, P.ink2, 0.22), end: mix(P.bg, P.ink2, 0.26), edge: P.ink2, alpha: world }); }); } }
  }
  // bills: they don't care. They land around him while he runs
  for (let k = 0; k < 7; k++) {
    const t0 = B.bills + k * 0.42, fall = seg(t, t0, t0 + 0.75); if (fall <= 0) continue;
    const g = figAt(t0 + 0.8), x = g.x + (hash(k, 51) - 0.5) * 2.4, z = g.z + (hash(k, 52) - 0.3) * 2.0, y = 4.5 * (1 - ease.in3(fall)) + 0.04 * Math.abs(Math.sin(fall * 9)) * (fall > 0.85 ? 1 : 0);
    const a = world * (1 - smoothstep(seg(t, B.mess, B.mess + 1.0)));
    push(dep(x, y, z), () => billboard(e, cam, v3(x, y, z), (c, s) => { c.rotate((hash(k, 53) - 0.5) * 0.5 * (1 - fall)); envelope(c, s, a); }));
  }
  // the machine: apps, businesses, automations, assembling in rings
  const sink = smoothstep(seg(t, B.orbit + 0.2, B.orbit + 2.4)), mA = world * (1 - sink) * (1 - top);
  APPS.forEach((q, i) => { const r = ease.out5(seg(t, B.apps + i * 0.155, B.apps + i * 0.155 + 0.45)); if (r <= 0) return; const h = 0.75 * r * (1 - 0.8 * sink), dq = dep(q.x, 0.4, q.z);
    push(dq, () => { solid(e, cam, { x: q.x, z: q.z, w: 0.36, d: 0.36, h }, { top: mix(P.bg, P.ink2, 0.5), side: mix(P.bg, P.ink2, 0.2), end: mix(P.bg, P.ink2, 0.3), edge: P.ink2, alpha: mA * nf(dq) }); emblem(e, cam, q.x, h + 0.08, q.z, 'app', 0.32, 0.7, mA * r); }); });
  BIZ.forEach((q, i) => { const r = ease.out5(seg(t, B.biz + i * 0.3, B.biz + i * 0.3 + 0.5)); if (r <= 0) return; const h = 0.85 * r * (1 - 0.8 * sink), dq = dep(q.x, 0.4, q.z);
    push(dq, () => { solid(e, cam, { x: q.x, z: q.z, w: 1.0, d: 0.8, h }, { top: mix(P.bg, P.ink2, 0.45), side: mix(P.bg, P.ink2, 0.18), end: mix(P.bg, P.ink2, 0.28), edge: P.ink2, alpha: mA * nf(dq) }); emblem(e, cam, q.x, h + 0.1, q.z, 'store', 0.7, 0.7, mA * r); }); });
  GEARS.forEach((q, i) => { const r = ease.out5(seg(t, B.auto + i * 0.2, B.auto + i * 0.2 + 0.5)); if (r <= 0) return;
    push(dep(q.x, 0.4, q.z), () => billboard(e, cam, v3(q.x, 0, q.z), (c, s) => gear(c, s, tm * (i % 2 ? -1.4 : 1.4), mA * r * (1 - 0.6 * sink)))); });
  // the network's people: customers with a problem; makers beside what they built
  if (rev > 0) {
    for (const ed of EDGES) { const k = smoothstep(seg(rev, ed.d / 16 - 0.3, ed.d / 16)); if (k <= 0.01) continue; const c = ed.c, mk = MAKERS[ed.m];
      push(dep(c.x, 0.9, c.z), () => { e.save(); e.globalAlpha = k * netA * focusN * 0.95; billboard(e, cam, v3(c.x, 0, c.z), (g, s) => { if (mk.x < c.x) g.scale(-1, 1); human(g, s, { P, pose: 'stand', lean: 0.03, look: 0.2, reach: 0.1, light: 1 }); }); e.restore(); }); }
    MAKERS.forEach((mk, j) => { const k = smoothstep(seg(rev, Math.hypot(mk.x - C.x, mk.z - C.z) / 16 - 0.3, Math.hypot(mk.x - C.x, mk.z - C.z) / 16)); if (k <= 0.01) return;
      push(dep(mk.x, 0.9, mk.z), () => { solid(e, cam, { x: mk.x + 0.6, z: mk.z, w: 0.7, d: 0.7, h: 0.6 }, { top: mix(P.bg, P.ink2, 0.5), side: mix(P.bg, P.ink2, 0.2), end: mix(P.bg, P.ink2, 0.3), edge: P.ink2, alpha: k * netA * focusN });
        e.save(); e.globalAlpha = k * netA * focusN; billboard(e, cam, v3(mk.x, 0, mk.z), (g, s) => human(g, s, { P, pose: 'stand', lean: 0.03, reach: 0.3, light: 0.9 })); e.restore(); }); });
  }
  // his customer and the workflow blocks
  if (wfA > 0.01) {
    const kIn = smoothstep(seg(t, B.shift + 0.2, B.shift + 1.4)), kx = K0.x - 1.8 * (1 - kIn) * (t > B.shift ? 1 : 0), kA = wfA * (t < B.fork + 1.0 || t > B.shift ? 1 : 0) * (t > B.shift ? kIn : 1) * (t > B.fork && t < B.shift ? 0 : 1);
    push(dep(kx, 0.9, K0.z), () => { e.save(); e.globalAlpha = kA; billboard(e, cam, v3(kx, 0, K0.z), (g, s) => human(g, s, { P, pose: 'stand', lean: 0.03, look: 0.1, reach: 0.2 })); e.restore(); });
    for (const [q, h, glowK] of [[WA, 0.42, 0], [WB, 0.42, 0], [WD, 0.62, smoothstep(seg(t, B.use + 0.7, B.use + 1.0)) + smoothstep(seg(t, B.use2 + 0.7, B.use2 + 1.0))]])
      push(dep(q.x, 0.3, q.z), () => solid(e, cam, { x: q.x, z: q.z, w: 0.42, d: 0.42, h }, { top: mix(mix(P.bg, P.ink2, 0.55), P.ink, clamp(glowK)), side: mix(P.bg, P.ink2, 0.22), end: mix(P.bg, P.ink2, 0.32), edge: P.ink2, alpha: wfA }));
    // the missing piece, carried over from him and set into the gap
    for (let k = 0; k < 3; k++) { const u = ease.inOut3(seg(t, B.fix - 0.7 + k * 0.18, B.fix + 0.1 + k * 0.18)); if (u <= 0) continue; const src = v3(C.x - 0.3, 1.0, C.z - 0.2), dst = v3((WA.x + WB.x) / 2, 0.06 + k * 0.12, WA.z), p = lerp3(src, dst, u); p.y += Math.sin(Math.PI * u) * 0.8;
      push(dep(p.x, p.y, p.z), () => solid(e, cam, { x: p.x, z: p.z, w: 0.5, d: 0.3, h: 0.12, y0: p.y }, { top: P.ink, side: mix(P.bg, P.ink, 0.55), end: mix(P.bg, P.ink, 0.7), alpha: wfA })); }
  }
  // the figure
  { const fx = f.x, fz = f.z; let hx = f.hx, hz = f.hz;
    if (t > B.orbit - 0.5) { const tw = smoothstep(seg(t, B.fix - 1.6, B.fix - 0.9)); hx = lerp(0, -1, tw); hz = lerp(1, 0.05, tw); const n = Math.hypot(hx, hz); hx /= n; hz /= n; }
    push(dep(fx, 0.9, fz), () => figure(e, cam, v3(fx, 0, fz), { hx, hz, phase: f.phase, run: f.run, alpha: smoothstep(seg(t, 0.35, 1.0)) * world * (1 - 0.85 * top), look: 0.3 * coinLight, reach: t > B.fix - 1 && t < B.fix + 0.4 ? 0.8 : 0.1 }));
  }
  // the money itself
  if (coinA > 0.01) push(dep(M.x, M.y, M.z) - 0.05, () => { e.save(); e.globalAlpha = coinA; billboard(e, cam, v3(M.x, M.y - 0.3, M.z), (c, s) => coin(c, s, P, { r: lerp(0.32, 0.16, coinDown), spin: t < B.give ? tm * 1.3 : 0 })); e.restore(); });
  D.sort((a, b) => b.d - a.d).forEach((x) => x.fn());
  // the payment arc (orange): customer -> him, drawn only as it happens
  { const u = seg(t, B.pay, B.pay + 0.9); if (u > 0) line3(e, cam, part(PAY, 0, ease.inOut3(u)), { color: P.live, width: 3, alpha: wfA * (1 - 0.6 * smoothstep(seg(t, B.pay + 1.4, B.pay + 2.6))) });
    const u2 = seg(t, B.pay2, B.pay2 + 0.9); if (u2 > 0) { line3(e, cam, part(PAY, 0, ease.inOut3(u2)), { color: P.live, width: 3, alpha: wfA }); pulse(e, cam, PAY, u2 * 1.1, { color: P.live, len: 0.2, width: 4, alpha: wfA, head: 6 }); } }

  halo(ctx, L);

  /* ---- crisp marks, tags and type (after the glow) ---- */
  // the maze offers: what each shortcut promises
  for (const o of OFFERS) { const a = smoothstep(seg(t, o.on - 0.1, o.on + 0.3)) * (1 - smoothstep(seg(t, o.off - 0.2, o.off + 0.2))) * world; tag3(ctx, cam, v3(o.x, 1.95, o.z), o.name, a, { dy: -10 }); }
  { const a = smoothstep(seg(t, 6.45, 6.7)) * (1 - smoothstep(seg(t, 7.4, 7.8))) * world; tag3(ctx, cam, v3(5.3, 2.9, 18.6), 'DEAD END', a, { color: P.ink2 });
    const b = smoothstep(seg(t, 10.35, 10.6)) * (1 - smoothstep(seg(t, 11.3, 11.7))) * world; tag3(ctx, cam, v3(-6.7, 2.9, 19.8), 'DEAD END', b, { color: P.ink2 });
    const c = smoothstep(seg(t, 12.85, 13.1)) * (1 - smoothstep(seg(t, 13.9, 14.3))) * world; tag3(ctx, cam, v3(-0.2, 0.05, 13.4), 'SAME PLACE', c, { dy: 40, color: P.ink2 }); }
  // the network's problems and their answers
  if (rev > 0) for (const ed of EDGES) { const k = smoothstep(seg(rev, ed.d / 16 - 0.2, ed.d / 16 + 0.05)); const solved = smoothstep(seg(t, ed.fire + 0.7, ed.fire + 1.1)); marker(ctx, cam, v3(ed.c.x, 2.15, ed.c.z), solved, k * netA * focusN * 0.9); }
  // the exchange, step by step
  if (wfA > 0.01) {
    const solved = Math.max(smoothstep(seg(t, B.use + 0.75, B.use + 1.05)), 0) * (t < B.shift ? 1 : 0) + (t > B.shift ? smoothstep(seg(t, B.use2 + 0.75, B.use2 + 1.05)) : 0);
    marker(ctx, cam, v3(K0.x, 2.15, K0.z), solved, wfA * (t > B.fork && t < B.shift + 0.6 ? 0 : 1));
    const ps = (a, b) => smoothstep(seg(t, a, a + 0.25)) * (1 - smoothstep(seg(t, b, b + 0.3)));
    tag3(ctx, cam, v3((WA.x + WB.x) / 2, 0.05, WA.z), 'BROKEN STEP', ps(B.problem, B.fix) * wfA, { dy: 46, color: P.ink });
  }
  // the four-step strip: PROBLEM → SOLUTION → VALUE → PAYMENT (lights as each happens)
  { const a = smoothstep(seg(t, B.problem - 0.3, B.problem)) * (1 - smoothstep(seg(t, B.fork - 0.6, B.fork - 0.1))); if (a > 0.01) {
    const steps = [['PROBLEM', B.problem], ['SOLUTION', B.fix], ['VALUE', B.use + 0.8], ['PAYMENT', B.pay]]; ctx.save(); ctx.font = '600 30px "JetBrains Mono"'; ctx.letterSpacing = '4px';
    const ws = steps.map(([s]) => ctx.measureText(s).width), gap = 54, total = ws.reduce((x, y) => x + y, 0) + gap * 3; let x = (W - total) / 2;
    steps.forEach(([s, t0], i) => { const on = smoothstep(seg(t, t0, t0 + 0.3)); ctx.globalAlpha = a * (0.28 + 0.72 * on); ctx.fillStyle = i === 3 ? mix(P.ink2, P.live, on) : P.ink; ctx.fillText(s, x, 300); x += ws[i];
      if (i < 3) { ctx.globalAlpha = a * 0.5; ctx.fillStyle = P.ink2; ctx.fillText('→', x + 12, 300); x += gap; } });
    ctx.restore(); kicker(ctx, P, 'THE EXCHANGE', 220, a, mono); } }
  // titles
  { const k = smoothstep(seg(t, 0.5, 1.0)) * (1 - smoothstep(seg(t, 3.0, 3.5))); if (k > 0.01) { mono(ctx, 'FILM 003', 80, 140, { size: 18, color: P.ink2, track: 5, alpha: k }); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = P.tech; ctx.fillRect(228, 133, 40, 1.5); ctx.restore(); mono(ctx, 'THE MONEY CHASE', 284, 140, { size: 18, color: P.ink, track: 5, alpha: k }); } }
  // the activity counters
  { const out = 1 - smoothstep(seg(t, B.activity - 0.5, B.activity)), y0 = 260;
    const n1 = Math.round(10 * seg(t, B.apps, B.apps + 1.55)), n2 = Math.round(5 * seg(t, B.biz, B.biz + 1.5)), n3 = Math.round(100 * ease.in3(seg(t, B.auto, B.auto + 1.6)));
    const dim = 1 - 0.55 * smoothstep(seg(t, B.broke, B.broke + 0.3));
    counter(ctx, 80, y0, String(n1), 'APPS', smoothstep(seg(t, B.apps, B.apps + 0.3)) * out * dim);
    counter(ctx, 80, y0 + 110, String(n2), 'BUSINESSES', smoothstep(seg(t, B.biz, B.biz + 0.3)) * out * dim);
    counter(ctx, 80, y0 + 220, String(n3), 'AUTOMATIONS', smoothstep(seg(t, B.auto, B.auto + 0.3)) * out * dim);
    const rb = smoothstep(seg(t, B.broke, B.broke + 0.25)) * out; if (rb > 0.01) { ctx.save(); ctx.globalAlpha = rb * 0.5; ctx.fillStyle = P.tech; ctx.fillRect(80, y0 + 268, 520, 1.5); ctx.restore(); counter(ctx, 80, y0 + 400, '$0', 'REVENUE', rb, { size: 150 }); } }
  { const r = seg(t, B.activity, B.activity + 0.7), a = 1 - smoothstep(seg(t, B.orbit - 0.2, B.orbit + 0.4)); if (r > 0) { kicker(ctx, P, 'THE TRAP', 230, a * smoothstep(r), mono); headline(ctx, P, W, [[['ACTIVITY ', P.ink], ['≠', P.live]], [['INCOME.', P.ink]]], 380, a, r);
    const v = smoothstep(seg(t, B.attention, B.attention + 0.3)) * a; if (v > 0.01) { const views = Math.round(48210 * ease.out3(seg(t, B.attention, B.attention + 1.6))).toLocaleString('en-US'); mono(ctx, `${views} VIEWS`, 80, 560, { size: 26, color: P.ink, track: 4, alpha: v }); mono(ctx, 'REVENUE $0', 80, 604, { size: 26, color: P.ink2, track: 4, alpha: v }); } } }
  // the fork: the two questions, and what each path finds
  if (top > 0.01) {
    const aA = smoothstep(seg(t, B.askA, B.askA + 0.4)) * top, shat = smoothstep(seg(t, B.shatter, B.shatter + 1.4));
    if (aA > 0.01) { mono(ctx, 'PATH A', 80, 168, { size: 20, color: P.ink2, track: 5, alpha: aA }); headline(ctx, P, W, [['HOW DO I MAKE'], ['$10,000?']], 238, aA * (1 - 0.55 * shat), seg(t, B.askA, B.askA + 0.8), { size: 46, x: 80 }); }
    const aB = smoothstep(seg(t, B.forkB, B.forkB + 0.4)) * top;
    if (aB > 0.01) { ctx.save(); ctx.globalAlpha = aB; ctx.textAlign = 'right'; ctx.restore(); mono(ctx, 'PATH B', W - 80, 168, { size: 20, color: P.ink2, track: 5, alpha: aB, align: 'right' });
      ctx.save(); ctx.font = '800 46px "Inter Display"'; ctx.textAlign = 'right'; ctx.fillStyle = P.ink; ctx.globalAlpha = aB; ['WHAT PROBLEM', 'IS WORTH SOLVING?'].forEach((s, i) => { const r = seg(t, B.forkB + i * 0.15, B.forkB + 0.8 + i * 0.15); ctx.save(); ctx.beginPath(); ctx.rect(0, 238 + i * 47 - 46, W, 60); ctx.clip(); ctx.fillText(s, W - 80, 238 + i * 47 + (1 - ease.out5(r)) * 50); ctx.restore(); }); ctx.restore(); }
    // the origin: you
    { const p = cam.project(v3(0, 0, 29.4)); if (p) { glyph(ctx, p.x, p.y, 'you', 16, top); mono(ctx, 'YOU', p.x, p.y + 50, { size: 18, color: P.ink2, track: 5, alpha: top, align: 'center' }); } }
    // A's dead ends, named
    if (shat > 0.3) ['APP', 'COURSE', 'DROPSHIP', 'AGENCY', 'AUTOMATION', 'NEWSLETTER'].forEach((s, k) => { const u = (k + 0.85) / 6, q0 = at(PA, Math.min(u, 1)), q = cam.project(v3(q0.x + (hash(k, 41) - 0.2) * 1.9 * shat, 0, q0.z + (hash(k, 42) - 0.5) * 1.6 * shat)); if (q) mono(ctx, s, clamp(q.x - 14, 60, 520), q.y - 18, { size: 16, color: P.tech, track: 3, alpha: top * smoothstep(seg(shat, 0.4, 0.9)), align: 'right' }); });
    // B's nodes, each as the narration reaches it
    NODES.forEach((n, i) => { const k = smoothstep(seg(t, B.node[i], B.node[i] + 0.35)); if (k <= 0.01) return; const p = cam.project(v3(n.x, 0, n.z)); if (!p) return;
      const hot = i === 1 ? smoothstep(seg(t, B.closeB, B.closeB + 0.4)) : 0; glyph(ctx, p.x, p.y, n.g, 22 * lerp(0.6, 1, ease.spring(k, 0.6, 12)), k * top, hot * 0.0);
      ctx.save(); ctx.globalAlpha = k * top; ctx.font = '800 30px "Inter Display"'; ctx.textAlign = 'right'; ctx.fillStyle = P.ink; ctx.fillText(n.t, p.x - 40, p.y + 11); ctx.restore(); });
    { const k = smoothstep(seg(t, B.closeB + 0.6, B.closeB + 1.0)) * top; if (k > 0.01) { const p = cam.project(v3(-1.2, 0, 26.9)); if (p) mono(ctx, 'THEY PAY YOU', p.x + 26, p.y + 8, { size: 18, color: P.live, track: 4, alpha: k }); } }
  }
  // the point the system becomes
  { const pk = smoothstep(seg(t, fin + 0.5, fin + 0.9)) * (1 - smoothstep(seg(t, fin + 1.1, fin + 1.6))); const p = cam.project(v3(C.x, 0.6, C.z)); if (p && pk > 0.01) { glow(ctx, p.x, p.y, 240, 240, { alpha: 0.5 * pk, color: rgb(P.live) }); ctx.save(); ctx.globalAlpha = pk; ctx.fillStyle = P.live; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
  endCard(ctx, P, W, MARK, WORD, smoothstep(seg(t, fin + 0.9, fin + 1.5)), smoothstep(seg(t, fin + 1.3, fin + 1.9)), seg(t, B.build - 0.1, B.build + 0.5));
  vignette(ctx, W, H, { amount: 0.7 });
  grain(ctx, L, Math.round(t * FPS));
}

async function load() {
  TL = await (await fetch('/tools/motion/films/003-money-chase/timeline.json')).json();
  const l = (n) => TL.lines[n - 1], b = (n, fr) => brk(TL, n, fr)[1];
  B = {};
  B.bills = l(3).at + 0.5; B.mess = l(4).at;
  B.apps = l(5).at; B.biz = b(5, 5 / 12) - 0.1; B.auto = b(5, 8 / 12) - 0.05;
  B.broke = l(6).at; B.activity = l(7).at; B.attention = l(8).at;
  B.orbit = l(9).at - 0.3; B.give = b(9, 10 / 19) + 1.4;
  B.problem = l(11).at; B.fix = l(11).at + 1.2; B.use = l(11).at + 2.1; B.pay = l(11).at + 3.0;
  B.fork = l(12).at + 0.5; B.askA = b(12, 6 / 12); B.shatter = l(12).end - 0.2;
  B.forkB = l(13).at + 0.3; B.node = [b(13, 6 / 12), l(14).at + 0.5, l(15).at + 0.4, l(16).at + 0.3, l(16).end - 0.5]; B.closeB = l(16).end + 0.1;
  B.shift = l(17).at; B.use2 = l(17).at + 2.0; B.pay2 = l(17).at + 2.9;
  B.fin = l(18).at - 0.6; B.build = b(18, 2 / 5);
  const R = (pos, tgt, f) => ({ pos, tgt, f });
  const lag = (t, dt) => figAt(t - dt);
  SHOTS = [
    { a: 0, d: 0, fn: (t) => { const g = figAt(t), k = ease.inOut3(seg(t, 0.3, 3.0)), d = lerp(12, 5.6, k); return R(v3(g.x + 0.3, 0.62, g.z - d), v3(g.x, 1.45, g.z + 9), 1400); } },
    { a: 3.2, d: 1.6, fn: (t) => { const g = lag(t, 0.45), h = lag(t, 1.25); let dx = g.x - h.x, dz = g.z - h.z; const n = Math.hypot(dx, dz); if (n < 0.3) { dx = 0; dz = 1; } else { dx /= n; dz /= n; }
      return R(v3(g.x - dx * 5.8, 4.4, g.z - dz * 5.8), v3(g.x + dx * 3.5, 0.6, g.z + dz * 3.5), 1450); } },
    { a: 15.6, d: 2.0, fn: (t) => { const spin = 0.32 * seg(t, 15.6, B.broke), down = ease.inOut3(seg(t, B.broke + 0.8, B.orbit + 0.2));
      const hi = v3(C.x - Math.sin(spin) * 3.4, 15.5, C.z - Math.cos(spin) * 3.4), lo = v3(C.x, 2.3, C.z - 6.2);
      return R(lerp3(hi, lo, down), lerp3(v3(C.x, 0, C.z + 0.3), v3(C.x, 2.0, C.z), down), lerp(1500, 1700, down)); } },
    { a: B.orbit + 0.2, d: 0.4, fn: (t) => { const k = ease.inOut3(seg(t, B.orbit + 0.3, B.orbit + 9.4)), th = Math.PI * k, Rr = lerp(6.2, 12.5, k), h = lerp(2.3, 13.5, k);
      return R(v3(C.x - Math.sin(th) * Rr, h, C.z - Math.cos(th) * Rr), v3(C.x, lerp(2.0, 0, k), C.z - 9.5 * smoothstep(k)), lerp(1700, 1250, k)); } },
    { a: B.problem - 0.6, d: 1.6, fn: (t) => R(v3(-1.75 - 0.25 * seg(t, B.problem, B.fork), 2.5, 37.0), v3(-2.0, 0.75, 29.0), 1500) },
    { a: B.fork - 0.4, d: 1.8, fn: () => R(v3(0, 16.5, 23.1), v3(0, 0, 22.6), 1500) },
    { a: B.shift, d: 2.2, fn: (t) => R(v3(-1.7 - 0.3 * seg(t, B.shift, B.fin), 2.2, 37.6), v3(-2.0, 0.9, 29.0), 1550) },
    { a: B.pay2 + 1.0, d: 1.9, fn: () => R(v3(0, 21, 60), v3(0, 0, 25), 1150) },
  ];
  MARK = await brandPath('/assets/brand/mark.svg'); WORD = await brandPath('/assets/brand/wordmark.svg');
  comp.duration = TL.total;
}

const comp = { width: W, height: H, fps: FPS, duration: 75, palette: PALETTES.brand, motionBlur: { samples: 4, shutter: 0.5 }, load, draw };
export default comp;
