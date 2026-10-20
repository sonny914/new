// ════════════════════════════════════════════════════════════════════════════════════════════════
//  REEL CONFIG: the one file to edit for a new reel. The engine (tools/reel/engine/) stays as is.
//
//  Times can be seconds (2.5) or tied to the morph sequence, so retiming a step moves everything on it:
//    's2' = step 2 starts · 's2.land' = step 2 has formed · 's2+0.3' / 's3.land-0.4' = offsets · 'end' = duration
//
//  Preview (fast, 540×960):   npm run reel:preview      → tools/reel/out/preview.mp4
//  Export  (final, 1080×1920): npm run reel:export       → <output>/reel.mp4 + reel-poster.jpg
// ════════════════════════════════════════════════════════════════════════════════════════════════

export default {
  // ── 1. DURATION & FORMAT ──────────────────────────────────────────────────────────────────────
  duration: 10,                       // seconds; exports are exactly this long
  fps: 30,
  width: 1080, height: 1920,
  output: 'experiments/quiet-bands-reel', // export folder (repo-relative)
  poster: 'end-0.1',                  // which moment becomes reel-poster.jpg

  // ── 2. MOTION PRESET ──────────────────────────────────────────────────────────────────────────
  // 'one-idea'   (approved) point → sphere → spinning ring → band. Balanced, 120 bpm.
  // 'slow-orbit' band → sphere → ring from above → band. Calm, wide, 100 bpm.
  // 'pulse'      point bursts into a ring → beating sphere → band. Fast, percussive, 128 bpm.
  // The preset supplies the morph sequence, camera moves and rhythm; anything set below overrides it.
  preset: 'one-idea',

  // ── 3. COPY & TIMING ──────────────────────────────────────────────────────────────────────────
  // Every preset has four steps: line 1 sits on step 1, line 2 on step 3, the end title on step 4.
  // style: 'rise' (calm, letters rise out of a mask) | 'slide' (letters slide in with motion blur)
  // bell: ring a note on each word as it appears.
  copy: [
    { text: 'ONE IDEA.', in: 's1.land+0.05', out: 's2-0.08', style: 'rise', bell: true },
    { text: 'SET IT IN MOTION.', in: 's3.land-0.4', out: 's4-0.1', style: 'slide' },
  ],
  end: {
    title: 'QUIET BANDS.', in: 's4.land+0.05',
    tag: 'Practical AI for creators.', tagIn: 's4.land+0.5',
    mark: 'type',                     // 'type' sets the title as text · 'wordmark' uses assets/brand/wordmark.svg (brand rule)
  },

  // ── 4. PARTICLE SHAPES & MORPH SEQUENCE ───────────────────────────────────────────────────────
  // null = use the preset's. To write your own, keep four steps (so the copy timing still fits):
  //   sequence: { start: 'dust', steps: [
  //     { to: 'core',   morph: 'converge', at: 0,    dur: 0.95 },
  //     { to: 'sphere', morph: 'bloom',    at: 2.5,  dur: 0.85 },
  //     { to: 'torus',  morph: 'stretch',  at: 4.55, dur: 1.3 },
  //     { to: 'band',   morph: 'scatter',  at: 7.15, dur: 1.15 } ] },
  // shapes: dust · core · sphere · torus · band      morphs: converge · bloom · stretch · scatter
  // (dur is optional; each morph has a tuned default and scales with what you give it)
  // A step may also set bed: 'hum' | 'pulse' | 'drive' | 'resolve' | 'none' to choose its sound bed.
  sequence: null,
  particles: {
    count: 3600,                      // more = denser forms, slower renders
    size: 1,                          // point size multiplier
    accentShare: 0.075,               // share of particles in the accent colour
    shutter: 0.018, trail: 0.07,      // motion blur and the faint trail behind it, in seconds
    seed: 20261020,                   // change for a different scatter of the same design
  },
  satellites: { count: 3 },           // orange points in orbit; `from: 's2+0.25'` overrides the preset's entrance

  // ── 5. CAMERA ─────────────────────────────────────────────────────────────────────────────────
  // intensity scales every move (dolly, roll, spin, flow) around the resting shot: 0.6 calmer · 1 as designed · 1.3 bolder.
  // keys override the preset's tracks one at a time, as [[time, value], ...]:
  //   dist (camera distance; ~4 frames the sculpture) · pitch (radians; higher looks down) · roll (radians)
  //   cy (sculpture centre, px from the top) · spin (rad/s) · flow (rad/s of points along torus and band)
  camera: { intensity: 1, keys: null },

  // ── 6. COLOURS ────────────────────────────────────────────────────────────────────────────────
  colors: {
    ground: '#000000',
    particles: '#F2EEE5',
    type: '#F2EEE5',
    accent: '#FF5A00',                // accent particles, satellites, nucleus glow, end hairline
    glow: 0.5,                        // bloom strength
    vignette: 0.75,
  },
  type: {
    family: 'Inter',
    line: { size: 42, weight: 500, y: 1520, track: [0.42, 0.26] },   // track: [entering, settled], in ems
    title: { size: 64, weight: 600, y: 1470, track: [0.55, 0.16], wordmarkWidth: 420 },
    tag: { size: 38, weight: 400, opacity: 0.72, gap: 78, tracking: 1 },
    hairline: true,                   // the short accent line under the end title
  },

  // ── 7. AUDIO ──────────────────────────────────────────────────────────────────────────────────
  // The score is generated from the sequence: each morph has a gesture, each held shape a bed.
  audio: {
    enabled: true,
    key: 'D',                         // root of every note: C, C#, D, … B
    loudness: 2.6,                    // drive into the limiter; 2.6 ≈ -14 LUFS (Reels/TikTok)
    reverb: 0.6,
  },
  rhythm: { bpm: null, origin: null }, // null = the preset's tempo, and the beat grid starts where the preset says
};
