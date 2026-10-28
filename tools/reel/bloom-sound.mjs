// The bloom reel's score: a warm hum as the bulb glows, a riser into the shatter, glass breaking, a soft patter as the
// seeds land (one tick per seed, pitched by colour), a chord that swells as the field fills, and a low tail.
// Returns a 16-bit stereo WAV buffer.
export function synth({ glow, shatter, field0, field1, line, seeds }, dur, rate = 44100) {
  const n = Math.round(dur * rate), L = new Float32Array(n), R = new Float32Array(n);
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (t0, len, fn, pan = 0) => {
    const a = Math.round(t0 * rate), b = Math.min(n, a + Math.round(len * rate));
    for (let i = Math.max(0, a); i < b; i++) { const v = fn((i - a) / rate); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
  };
  const thud = (t0, g = 0.8) => { let ph = 0; add(t0, 0.5, (t) => { ph += (2 * Math.PI * (40 + 110 * Math.exp(-t * 26))) / rate; return g * Math.sin(ph) * Math.exp(-t * 7); }); };
  const tink = (t0, f, g = 0.1, pan = 0) => add(t0, 0.6, (t) => g * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.01 * t)) * Math.exp(-t * 9), pan);
  // the bulb hums and brightens
  add(glow, shatter - glow, (t) => { const k = t / (shatter - glow); return 0.06 * Math.min(1, t / 0.3) * (1 + k) * Math.sin(2 * Math.PI * 120 * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 240 * t)); });
  let lp = 0; add(shatter - 0.6, 0.6, (t) => { const k = t / 0.6; lp += (noise() - lp) * (0.02 + 0.4 * k); return 0.18 * k * k * lp + 0.08 * k * Math.sin(2 * Math.PI * (300 + 1200 * k * k) * t); });
  // the shatter: a thump, a bright crash, scattered glass
  thud(shatter, 1);
  let hp = 0, prev = 0; add(shatter, 1.2, (t) => { const x = noise(); hp = 0.85 * (hp + x - prev); prev = x; return 0.5 * hp * Math.exp(-t * 4); });
  for (let i = 0; i < 18; i++) tink(shatter + 0.02 + i * 0.045 + (noise() + 1) * 0.02, 2200 + (noise() + 1) * 2200, 0.06, noise() * 0.8);
  // the seeds land: a soft pentatonic patter
  const scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
  seeds.forEach((t, i) => { if (i % 3 === 0) tink(t, scale[i % scale.length], 0.035, ((i * 37) % 100) / 50 - 1); });
  // the field fills: a chord that opens and swells
  for (const [f, d] of [[220, 0], [277, 0.4], [330, 0.8], [440, 1.2], [554, 1.8], [659, 2.4]]) add(field0 + d, dur - field0 - d, (t) => { const env = Math.min(1, t / 1.2) * Math.max(0, 1 - Math.max(0, t - (field1 - field0 - d + 1.5)) / 2.5); return 0.035 * env * Math.sin(2 * Math.PI * f * t + Math.sin(t * 3) * 0.3); }, ((f % 7) / 3.5) - 1);
  thud(line, 0.7);
  add(line, dur - line, (t) => 0.1 * (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.5 * t)) * Math.exp(-t * 0.7));
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767), 46 + i * 4); }
  return buf;
}
