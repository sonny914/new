// Easing: CSS-compatible cubic-bezier curves plus the theme's named curves, so a video eases
// exactly like the site's stylesheet does.
import type {Bezier, Theme} from '../themes/types';

export type EaseFn = (t: number) => number;
export type EaseSpec = string | Bezier | undefined;

const cache = new Map<string, EaseFn>();

/** A CSS cubic-bezier(x1, y1, x2, y2) as a function of progress (0..1). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  const key = `${x1},${y1},${x2},${y2}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (x1 === y1 && x2 === y2) {
    const lin: EaseFn = (t) => t;
    cache.set(key, lin);
    return lin;
  }
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  const solve = (x: number) => {
    let s = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(s) - x;
      if (Math.abs(err) < 1e-7) return s;
      const d = slopeX(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = x;
    for (let i = 0; i < 40; i++) {
      const v = sampleX(s);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };
  const fn: EaseFn = (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solve(t));
  };
  cache.set(key, fn);
  return fn;
}

const STEP: EaseFn = (t) => (t >= 1 ? 1 : 0);

/**
 * Resolve an easing spec: a theme curve name (`out`, `in`, `inOut`, `linear`), `step`,
 * a `cubic-bezier(a,b,c,d)` string, or a 4-number array.
 */
export function ease(theme: Theme, spec: EaseSpec, fallback: keyof Theme['motion']['easing'] = 'out'): EaseFn {
  if (spec === undefined) return cubicBezier(...theme.motion.easing[fallback]);
  if (Array.isArray(spec)) return cubicBezier(...spec);
  if (spec === 'step') return STEP;
  const named = (theme.motion.easing as Record<string, Bezier>)[spec];
  if (named) return cubicBezier(...named);
  const m = spec.match(/^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/);
  if (m) return cubicBezier(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]));
  throw new Error(`Unknown easing "${spec}". Use out | in | inOut | linear | step | cubic-bezier(a,b,c,d).`);
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Progress of `frame` through [start, start + duration], eased and clamped. */
export function progress(frame: number, start: number, duration: number, fn: EaseFn = (t) => t): number {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return fn(clamp01((frame - start) / duration));
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
