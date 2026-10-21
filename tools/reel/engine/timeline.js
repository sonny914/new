// Shared by picture and sound: easing, keyframe tracks, and the plan that turns a config's morph sequence into times.
// Any time in a config may be a number of seconds or a reference to the sequence:
//   's2'        step 2 starts morphing          's2.land'   step 2 has landed (at + dur)
//   's2+0.15'   offsets work on both forms      'end'       the reel's duration
//   'settle'    the final form is at rest: the logo's front-on moment if the reel ends on it, else the last landing
// so retiming a step moves the copy, camera and sound that hang off it.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const inOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const inCubic = (k) => k * k * k;
export const outExpo = (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
export const outBack = (k, s = 1.4) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;

/** Seeded Park–Miller generator: same seed, same reel, on every machine and at every resolution. */
export function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

/** Smooth keyframe track: [[t, v], ...] (t already resolved to seconds) → value at t. Holds the end values. */
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  let i = 0; while (keys[i + 1][0] < t) i++;
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
  const k = (t - t0) / (t1 - t0);
  return lerp(v0, v1, inOut(k) * 0.5 + smooth(k) * 0.5);
}

/** The default length of each morph, in seconds: its choreography is tuned at this length and scales with `dur`. */
export const MORPH_BASE = { converge: 0.95, bloom: 0.85, stretch: 1.3, scatter: 1.15 };

/** Resolve a config's sequence into steps with absolute times, and a resolver for time references. */
export function plan(cfg) {
  const steps = [];
  const time = (ref) => {
    if (typeof ref === 'number') return ref;
    const m = /^\s*(end|settle|s(\d+)(\.land)?)\s*([+-]\s*[\d.]+)?\s*$/.exec(String(ref));
    if (!m) throw new Error(`bad time reference "${ref}" (use seconds, 's2', 's2.land', 's2+0.3', 'settle' or 'end')`);
    let base;
    if (m[1] === 'end') base = cfg.duration;
    else if (m[1] === 'settle') { const last = steps[steps.length - 1]; base = last.to === 'logo' && cfg.logo?.front !== undefined ? time(cfg.logo.front) : last.land; }
    else {
      const st = steps[Number(m[2]) - 1];
      if (!st) throw new Error(`time reference "${ref}": the sequence has ${steps.length} steps`);
      base = m[3] ? st.land : st.at;
    }
    return base + (m[4] ? Number(m[4].replace(/\s/g, '')) : 0);
  };
  for (const s of cfg.sequence.steps) {
    const dur = s.dur ?? MORPH_BASE[s.morph];
    if (!(s.morph in MORPH_BASE)) throw new Error(`unknown morph "${s.morph}" (use ${Object.keys(MORPH_BASE).join(', ')})`);
    const at = time(s.at);
    steps.push({ ...s, at, dur, land: at + dur, scale: dur / MORPH_BASE[s.morph] });
  }
  steps.forEach((s, j) => { s.index = j + 1; s.end = j + 1 < steps.length ? steps[j + 1].at : cfg.duration; s.last = j === steps.length - 1; });
  const keys = (list) => list.map(([t, v]) => [time(t), v]).sort((a, b) => a[0] - b[0]);
  return { steps, time, keys, start: cfg.sequence.start };
}

const hex = (h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16));
export const rgb = (h) => (Array.isArray(h) ? h : hex(h));
