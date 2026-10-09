// Keyframe tracks. Each keyframe's `ease` shapes the segment that arrives at it ("move here,
// easing like this"), which is how a config reads aloud. Values hold before the first key and
// after the last, so a track never extrapolates past what was designed.
import type {Theme} from '../themes/types';
import {ease, type EaseSpec} from './easing';

export interface Key<V> {
  frame: number;
  value: V;
  ease?: EaseSpec;
}

type Numeric = Record<string, number>;

function mix<V extends number | Numeric>(a: V, b: V, t: number): V {
  if (typeof a === 'number') return (a + ((b as number) - a) * t) as V;
  const out: Numeric = {};
  for (const k of Object.keys(a)) {
    const av = (a as Numeric)[k];
    const bv = (b as Numeric)[k] ?? av;
    out[k] = av + (bv - av) * t;
  }
  return out as V;
}

/** Index of the segment containing frame (the key at or before it). */
function segment(keys: {frame: number}[], frame: number): number {
  let lo = 0;
  let hi = keys.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (keys[mid].frame <= frame) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function sampleTrack<V extends number | Numeric>(theme: Theme, keys: Key<V>[], frame: number, fallback: EaseSpec = 'inOut'): V {
  if (!keys.length) throw new Error('sampleTrack: empty track');
  if (frame <= keys[0].frame) return keys[0].value;
  const last = keys[keys.length - 1];
  if (frame >= last.frame) return last.value;
  const i = segment(keys, frame);
  const a = keys[i];
  const b = keys[i + 1];
  const span = b.frame - a.frame;
  if (span <= 0) return b.value;
  const t = ease(theme, b.ease ?? fallback)((frame - a.frame) / span);
  return mix(a.value, b.value, t);
}

export interface PathKey {
  frame: number;
  x: number;
  y: number;
  /** Optional control point: the segment arriving here bends through a quadratic curve. */
  via?: {x: number; y: number};
  ease?: EaseSpec;
}

export interface Point {
  x: number;
  y: number;
}

export function samplePath(theme: Theme, keys: PathKey[], frame: number, fallback: EaseSpec = 'inOut'): Point {
  if (!keys.length) throw new Error('samplePath: empty path');
  if (frame <= keys[0].frame) return {x: keys[0].x, y: keys[0].y};
  const last = keys[keys.length - 1];
  if (frame >= last.frame) return {x: last.x, y: last.y};
  const i = segment(keys, frame);
  const a = keys[i];
  const b = keys[i + 1];
  const span = b.frame - a.frame;
  if (span <= 0) return {x: b.x, y: b.y};
  const t = ease(theme, b.ease ?? fallback)((frame - a.frame) / span);
  if (b.via) {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * b.via.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * b.via.y + t * t * b.y,
    };
  }
  return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
}

/**
 * For each target point, the frame at which a path passes closest to it, sampled once per frame.
 * Elements cleared "as the accent passes" use this, so the clearing stays in lockstep with the
 * accent however its path is edited.
 */
export function closestApproach(theme: Theme, keys: PathKey[], targets: Point[], window?: {from?: number; to?: number}): {frame: number; distance: number}[] {
  const from = Math.max(keys[0].frame, window?.from ?? -Infinity);
  const to = Math.min(keys[keys.length - 1].frame, window?.to ?? Infinity);
  if (to < from) throw new Error(`closestApproach: window ${from}–${to} does not overlap the path.`);
  const samples: Point[] = [];
  for (let f = from; f <= to; f++) samples.push(samplePath(theme, keys, f));
  return targets.map((p) => {
    let best = Infinity;
    let at = from;
    for (let i = 0; i < samples.length; i++) {
      const dx = samples[i].x - p.x;
      const dy = samples[i].y - p.y;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        at = from + i;
      }
    }
    return {frame: at, distance: Math.sqrt(best)};
  });
}
