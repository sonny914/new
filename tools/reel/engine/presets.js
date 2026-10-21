// The motion presets: a morph sequence, a camera, a rhythm and the satellites' entrance, built on the engine's
// shapes (dust, core, sphere, torus, band) and morphs (converge, bloom, stretch, scatter).
// Every preset has four steps on the same plan, so copy timed against steps works with any of them:
//   s1 lands → first line · s2 transforms (no copy) · s3 lands → second line · s4 lands → end title.
// All three resolve on the QB mark itself, sampled from assets/brand/mark.svg, and hold it front-on.

export const PRESETS = {
  // The approved reel. One point of light becomes a sphere, a spinning ring, then the QB mark itself:
  // it assembles by ~7.5 s, turns as one rigid sculpture and holds front-on from logo.front (8.75 s) to the end.
  'one-idea': {
    sequence: {
      start: 'dust',
      steps: [
        { to: 'core', morph: 'converge', at: 0, dur: 0.95 },
        { to: 'sphere', morph: 'bloom', at: 2.4, dur: 0.85 },
        { to: 'torus', morph: 'stretch', at: 3.9, dur: 1.2 },
        { to: 'logo', morph: 'scatter', at: 6.0, dur: 1.15 },
      ],
    },
    rhythm: { bpm: 120, origin: 's2' },
    satellites: { count: 3, from: 's2+0.25' },
    camera: {
      dist: [[0, 6.2], ['s1.land', 3.4], ['s2', 2.2], ['s2+0.75', 4.4], ['s3', 4.2], ['s3.land', 5.0], ['s4-0.25', 4.5], ['s4+0.45', 3.9], ['s4.land', 4.3], ['s4.land+1.6', 4.45], ['end', 4.45]],
      pitch: [[0, 0.1], ['s2', 0.05], ['s3', 0.18], ['s3.land', 0.62], ['s4-0.15', 0.9], ['s4+0.45', 0.4], ['s4.land', 0.15], ['s4.land+1.6', 0], ['end', 0]],
      roll: [[0, 0.06], ['s2', -0.02], ['s3', 0.04], ['s3.land', -0.1], ['s4-0.05', 0.08], ['s4.land', -0.03], ['s4.land+1.6', 0], ['end', 0]],
      cy: [[0, 900], ['s2', 880], ['s3-0.15', 930], ['s3.land-0.55', 860], ['s4-0.05', 900], ['s4+0.65', 930], ['s4.land', 840], ['s4.land+1.6', 820], ['end', 820]],
      spin: [[0, 0.12], ['s2-0.05', 0.5], ['s2+0.15', 3.2], ['s2+1.1', 0.7], ['s3', 0.9], ['s3.land', 1.4], ['s4-0.55', 2.2], ['s4', 1.6], ['s4.land', 0.55], ['end', 0.32]],
      flow: [[0, 0], ['s3.land-0.3', 0.4], ['s3.land+0.35', 2.6], ['s4', 3.4], ['s4.land', 0.9], ['end', 0.45]],
    },
  },

  // Calm and wide. The band gathers first, swells into a sphere, opens into a ring seen from above, then the ring
  // spirals inward into the QB mark, which turns once and holds front-on.
  'slow-orbit': {
    sequence: {
      start: 'dust',
      steps: [
        { to: 'band', morph: 'converge', at: 0, dur: 1.4 },
        { to: 'sphere', morph: 'stretch', at: 2.45, dur: 1.0 },
        { to: 'torus', morph: 'stretch', at: 3.9, dur: 1.2 },
        { to: 'logo', morph: 'converge', at: 6.0, dur: 1.15 },
      ],
    },
    rhythm: { bpm: 100, origin: 's1.land' },
    satellites: { count: 3, from: 's1.land+0.2' },
    camera: {
      dist: [[0, 7.0], ['s1.land', 4.5], ['s2', 4.2], ['s2.land', 4.1], ['s3', 4.4], ['s3.land', 4.9], ['s4', 4.7], ['s4.land', 4.35], ['s4.land+1.6', 4.45], ['end', 4.45]],
      pitch: [[0, 0.35], ['s1.land', 0.5], ['s2', 0.45], ['s2.land', 0.15], ['s3', 0.2], ['s3.land', 0.85], ['s4', 0.7], ['s4.land', 0.12], ['s4.land+1.6', 0], ['end', 0]],
      roll: [[0, 0.05], ['s2', -0.03], ['s3.land', 0.05], ['s4.land', -0.02], ['s4.land+1.6', 0], ['end', 0]],
      cy: [[0, 880], ['s2', 880], ['s3.land', 860], ['s4', 890], ['s4.land', 840], ['s4.land+1.6', 820], ['end', 820]],
      spin: [[0, 0.15], ['s1.land', 0.55], ['s2', 0.45], ['s2.land', 0.8], ['s3.land', 1.0], ['s4', 1.3], ['s4.land', 0.4], ['end', 0.25]],
      flow: [[0, 0.3], ['s1.land', 0.7], ['s2', 0.3], ['s3.land', 1.4], ['s4', 1.9], ['s4.land', 0.6], ['end', 0.35]],
    },
  },

  // Fast and percussive. The point bursts straight into a spinning ring, scatters into a beating sphere, then the
  // sphere bursts outward into the QB mark (a small overshoot, then it locks), turns and holds front-on.
  pulse: {
    sequence: {
      start: 'dust',
      steps: [
        { to: 'core', morph: 'converge', at: 0, dur: 0.7 },
        { to: 'torus', morph: 'bloom', at: 1.9, dur: 0.75 },
        { to: 'sphere', morph: 'scatter', at: 3.5, dur: 1.0 },
        { to: 'logo', morph: 'bloom', at: 6.0, dur: 0.85 },
      ],
    },
    rhythm: { bpm: 128, origin: 's2' },
    satellites: { count: 3, from: 's2+0.2' },
    camera: {
      dist: [[0, 5.6], ['s1.land', 3.0], ['s2', 2.4], ['s2+0.6', 4.7], ['s3-0.2', 4.4], ['s3+0.4', 3.6], ['s3.land', 4.3], ['s4', 4.1], ['s4.land', 4.35], ['s4.land+1.6', 4.45], ['end', 4.45]],
      pitch: [[0, 0.1], ['s2', 0.1], ['s2.land', 0.75], ['s3', 0.85], ['s3.land', 0.2], ['s4-0.6', 0.5], ['s4', 0.3], ['s4.land', 0.1], ['s4.land+1.6', 0], ['end', 0]],
      roll: [[0, 0.08], ['s2', -0.06], ['s3', 0.1], ['s3.land', -0.08], ['s4-0.5', 0.08], ['s4.land', -0.03], ['s4.land+1.6', 0], ['end', 0]],
      cy: [[0, 900], ['s2', 880], ['s3', 900], ['s3.land', 880], ['s4.land', 840], ['s4.land+1.6', 820], ['end', 820]],
      spin: [[0, 0.3], ['s2-0.05', 0.6], ['s2+0.15', 3.6], ['s2.land+0.3', 1.6], ['s3', 2.4], ['s3.land', 2.2], ['s4-0.3', 2.6], ['s4.land', 0.6], ['end', 0.35]],
      flow: [[0, 0], ['s2.land', 1.6], ['s3', 3.6], ['s3.land', 0.6], ['s4.land', 1.0], ['end', 0.5]],
    },
  },
};

/** Fill a config from its preset: anything the config sets (not null/undefined) wins. */
export function resolveConfig(cfg) {
  const p = PRESETS[cfg.preset];
  if (!p) throw new Error(`unknown preset "${cfg.preset}" (use ${Object.keys(PRESETS).join(', ')})`);
  const pick = (v, d) => (v === null || v === undefined ? d : v);
  return {
    ...cfg,
    sequence: pick(cfg.sequence, p.sequence),
    rhythm: { ...p.rhythm, ...strip(cfg.rhythm) },
    satellites: { ...p.satellites, ...strip(cfg.satellites) },
    camera: { intensity: 1, ...strip(cfg.camera), keys: { ...p.camera, ...strip(cfg.camera?.keys) } },
  };
}
const strip = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== null && v !== undefined));
