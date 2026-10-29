// Quiet Bands Originals · Test 01, "The Drowned Belfry": the one source of truth for the previs.
// Pure data and math with no three.js, so the renderer (test01.html), the tests (tools/previs.test.mjs) and the
// shot tables in docs/originals/test-01 all read the same numbers. Change a number here and every one of them follows.
//
// Units are metres, seconds and degrees. World axes: y up, +x east (toward the belfry window and the moon), +z south.
// The belfry floor's centre is the origin and the flood line is y = 0.
//
// Two clocks run the sequence. Edit time t is the film: 25 s at 24 fps. World time W is the action. SPEED says how
// fast W runs at each t, and that one curve is all three camera moves: the camera always moves in edit time,
// the world only moves as fast as SPEED lets it.

export const FPS = 24, DURATION = 25, FRAMES = FPS * DURATION;
export const ASPECT = 2.39, SENSOR_W = 36, SENSOR_H = SENSOR_W / ASPECT; // mm: a full-frame gate, 2.39 extraction

/** Two inks and a flare. SIGNAL is force: it appears only where sound hits something. Nothing else is orange. */
export const PALETTE = { ink: '#07080B', night: '#121826', slate: '#3B4A63', mist: '#8C97AB', bone: '#F2EEE5', bronze: '#6B5236', signal: '#FF5A00' };

// ---------- math
const D = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const seg = (x, a, b) => clamp((x - a) / (b - a));
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Euler degrees to a quaternion [x, y, z, w], matching three.js Quaternion.setFromEuler for 'XYZ' and 'YXZ'. */
export function quatEuler([x, y, z], order = 'XYZ') {
  const c1 = Math.cos((x * D) / 2), c2 = Math.cos((y * D) / 2), c3 = Math.cos((z * D) / 2);
  const s1 = Math.sin((x * D) / 2), s2 = Math.sin((y * D) / 2), s3 = Math.sin((z * D) / 2);
  return order === 'YXZ'
    ? [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3]
    : [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
}
export const qmul = (a, b) => [
  a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1],
  a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2],
  a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
export function qrot([x, y, z, w], [vx, vy, vz]) {
  const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
  return [ix * w - iw * x - iy * z + iz * y, iy * w - iw * y - iz * x + ix * z, iz * w - iw * z - ix * y + iy * x];
}

/** Seeded random, so debris and rain land in the same place on every render. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Values keyed in time, eased in and out between keys. keys: [[time, number | number[]], ...] */
function keyed(keys, x) {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i], [b, vb] = keys[i + 1];
    if (x <= b) { const k = smooth((x - a) / (b - a)); return Array.isArray(va) ? mix(va, vb, k) : lerp(va, vb, k); }
  }
  return keys[keys.length - 1][1];
}

/** A smooth path through timed points (Catmull-Rom tangents scaled by time, Hermite between keys). */
function path(keys, x) {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (x > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i], [t1, p1] = keys[i + 1], h = t1 - t0, s = (x - t0) / h;
  const tan = (j) => { const a = keys[Math.max(0, j - 1)], b = keys[Math.min(n - 1, j + 1)]; return mul(sub(b[1], a[1]), h / (b[0] - a[0])); };
  const m0 = tan(i), m1 = tan(i + 1), s2 = s * s, s3 = s2 * s;
  return add(add(mul(p0, 2 * s3 - 3 * s2 + 1), mul(m0, s3 - 2 * s2 + s)), add(mul(p1, -2 * s3 + 3 * s2), mul(m1, s3 - s2)));
}

/** Monotone cubic (Fritsch-Carlson): smooth through every key, never overshoots it. Used for camera parameters. */
function mono(keys, f, x) {
  const n = keys.length;
  if (n === 1 || x <= keys[0].t) return keys[0][f];
  if (x >= keys[n - 1].t) return keys[n - 1][f];
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d[i] = (keys[i + 1][f] - keys[i][f]) / (keys[i + 1].t - keys[i].t);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], r = a * a + b * b;
    if (r > 9) { const k = 3 / Math.sqrt(r); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let i = 0; while (x > keys[i + 1].t) i++;
  const h = keys[i + 1].t - keys[i].t, s = (x - keys[i].t) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * keys[i][f] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * keys[i + 1][f] + (s3 - s2) * h * m[i + 1];
}

// ---------- the two clocks
/** [edit t, speed]: how many world seconds pass per edit second. Speed eases between keys; W is its integral. */
export const SPEED = [
  [0.00, 1], [2.40, 1],          // standoff, charge, takeoff: real time
  [3.20, 0.005], [7.00, 0.005],  // MOVE 01: brake into the apex and hold it at 0.5%, so the rain still breathes
  [7.25, 1], [7.30, 1],          // the snap back: one beat of real time, the bell whips up
  [7.70, 0.02], [14.20, 0.02],   // MOVE 03: the near miss at 2%
  [14.70, 1], [15.214, 1],       // land, plant, strike: real time
  [15.384, 0.04], [16.30, 0.04],  // MOVE 04: brake onto the contact; the ring is born at 4%
  [17.00, 0.35], [19.50, 0.35],  // ride the ring out through the window at 35%
  [20.50, 1], [25.00, 1],        // the drowned city, real time
];
export function speedAt(t) {
  for (let i = 0; i < SPEED.length - 1; i++) {
    const [a, sa] = SPEED[i], [b, sb] = SPEED[i + 1];
    if (t <= b) return lerp(sa, sb, smooth((t - a) / (b - a)));
  }
  return SPEED[SPEED.length - 1][1];
}
const STEPS = 960, TABLE = new Float64Array(DURATION * STEPS + 1);
for (let i = 1; i < TABLE.length; i++) TABLE[i] = TABLE[i - 1] + speedAt((i - 0.5) / STEPS) / STEPS;
/** World time at edit time t. */
export function worldAt(t) {
  const x = clamp(t, 0, DURATION) * STEPS, i = Math.min(TABLE.length - 2, Math.floor(x));
  return lerp(TABLE[i], TABLE[i + 1], x - i);
}
/** Edit time at which world time W happens (the inverse of worldAt). */
export function editAt(W) {
  let lo = 0, hi = TABLE.length - 1;
  if (W <= 0) return 0; if (W >= TABLE[hi]) return DURATION;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TABLE[m] < W) lo = m; else hi = m; }
  return (lo + (W - TABLE[lo]) / (TABLE[hi] - TABLE[lo])) / STEPS;
}

// ---------- the choreography, in world seconds
export const EV = {
  launch: 0.80,   // the Listener breaks from her stance
  takeoff: 2.05,  // she leaves the water
  apex: 2.80,     // top of the leap, fork overhead: MOVE 01 freezes here
  miss: 3.265,    // the bell passes over her face: MOVE 03 orbits here
  land: 3.55,
  contact: 4.19,  // tines on bronze: MOVE 04 starts here
};
export const FLIGHT = { x0: -3.6, x1: 0.6, y0: 0.92, T: EV.land - EV.takeoff, G: 9.8 }; // real gravity, so the arc reads true
export const CONTACT = [2.76, 1.32, 0];
export const RING_SPEED = 30; // m/s of world time: the shockwave is stylised, far slower than sound
export const ringAt = (W) => (W > EV.contact ? RING_SPEED * (W - EV.contact) : 0);
export const FLOOD = -42;     // the drowned city's water, 42 m below the belfry floor
export const STEP_TIMES = [0.98, 1.30, 1.60, 1.86];
export const MOON = norm([0.80, 0.19, 0.57]); // low in the south-east, about 11 degrees up: the only key light

export const BELFRY = {
  pillars: 8, radius: 8.2, pillarW: 1.1, height: 11, sill: 0.9, // pillars stand at 22.5° + 45°k, so +x is an opening
  louverX: 7.62, louverZ: 2.5, louverY: [1.05, 9.0],            // the east opening, with its slats, is the window
  shaftR: 9.4,
};

/** Hips position of the Listener. */
export function rootL(W) {
  if (W < EV.launch) return [-6.2, 0.88, 0];
  if (W < EV.takeoff) {
    const s = (W - EV.launch) / (EV.takeoff - EV.launch), x = -6.2 + 2.6 * (0.35 * s + 0.65 * s * s);
    const run = (w) => 0.89 + 0.045 * Math.abs(Math.sin(Math.PI * 3.1 * (w - EV.launch))) - 0.14 * Math.sin(Math.PI * seg(w, 1.80, EV.takeoff));
    const fix = (FLIGHT.y0 - run(EV.takeoff)) * seg(W, 1.80, EV.takeoff); // land exactly on the flight's start height
    const settle = (0.88 - run(EV.launch)) * (1 - seg(W, EV.launch, EV.launch + 0.25));
    return [x, run(W) + fix + settle, 0];
  }
  if (W < EV.land) {
    const τ = W - EV.takeoff, vy = (FLIGHT.G * FLIGHT.T) / 2;
    return [lerp(FLIGHT.x0, FLIGHT.x1, τ / FLIGHT.T), FLIGHT.y0 + vy * τ - (FLIGHT.G / 2) * τ * τ, 0];
  }
  return keyed([[EV.land, [0.6, 0.92, 0]], [3.72, [0.74, 0.42, 0]], [3.98, [0.86, 0.52, 0.02]], [EV.contact, [0.98, 0.64, 0]], [4.60, [0.92, 0.67, 0]]], W);
}

/** Hips position of the Bellwright. After the contact he is a projectile. */
export const LAUNCH_B = { p: [4.30, 1.22, 0], v: [13.5, 5.5, -0.4] };
export const LAUNCH_BELL = { v: [14.0, 4.6, 0.5] };
const ballistic = (p, v, τ) => [p[0] + v[0] * τ, p[1] + v[1] * τ - 4.9 * τ * τ, p[2] + v[2] * τ];
/** World seconds after the contact at which a projectile launched at height y0 with upward speed vy reaches the flood. */
export const fallTime = (y0, vy) => (vy + Math.sqrt(vy * vy + 19.6 * (y0 - FLOOD))) / 9.8;
export function rootB(W) {
  if (W <= EV.contact) return keyed([[2.40, [4.4, 1.30, 0]], [2.80, [4.65, 1.22, -0.15]], [3.30, [4.15, 1.26, 0.1]], [3.90, [4.5, 1.26, 0]], [EV.contact, LAUNCH_B.p]], W);
  const τ = Math.min(W - EV.contact, fallTime(LAUNCH_B.p[1], LAUNCH_B.v[1]));
  const sink = Math.max(0, W - EV.contact - τ);
  return add(ballistic(LAUNCH_B.p, LAUNCH_B.v, τ), [0, -2.5 * sink, 0]);
}

/** Bell centre. It rests in the flood beside him, sweeps over her face, comes back as his shield, then flies with him. */
export const BELL_PATH = [
  [0.00, [5.0, 0.62, -1.7]], [2.40, [5.0, 0.62, -1.7]], [2.80, [5.9, 0.95, -2.7]],
  [3.05, [3.9, 2.15, -3.7]], [3.17, [1.3, 3.45, -2.5]], [EV.miss, [-0.92, 3.42, 0.0]], [3.38, [-2.3, 4.2, 2.4]],
  [3.55, [-0.9, 6.0, 3.1]], [3.80, [2.0, 4.6, 1.6]], [4.00, [3.32, 1.75, 0.2]], [EV.contact, [3.38, 1.35, 0.0]],
];
export const BELL = { radius: 0.62, height: 1.32, chainHand: 'haR' };
export function bellAt(W) {
  if (W <= EV.contact) return path(BELL_PATH, W);
  const p0 = BELL_PATH[BELL_PATH.length - 1][1], τ = Math.min(W - EV.contact, fallTime(p0[1], LAUNCH_BELL.v[1]));
  return add(ballistic(p0, LAUNCH_BELL.v, τ), [0, -2.5 * Math.max(0, W - EV.contact - τ), 0]);
}

// ---------- rigs: joint -> [parent, offset in the parent's frame]. Characters face +z in their own frame, left is +x.
export const RIG_L = {
  name: 'Listener', height: 1.70,
  bones: {
    spine: ['hips', [0, 0.10, 0]], chest: ['spine', [0, 0.20, 0]], neck: ['chest', [0, 0.24, 0]], head: ['neck', [0, 0.13, 0.01]],
    shL: ['chest', [0.17, 0.19, 0]], elL: ['shL', [0, -0.28, 0]], haL: ['elL', [0, -0.25, 0]],
    shR: ['chest', [-0.17, 0.19, 0]], elR: ['shR', [0, -0.28, 0]], haR: ['elR', [0, -0.25, 0]],
    hipL: ['hips', [0.095, -0.03, 0]], knL: ['hipL', [0, -0.43, 0]], ftL: ['knL', [0, -0.42, 0]], toeL: ['ftL', [0, -0.05, 0.13]],
    hipR: ['hips', [-0.095, -0.03, 0]], knR: ['hipR', [0, -0.43, 0]], ftR: ['knR', [0, -0.42, 0]], toeR: ['ftR', [0, -0.05, 0.13]],
  },
  // [from, to, radius at from, radius at to]
  segs: [['hips', 'spine', 0.125, 0.115], ['spine', 'neck', 0.12, 0.135], ['shL', 'elL', 0.045, 0.04], ['elL', 'haL', 0.04, 0.035],
    ['shR', 'elR', 0.045, 0.04], ['elR', 'haR', 0.04, 0.035], ['hipL', 'knL', 0.07, 0.055], ['knL', 'ftL', 0.055, 0.04], ['ftL', 'toeL', 0.04, 0.035],
    ['hipR', 'knR', 0.07, 0.055], ['knR', 'ftR', 0.055, 0.04], ['ftR', 'toeR', 0.04, 0.035], ['shL', 'shR', 0.05, 0.05]],
  headR: 0.105,
};
export const RIG_B = {
  name: 'Bellwright', height: 2.55,
  bones: {
    spine: ['hips', [0, 0.16, 0]], chest: ['spine', [0, 0.34, 0]], neck: ['chest', [0, 0.36, 0.08]], head: ['neck', [0, 0.13, 0.09]],
    shL: ['chest', [0.40, 0.28, 0]], elL: ['shL', [0, -0.46, 0]], haL: ['elL', [0, -0.42, 0]],
    shR: ['chest', [-0.40, 0.28, 0]], elR: ['shR', [0, -0.46, 0]], haR: ['elR', [0, -0.42, 0]],
    hipL: ['hips', [0.17, -0.05, 0]], knL: ['hipL', [0, -0.62, 0]], ftL: ['knL', [0, -0.60, 0]], toeL: ['ftL', [0, -0.08, 0.22]],
    hipR: ['hips', [-0.17, -0.05, 0]], knR: ['hipR', [0, -0.62, 0]], ftR: ['knR', [0, -0.60, 0]], toeR: ['ftR', [0, -0.08, 0.22]],
  },
  segs: [['hips', 'spine', 0.30, 0.32], ['spine', 'neck', 0.40, 0.30], ['shL', 'shR', 0.22, 0.22], ['shL', 'elL', 0.16, 0.15], ['elL', 'haL', 0.19, 0.15],
    ['shR', 'elR', 0.16, 0.15], ['elR', 'haR', 0.19, 0.15], ['hipL', 'knL', 0.20, 0.17], ['knL', 'ftL', 0.17, 0.12], ['ftL', 'toeL', 0.12, 0.10],
    ['hipR', 'knR', 0.20, 0.17], ['knR', 'ftR', 0.17, 0.12], ['ftR', 'toeR', 0.12, 0.10]],
  headR: 0.15,
};

/** Forward kinematics: world position and orientation of every joint. root = { p, q }. */
export function skeleton(rig, root, pose) {
  const out = { hips: root };
  for (const [name, [parent, off]] of Object.entries(rig.bones)) {
    const P = out[parent], r = pose.j[name];
    out[name] = { p: add(P.p, qrot(P.q, off)), q: r ? qmul(P.q, quatEuler(r)) : P.q };
  }
  return out;
}

// ---------- poses. root: [pitch, yaw, roll] (YXZ). Joints: [x, y, z] (XYZ). For a limb hanging down, x -90 points it
// forward, -180 points it up; +z swings it toward the character's left. Knees bend with +x, elbows with -x.
// fork: the staff's direction in the character's frame (forward +z, left +x), gripped in the right hand.
const P = (root, j, fork) => ({ root, j, fork });
const L_POSE = {
  stance: P([4, 90, 0], { spine: [8, 0, 0], chest: [4, -18, 0], neck: [-6, 18, 0], shL: [-45, 0, 22], elL: [-62, 0, 0], shR: [-28, 0, -22], elR: [-55, 0, 0],
    hipL: [-32, 0, 8], knL: [42, 0, 0], hipR: [18, 0, -8], knR: [14, 0, 0] }, [-0.12, -0.32, 0.94]),
  takeoff: P([-4, 90, 0], { spine: [-4, 0, 0], chest: [-8, 0, 0], neck: [0, 0, 0], shL: [-150, 0, 18], elL: [-25, 0, 0], shR: [-125, 0, -18], elR: [-35, 0, 0],
    hipL: [-95, 0, 6], knL: [105, 0, 0], hipR: [22, 0, -5], knR: [12, 0, 0] }, [0, 0.72, 0.70]),
  apex: P([-6, 90, 0], { spine: [-12, 0, 0], chest: [-12, 0, 0], neck: [-4, 0, 0], shL: [-168, 0, 12], elL: [-42, 0, 0], shR: [-168, 0, -12], elR: [-42, 0, 0],
    hipL: [-72, 0, 10], knL: [112, 0, 0], hipR: [-38, 0, -10], knR: [124, 0, 0] }, [0, 0.52, -0.85]),
  layout: P([-88, 90, 0], { spine: [-10, 0, 0], chest: [-8, 0, 0], neck: [2, 0, 0], shL: [32, 0, 4], elL: [-10, 0, 0], shR: [28, 0, -4], elR: [-6, 0, 0],
    hipL: [-6, 0, 4], knL: [8, 0, 0], hipR: [-4, 0, -4], knR: [10, 0, 0] }, [0, -0.9, -0.45]),
  drop: P([-20, 90, 0], { spine: [6, 0, 0], chest: [4, 0, 0], neck: [-6, 0, 0], shL: [-70, 0, 40], elL: [-20, 0, 0], shR: [-40, 0, -45], elR: [-20, 0, 0],
    hipL: [-50, 0, 8], knL: [70, 0, 0], hipR: [-30, 0, -8], knR: [60, 0, 0] }, [-0.55, -0.35, -0.76]),
  land: P([28, 90, 0], { spine: [18, 0, 0], chest: [12, -10, 0], neck: [-22, 8, 0], shL: [-55, 0, 18], elL: [-10, 0, 0], shR: [25, 0, -40], elR: [-25, 0, 0],
    hipL: [-95, 0, 14], knL: [125, 0, 0], hipR: [-35, 0, -14], knR: [120, 0, 0] }, [-0.55, -0.05, -0.83]),
  drive: P([18, 90, 0], { spine: [8, 0, 0], chest: [4, 35, 0], neck: [-12, -30, 0], shL: [-80, 0, 30], elL: [-80, 0, 0], shR: [-30, 0, -65], elR: [-95, 0, 0],
    hipL: [-70, 0, 10], knL: [80, 0, 0], hipR: [10, 0, -10], knR: [50, 0, 0] }, [-0.62, 0.30, -0.72]),
  strike: P([12, 90, 0], { spine: [6, 0, 0], chest: [4, -25, 0], neck: [-12, 22, 0], shL: [-82, 0, -8], elL: [-12, 0, 0], shR: [-78, 0, 10], elR: [-8, 0, 0],
    hipL: [-78, 0, 8], knL: [72, 0, 0], hipR: [28, 0, -6], knR: [18, 0, 0] }, [0.2, 0.66, 1]),
};
// running: a procedural cycle, the fork trailing low behind her
function runPose(W) {
  const φ = Math.PI * 2 * 1.55 * (W - EV.launch), s = Math.sin(φ), c = Math.cos(φ);
  return P([12, 90, 0], {
    spine: [10, 0, 0], chest: [4, 10 * s, 0], neck: [-14, -8 * s, 0],
    shL: [38 * s, 0, 12], elL: [-80, 0, 0], shR: [42, 0, -16], elR: [-22, 0, 0],
    hipL: [-18 - 48 * s, 0, 4], knL: [28 + 62 * Math.max(0, c), 0, 0], hipR: [-18 + 48 * s, 0, -4], knR: [28 + 62 * Math.max(0, -c), 0, 0],
  }, [-0.22, -0.34, -0.91]);
}
const B_POSE = {
  idle: P([6, -90, 0], { spine: [10, 0, 0], chest: [12, 0, 0], neck: [-18, 0, 0], shL: [-12, 0, 20], elL: [-22, 0, 0], shR: [2, 0, -24], elR: [-14, 0, 0],
    hipL: [-12, 0, 13], knL: [18, 0, 0], hipR: [6, 0, -13], knR: [14, 0, 0] }),
  coil: P([10, -112, 0], { spine: [14, -16, 0], chest: [10, -26, 0], neck: [-16, 30, 0], shL: [-62, 0, 32], elL: [-42, 0, 0], shR: [32, 0, -38], elR: [-10, 0, 0],
    hipL: [-32, 0, 12], knL: [38, 0, 0], hipR: [10, 0, -16], knR: [22, 0, 0] }),
  swing: P([-6, -62, 0], { spine: [-6, 20, 0], chest: [-10, 30, 0], neck: [-6, -20, 0], shL: [20, 0, 26], elL: [-52, 0, 0], shR: [-158, 0, -30], elR: [-10, 0, 0],
    hipL: [-20, 0, 12], knL: [26, 0, 0], hipR: [6, 0, -12], knR: [12, 0, 0] }),
  haul: P([-14, -90, 0], { spine: [-10, 0, 0], chest: [-4, 0, 0], neck: [-6, 0, 0], shL: [-62, 0, 12], elL: [-92, 0, 0], shR: [-62, 0, -12], elR: [-92, 0, 0],
    hipL: [-30, 0, 12], knL: [32, 0, 0], hipR: [-6, 0, -12], knR: [30, 0, 0] }),
  shield: P([12, -90, 0], { spine: [10, 0, 0], chest: [10, 0, 0], neck: [-16, 0, 0], shL: [-72, 0, 30], elL: [-58, 0, 0], shR: [-72, 0, -30], elR: [-58, 0, 0],
    hipL: [-26, 0, 13], knL: [42, 0, 0], hipR: [12, 0, -13], knR: [26, 0, 0] }),
  blown: P([-40, -90, 0], { spine: [26, 0, 0], chest: [22, 0, 0], neck: [20, 0, 0], shL: [-112, 0, 42], elL: [-18, 0, 0], shR: [-112, 0, -42], elR: [-18, 0, 0],
    hipL: [-72, 0, 16], knL: [62, 0, 0], hipR: [-48, 0, -16], knR: [84, 0, 0] }),
};
export const POSES = { L: L_POSE, B: B_POSE };

/** Pose keys: [W, pose name | 'run']. Between keys the pose eases from one to the next. */
export const L_KEYS = [[0, 'stance'], [EV.launch, 'stance'], [EV.launch + 0.18, 'run'], [1.86, 'run'], [EV.takeoff, 'takeoff'], [2.42, 'apex'], [EV.apex, 'apex'],
  [2.92, 'apex'], [3.12, 'layout'], [3.33, 'layout'], [3.48, 'drop'], [EV.land, 'land'], [3.72, 'land'], [3.98, 'drive'], [EV.contact, 'strike']];
export const B_KEYS = [[0, 'idle'], [2.40, 'idle'], [EV.apex, 'coil'], [3.25, 'swing'], [3.36, 'swing'], [3.70, 'haul'], [3.98, 'shield'], [EV.contact, 'shield'], [EV.contact + 0.10, 'blown']];

const poseOf = (who, name, W) => (name === 'run' ? runPose(W) : POSES[who][name]);
function blendPose(a, b, k) {
  const j = {};
  for (const n of new Set([...Object.keys(a.j), ...Object.keys(b.j)])) j[n] = mix(a.j[n] ?? [0, 0, 0], b.j[n] ?? [0, 0, 0], k);
  return { root: mix(a.root, b.root, k), j, fork: a.fork && b.fork ? norm(mix(a.fork, b.fork, k)) : a.fork ?? b.fork };
}
export function poseAt(who, W) {
  const keys = who === 'L' ? L_KEYS : B_KEYS;
  if (W <= keys[0][0]) return poseOf(who, keys[0][1], W);
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, na] = keys[i], [b, nb] = keys[i + 1];
    if (W <= b) return blendPose(poseOf(who, na, W), poseOf(who, nb, W), smooth((W - a) / (b - a)));
  }
  const last = poseOf(who, keys[keys.length - 1][1], W);
  if (who === 'B' && W > EV.contact) return { ...last, root: [last.root[0] - 230 * (W - EV.contact - 0.1), last.root[1], last.root[2] + 40 * (W - EV.contact)] }; // the tumble
  return last;
}

/** Everything about a character at world time W: joints, fork, head. */
export function bodyAt(who, W) {
  const rig = who === 'L' ? RIG_L : RIG_B, pose = poseAt(who, W), p = who === 'L' ? rootL(W) : rootB(W);
  const q = quatEuler(pose.root, 'YXZ'), joints = skeleton(rig, { p, q }, pose);
  const out = { rig, pose, joints, q };
  if (who === 'L') {
    const dir = norm(qrot(q, pose.fork)), grip = joints.haR.p;
    out.fork = { dir, butt: add(grip, mul(dir, -0.55)), tip: add(grip, mul(dir, 1.30)), grip };
  }
  return out;
}
export const FORK = { length: 1.85, grip: 0.55, tine: 0.36, gap: 0.11 };

/** Named points the camera can follow. */
export function anchor(name, W) {
  switch (name) {
    case 'L': return rootL(W);
    case 'Lchest': return bodyAt('L', W).joints.chest.p;
    case 'Lhead': return bodyAt('L', W).joints.head.p;
    case 'B': return bodyAt('B', W).joints.chest.p;
    case 'bell': return bellAt(W);
    case 'contact': return CONTACT;
    default: throw new Error(`unknown anchor ${name}`);
  }
}

// ---------- the camera. Every key is a turntable rig: a target, then azimuth (0 = the camera sits east of the target,
// 90 = south), elevation, distance and focal length on a full-frame gate. Parameters move on monotone cubics in edit
// time; targets blend between keys. A target is a world point or a named anchor plus an offset.
export const SHOTS = [
  { id: 'SH010', name: 'Standoff', move: null, t0: 0, t1: 1.25,
    note: 'Low, behind her shoulder. The Bellwright fills the window light at the end of the line. She breaks.',
    keys: [
      { t: 0.00, target: [0.6, 1.60, -0.45], az: 172.6, el: -2.6, dist: 7.95, mm: 24 },
      { t: 1.25, target: [0.6, 1.60, -0.45], az: 172.0, el: -2.2, dist: 7.45, mm: 24 },
    ] },
  { id: 'SH020', name: 'The Leap / The Freeze', move: 'MOVE 01 · 360° FREEZE', t0: 1.25, t1: 7.25,
    note: 'Track her charge from the front, tilt up through the takeoff, brake into the apex, then one full orbit of the held instant.',
    keys: [
      { t: 1.25, target: 'L', off: [0, 0.30, 0], az: 52, el: 4, dist: 3.5, mm: 32 },
      { t: 2.05, target: 'L', off: [0, 0.35, 0], az: 66, el: -2, dist: 3.7, mm: 28 },
      { t: 2.70, target: 'Lchest', off: [0, 0.25, 0], az: 80, el: -10, dist: 3.6, mm: 30 },
      { t: 3.20, target: 'Lchest', off: [0, 0.20, 0], az: 88, el: -6, dist: 3.3, mm: 35 },
      { t: 4.15, target: 'Lchest', off: [0, 0.32, 0], az: 2, el: 0, dist: 2.3, mm: 50 },
      { t: 5.05, target: 'Lchest', off: [0, 0.20, 0], az: -88, el: 8, dist: 3.0, mm: 40 },
      { t: 5.95, target: 'Lchest', off: [0, 0.00, 0], az: -176, el: 24, dist: 3.4, mm: 28 },
      { t: 6.85, target: 'Lchest', off: [0, 0.20, 0], az: -266, el: -5, dist: 3.3, mm: 35 },
      { t: 7.00, target: 'Lchest', off: [0, 0.20, 0], az: -271, el: -6, dist: 3.35, mm: 35 },
      { t: 7.25, target: 'Lchest', off: [0, 0.10, 0], az: -280, el: -9, dist: 3.9, mm: 30 },
    ] },
  { id: 'SH030', name: 'The Dodge', move: 'MOVE 03 · DODGE ORBIT', t0: 7.25, t1: 14.65,
    note: 'Cut on the snap. Time drops to 2% as the bell crosses her face; the camera swings 190° around the gap and finds the Bellwright in the window behind it.',
    keys: [
      { t: 7.25, target: 'Lhead', off: [0.2, 0.45, 0], az: 132, el: -20, dist: 5.0, mm: 22 },
      { t: 7.70, target: 'Lhead', off: [0.15, 0.45, 0], az: 108, el: 2, dist: 3.0, mm: 32 },
      { t: 10.90, target: 'Lhead', off: [0.20, 0.45, 0], az: 182, el: 4, dist: 2.4, mm: 24 },
      { t: 14.20, target: 'Lhead', off: [0.20, 0.35, 0], az: 286, el: 14, dist: 3.0, mm: 30 },
      { t: 14.65, target: 'L', off: [0, 0.40, 0], az: 296, el: 6, dist: 3.6, mm: 30 },
    ] },
  { id: 'SH040', name: 'The Ring', move: 'MOVE 04 · IMPACT TRANSITION', t0: 14.65, t1: 25,
    note: 'Cut on the landing. Real time into the strike, impact frames, then the camera rides the ring out through the window behind the Bellwright and opens on the drowned city.',
    keys: [
      { t: 14.65, target: [2.5, 1.25, 0], az: -92, el: 3, dist: 5.6, mm: 28 },
      { t: 15.40, target: 'contact', off: [0, 0, 0], az: -99, el: -2, dist: 3.5, mm: 32 },
      { t: 16.30, target: 'contact', off: [0.3, 0.1, 0], az: -114, el: 1, dist: 3.4, mm: 30 },
      { t: 17.20, target: 'B', off: [0, -0.2, 0], az: -192, el: 3, dist: 5.4, mm: 26 },
      { t: 18.10, target: 'B', off: [0, 0, 0], az: -186, el: 6, dist: 4.6, mm: 26 },
      { t: 19.60, target: [32, -1, 1], az: -148, el: 0, dist: 30, mm: 22 },
      { t: 21.60, target: [28, 0, 3], az: -122, el: -6, dist: 50, mm: 16 },
      { t: 25.00, target: [28, 0, 3], az: -120, el: -6.5, dist: 52, mm: 16 },
    ] },
];
export const CUTS = SHOTS.slice(1).map((s) => s.t0);
export const shotAt = (t) => SHOTS.find((s) => t < s.t1) ?? SHOTS[SHOTS.length - 1];
const targetOf = (k, W) => (Array.isArray(k.target) ? k.target : add(anchor(k.target, W), k.off ?? [0, 0, 0]));

/** Where the camera is and what it sees at edit time t. */
export function cameraAt(t) {
  const shot = shotAt(t), W = worldAt(t), ks = shot.keys;
  let i = 0; while (i < ks.length - 2 && t > ks[i + 1].t) i++;
  const a = ks[i], b = ks[i + 1] ?? a, k = b === a ? 0 : smooth((t - a.t) / (b.t - a.t));
  const target = mix(targetOf(a, W), targetOf(b, W), k);
  const az = mono(ks, 'az', t) * D, el = mono(ks, 'el', t) * D, dist = mono(ks, 'dist', t), mm = mono(ks, 'mm', t);
  const pos = add(target, [dist * Math.cos(el) * Math.cos(az), dist * Math.sin(el), dist * Math.cos(el) * Math.sin(az)]);
  const vfov = (2 * Math.atan(SENSOR_H / 2 / mm)) / D;
  return { shot, W, speed: speedAt(t), pos, target, mm, vfov, az: az / D, el: el / D, dist };
}

/** The drowned city: towers standing in the flood, kept clear of the Bellwright's fall and of every camera position. */
let cityCache;
export function city() {
  if (cityCache) return cityCache;
  const r = rng(7), towers = [], cams = [];
  for (let n = Math.round(17 * FPS); n < FRAMES; n += 4) cams.push(cameraAt(n / FPS).pos);
  for (let guard = 0; towers.length < 110 && guard < 20000; guard++) {
    const d = 34 + r() ** 1.4 * 420, a = r() * Math.PI * 2, x = d * Math.cos(a), z = d * Math.sin(a), w = 6 + r() * 9, top = -30 + r() ** 0.8 * 46, spin = r();
    if (x > 0 && Math.abs(z) < 22 && d < 120) continue;                       // the fall
    if (cams.some((c) => Math.hypot(c[0] - x, c[2] - z) < w + 14)) continue;  // the lens
    if (towers.some((t) => Math.hypot(t.x - x, t.z - z) < 16)) continue;
    towers.push({ x, z, w, top, spin });
  }
  return (cityCache = towers);
}

// ---------- the colour script: grade keys in edit time. sat 0 = only SIGNAL survives (the grade keeps orange).
export const GRADE = [
  [0.00, { sat: 0.55, exp: 0.00, lift: 0.00 }], [2.40, { sat: 0.55, exp: 0.00, lift: 0.00 }],
  [3.20, { sat: 0.06, exp: -0.05, lift: 0.03 }], [7.00, { sat: 0.06, exp: -0.05, lift: 0.03 }],  // the freeze drains to ink and bone
  [7.25, { sat: 0.60, exp: 0.22, lift: 0.00 }], [7.45, { sat: 0.55, exp: 0.00, lift: 0.00 }],    // the snap flares
  [7.70, { sat: 0.14, exp: 0.05, lift: 0.02 }], [14.2, { sat: 0.14, exp: 0.05, lift: 0.02 }],    // the dodge: cold, bronze glints
  [14.7, { sat: 0.55, exp: 0.00, lift: 0.00 }], [15.38, { sat: 0.60, exp: 0.00, lift: 0.00 }],
  [15.6, { sat: 0.95, exp: 0.25, lift: 0.00 }], [18.0, { sat: 0.80, exp: 0.08, lift: 0.00 }],    // the ring: orange owns the frame
  [21.0, { sat: 0.50, exp: 0.00, lift: 0.01 }], [25.0, { sat: 0.50, exp: -0.04, lift: 0.01 }],  // the drowned city
];
export function gradeAt(t) {
  const i = GRADE.findIndex(([x]) => x >= t);
  if (i <= 0) return GRADE[Math.max(0, i)][1];
  const [a, ga] = GRADE[i - 1], [b, gb] = GRADE[i], k = smooth((t - a) / (b - a));
  return { sat: lerp(ga.sat, gb.sat, k), exp: lerp(ga.exp, gb.exp, k), lift: lerp(ga.lift, gb.lift, k) };
}

/** The two impact frames: the first frame at or after the contact, and the one after it. */
export const IMPACT_FRAME = Math.ceil(editAt(EV.contact) * FPS);

/** Labelled edit-time beats, for the scrub bar, the sound and the docs. */
export const BEATS = [
  ['She breaks', editAt(EV.launch)], ['Takeoff', editAt(EV.takeoff)], ['Freeze', editAt(EV.apex)], ['Snap', 7.0],
  ['Near miss', editAt(EV.miss)], ['Land', editAt(EV.land)], ['Contact', editAt(EV.contact)],
  ['Louvers go', editAt(EV.contact + (BELFRY.louverX - CONTACT[0]) / RING_SPEED)],
  ['Through the window', editAt(EV.contact + (BELFRY.louverX - LAUNCH_B.p[0]) / LAUNCH_B.v[0])],
  ['Bell hits the flood', editAt(EV.contact + fallTime(BELL_PATH[BELL_PATH.length - 1][1][1], LAUNCH_BELL.v[1]))],
];

export const tc = (n) => { const s = Math.floor(n / FPS), f = n % FPS; return `00:00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`; };
