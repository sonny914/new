// Scene sequencing. A composition is a list of scenes with durations; the timeline resolves a global time
// into the active scene(s), local seconds and 0..1 progress, plus an overlap window so scenes hand over
// instead of cutting. Scenes never own state: everything is a pure function of time.
export function timeline(scenes) {
  let at = 0;
  const list = scenes.map((s) => { const start = s.start ?? at; at = start + s.duration; return { ...s, start, end: start + s.duration }; });
  const duration = Math.max(...list.map((s) => s.end));
  return {
    duration, scenes: list,
    /** Map of scene id -> {t (local s), k (0..1), active} at global time T. */
    at(T) {
      const out = {};
      for (const s of list) out[s.id] = { t: T - s.start, k: Math.min(1, Math.max(0, (T - s.start) / s.duration)), active: T >= s.start && T < s.end, start: s.start, end: s.end };
      return out;
    },
    get: (id) => list.find((s) => s.id === id),
  };
}
/** Piecewise keyframes: key(t, [[t0, v0, ease?], [t1, v1, ease?], ...]) - each segment eases with the *destination* key's ease. */
export function key(t, frames, defEase = (k) => k) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, e = defEase] = frames[i], [t0, v0] = frames[i - 1];
    if (t <= t1) { const k = e((t - t0) / (t1 - t0)); return typeof v0 === 'number' ? v0 + (v1 - v0) * k : Object.fromEntries(Object.keys(v0).map((n) => [n, v0[n] + (v1[n] - v0[n]) * k])); }
  }
  return frames[frames.length - 1][1];
}
