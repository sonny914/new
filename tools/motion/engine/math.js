// Deterministic math: easing, mixing, seeded randomness. No Math.random anywhere in the engine,
// so frame N is identical on every render (no flicker between passes or subframes).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
/** Progress of t through [a, b], clamped to 0..1. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smoothstep = (k) => k * k * (3 - 2 * k);
export const mix2 = (p, q, k) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), z: lerp(p.z ?? 0, q.z ?? 0, k) });
/** Smooth maximum: max(a, b) without the kink (k = blend width). */
export const smax = (a, b, k = 0.5) => { const h = clamp(0.5 + 0.5 * (a - b) / k); return lerp(b, a, h) + k * h * (1 - h); };

export const ease = {
  linear: (k) => k,
  inOut3: (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2),
  inOut5: (k) => (k < 0.5 ? 16 * k ** 5 : 1 - (-2 * k + 2) ** 5 / 2),
  out3: (k) => 1 - (1 - k) ** 3,
  out5: (k) => 1 - (1 - k) ** 5,
  in3: (k) => k ** 3,
  outExpo: (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k)),
  inExpo: (k) => (k <= 0 ? 0 : 2 ** (10 * k - 10)),
  inOutExpo: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 2 ** (20 * k - 10) / 2 : (2 - 2 ** (-20 * k + 10)) / 2),
  /** Damped spring settle: reaches 1 with one soft overshoot. zeta < 1 overshoots. */
  spring: (k, zeta = 0.72, omega = 11) => {
    if (k >= 1) return 1;
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * k) * (Math.cos(wd * k) + (zeta * omega / wd) * Math.sin(wd * k));
  },
};

/** mulberry32: a seeded PRNG. rng(seed)() -> [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Stable hash of (i, salt) to [0, 1): the per-particle constant that never changes between frames. */
export const hash = (i, salt = 0) => rng((i * 2654435761) ^ (salt * 40503 + 0x9e3779b9))();

/** Quadratic bezier between p and q, bowed sideways by `bow` × distance. Gives travel an arc instead of a ruler line. */
export function arc(p, q, k, bow = 0.18) {
  const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = q.x - p.x, dy = q.y - p.y;
  const cx = mx - dy * bow, cy = my + dx * bow, u = 1 - k;
  return { x: u * u * p.x + 2 * u * k * cx + k * k * q.x, y: u * u * p.y + 2 * u * k * cy + k * k * q.y, z: lerp(p.z ?? 0, q.z ?? 0, k) };
}
