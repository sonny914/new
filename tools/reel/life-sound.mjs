// The life reel's score: a ping on the orange dot and a bloom as the globe opens, a thud under every line, a tinkle down
// "absolutely", a warm chord on "the life", a riser and whoosh as "can't stop" spins the orb up, a low tail, and the ping
// again as it folds back into the dot. Returns a 16-bit stereo WAV buffer.
export function synth({ bloom, l1, l2, l3, l4, l5, l6, fold, LIFE, SPIN }, dur, rate = 44100) {
  const n = Math.round(dur * rate), L = new Float32Array(n), R = new Float32Array(n);
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (t0, len, fn, pan = 0) => {
    const a = Math.round(t0 * rate), b = Math.min(n, a + Math.round(len * rate));
    for (let i = Math.max(0, a); i < b; i++) { const v = fn((i - a) / rate); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
  };
  const thud = (t0, g = 0.8) => { let ph = 0; add(t0, 0.45, (t) => { ph += (2 * Math.PI * (42 + 100 * Math.exp(-t * 28))) / rate; return g * Math.sin(ph) * Math.exp(-t * 8); }); };
  const tink = (t0, f, g = 0.15, pan = 0) => add(t0, 1.0, (t) => g * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2 * t)) * Math.exp(-t * 6), pan);
  const riser = (t0, len, g = 0.16) => { let lp = 0; add(t0, len, (t) => { const k = t / len; lp += (noise() - lp) * (0.02 + 0.4 * k); return g * k * k * lp + g * 0.5 * k * Math.sin(2 * Math.PI * (200 + 900 * k * k) * t); }); };
  // drone: low and patient, a little brighter after the spin-up
  add(0, dur, (t) => { const env = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 0.5); const s = (f) => ((t * f) % 1) * 2 - 1; const lift = t > SPIN ? 1.3 : 1; return 0.05 * env * lift * (s(55) + s(55.35) + 0.6 * Math.sin(2 * Math.PI * 110 * t)) * (0.75 + 0.25 * Math.sin(t * 2.1)); });
  tink(0.05, 880, 0.22); riser(0, bloom, 0.1); thud(bloom, 0.9);
  add(bloom, 1.4, (t) => 0.14 * Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 2.5));
  thud(l1 + 0.1, 0.6);
  [1047, 1175, 1319, 1568, 1760, 2093, 2349, 2637, 3136, 3520].forEach((f, i) => tink(l2 + 0.05 + i * 0.05, f, 0.06, (i / 9) * 1.2 - 0.6));
  thud(l3 + 0.1, 0.65); thud(l4 + 0.1, 0.7);
  for (const f of [220, 277, 330, 440]) add(LIFE, 2.6, (t) => 0.07 * Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.08) * Math.exp(-t * 1.1));
  riser(l5, SPIN - l5 + 0.1, 0.2); thud(SPIN, 1);
  let lp = 0; add(SPIN, 1.4, (t) => { lp += (noise() - lp) * 0.2 * Math.exp(-t * 1.5); return 0.5 * lp * Math.exp(-t * 2); });
  // the spun-up orb keeps ticking, faster than the beat, all the way out
  for (let t = SPIN + 0.2, i = 0; t < fold; t += 0.16, i++) tink(t, i % 2 ? 2637 : 1976, 0.025, i % 2 ? 0.5 : -0.5);
  thud(l6 + 0.1, 0.75);
  add(l6 + 0.6, 4, (t) => 0.1 * (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.5 * t)) * Math.exp(-t * 0.8));
  tink(fold + 0.3, 880, 0.18);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767), 46 + i * 4); }
  return buf;
}
