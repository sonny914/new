// The reel's score, synthesised: a sub drone, a riser into each act, a kick on every cut, a tick on every state,
// a noise whoosh on the fling and a low bloom on the end card. Returns a 16-bit stereo WAV buffer.
export function synth({ S2, PER, S3, S4, S5, S6 }, dur, rate = 44100) {
  const n = Math.round(dur * rate), L = new Float32Array(n), R = new Float32Array(n);
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (t0, len, fn, pan = 0) => {
    const a = Math.round(t0 * rate), b = Math.min(n, a + Math.round(len * rate));
    for (let i = Math.max(0, a); i < b; i++) { const v = fn((i - a) / rate); L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); }
  };
  const kick = (t0, g = 0.9) => { let ph = 0; add(t0, 0.5, (t) => { ph += (2 * Math.PI * (42 + 120 * Math.exp(-t * 30))) / rate; return g * Math.sin(ph) * Math.exp(-t * 7); }); };
  const tick = (t0, f, pan) => add(t0, 0.12, (t) => 0.22 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 40), pan);
  const riser = (t0, len, g = 0.18) => { let lp = 0; add(t0, len, (t) => { const k = t / len; lp += (noise() - lp) * (0.02 + 0.4 * k); return g * k * k * lp + g * 0.5 * k * Math.sin(2 * Math.PI * (200 + 900 * k * k) * t); }); };
  // drone: two detuned saws through a slow wobble, swelling in
  add(0, dur, (t) => { const env = Math.min(1, t / 1.2) * Math.min(1, (dur - t) / 0.6); const s = (f) => ((t * f) % 1) * 2 - 1; return 0.07 * env * (s(55) + s(55.4) + 0.5 * Math.sin(2 * Math.PI * 110 * t)) * (0.7 + 0.3 * Math.sin(t * 2.4)); });
  // intro: a soft ping at the dot, a bloom at the burst
  add(0.05, 0.6, (t) => 0.25 * Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 8));
  riser(0.0, 0.4, 0.12); kick(0.38, 1);
  add(0.38, 1.2, (t) => 0.15 * Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 3));
  // the montage: nine beats, ascending pentatonic ticks panning across
  const scale = [440, 494, 554, 659, 740, 880, 988, 1109, 1319];
  for (let i = 0; i < 9; i++) { const t = S2 + i * PER; kick(t, i % 2 ? 0.55 : 0.85); tick(t, scale[i], (i / 8) * 1.2 - 0.6); tick(t + PER / 2, scale[i] * 2, 0.6 - (i / 8) * 1.2); }
  for (const [a, b] of [[S3 - 0.5, S3], [S4 - 0.4, S4], [S5 - 0.4, S5], [S6 - 0.5, S6]]) riser(a, b - a);
  for (const c of [S3, S4, S5, S6]) kick(c, 1);
  // grid: the orange ripple, a chord
  for (const f of [330, 415, 494]) add(S3 + 1.0, 1.2, (t) => 0.06 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2));
  // grab: a click on press, a whoosh on the fling
  tick(S4 + 0.6, 2000, 0); let lp = 0;
  add(S4 + 1.9, 1.0, (t) => { lp += (noise() - lp) * 0.15 * Math.exp(-t * 2); return 0.6 * lp * Math.exp(-t * 3); });
  // tune: rising blips as the knobs move
  for (let i = 0; i < 8; i++) tick(S5 + 0.3 + i * 0.18, 600 + i * 120, i % 2 ? 0.4 : -0.4);
  // outro bloom
  add(S6 + 0.8, 1.4, (t) => 0.12 * (Math.sin(2 * Math.PI * 110 * t) + 0.6 * Math.sin(2 * Math.PI * 165 * t) + 0.4 * Math.sin(2 * Math.PI * 220 * t)) * Math.exp(-t * 1.6));
  kick(S6 + 0.8, 1);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767), 46 + i * 4); }
  return buf;
}
