// Particle layouts and assignment. A particle never has hidden state: its position is
// layoutA[i] -> layoutB[map[i]] blended by a per-particle progress, so the field is identical on every pass.
import { hash } from './math.js';

export const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // 137.5 deg

/** Phyllotaxis (sunflower) slot k: the densest even packing that grows outward without ever moving old slots. */
export const phyllo = (k, c, cx = 0, cy = 0) => { const r = c * Math.sqrt(k + 0.5), a = k * GOLDEN; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), z: 0 }; };

/** For each slot k > 0, the nearest earlier slot: where k is born from. Growth then reads as division, not spawning. */
export function parents(points) {
  const out = [-1];
  for (let k = 1; k < points.length; k++) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < k; j++) { const dx = points[j].x - points[k].x, dy = points[j].y - points[k].y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } }
    out.push(best);
  }
  return out;
}

/**
 * Birth time for each particle under staged growth, e.g. [{count:10, at:.7, dur:.35}, {count:100, ...}].
 * Inside a stage births accelerate (k^0.75), so each stage reads as one multiplying gesture.
 */
export function birthTimes(n, stages, first = 0) {
  const t = new Array(n).fill(Infinity); t[0] = first;
  let prev = 1;
  for (const s of stages) { for (let k = prev; k < Math.min(s.count, n); k++) t[k] = s.at + s.dur * ((k - prev) / Math.max(1, s.count - prev)) ** (s.curve ?? 0.75); prev = s.count; }
  return t;
}

/**
 * Pair sources with targets so travel is short and ordered: both sets are cut into bands along `axis`
 * and matched in reading order. (Cheap stand-in for optimal transport; it never produces crossing swarms.)
 * Returns map[sourceIndex] = targetIndex. Sources beyond the target count map to -1 (they leave).
 */
export function assign(sources, targets, { band = 24, axis = 'y' } = {}) {
  const other = axis === 'y' ? 'x' : 'y';
  const order = (pts, n) => { const idx = pts.map((_, i) => i).sort((a, b) => pts[a][axis] - pts[b][axis]); const out = []; for (let i = 0; i < idx.length; i += n) out.push(...idx.slice(i, i + n).sort((a, b) => pts[a][other] - pts[b][other])); return out; };
  const map = new Array(sources.length).fill(-1);
  const n = targets.length, ratio = sources.length / n;
  const so = order(sources, Math.round(band * ratio)), to = order(targets, band);
  // spread the kept sources evenly through the source order, so leavers come from everywhere, not one side
  for (let j = 0; j < n; j++) map[so[Math.floor((j + 0.5) * ratio)]] = to[j];
  return map;
}

/** Per-particle jitter in [-1, 1], stable for a given salt. */
export const jitter = (i, salt) => hash(i, salt) * 2 - 1;
