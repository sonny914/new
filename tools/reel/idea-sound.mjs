// The idea reel's score: a low drone, a glass tink as the bulb draws, a thud under every heavy line, a crack on each hit
// (the last one shatters), the filament's buzz and click as it dies, and a low tail. Returns a 16-bit stereo WAV buffer.
export function synth({ l1, l2, l3, l4, l5, l6, out, l7, l8, HITS }, dur, rate = 44100) {
  const n = Math.round(dur * rate), L = new Float32Array(n), R = new Float32Array(n);
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (t0, len, fn, pan = 0) => {
    const a = Math.round(t0 * rate), b = Math.min(n, a + Math.round(len * rate));
    for (let i = Math.max(0, a); i < b; i++) { const v = fn((i - a) / rate); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
  };
  const thud = (t0, g = 0.8) => { let ph = 0; add(t0, 0.45, (t) => { ph += (2 * Math.PI * (40 + 90 * Math.exp(-t * 28))) / rate; return g * Math.sin(ph) * Math.exp(-t * 8); }); };
  const tink = (t0, f, g = 0.18, pan = 0) => add(t0, 1.2, (t) => g * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * t)) * Math.exp(-t * 5), pan);
  const crack = (t0, g, len) => { let hp = 0, prev = 0; add(t0, len, (t) => { const x = noise(); hp = 0.9 * (hp + x - prev); prev = x; const pops = Math.random() < 0.004 * Math.exp(-t * 6) ? 1 : 0; return g * Math.exp(-t * (8 / len)) * (hp * 0.6 + pops * 2 * noise()); }, (noise() * 0.5)); };
  // drone in, then dropping away with the filament
  add(0, dur, (t) => { const env = Math.min(1, t / 1.5) * (t < out ? 1 : Math.max(0.35, 1 - (t - out) * 1.5)) * Math.min(1, (dur - t) / 0.5); const s = (f) => ((t * f) % 1) * 2 - 1; return 0.05 * env * (s(55) + s(55.3) + 0.6 * Math.sin(2 * Math.PI * 110 * t)) * (0.75 + 0.25 * Math.sin(t * 1.9)); });
  // the bulb draws: three rising tinks, a warm hum as it lights
  tink(0.15, 1318, 0.12, -0.3); tink(0.7, 1760, 0.1, 0.3); tink(1.25, 2637, 0.08, 0);
  add(1.0, out - 1.0, (t) => 0.025 * Math.min(1, t / 0.6) * Math.sin(2 * Math.PI * 120 * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 240 * t)));
  // the copy
  tink(l1, 880, 0.08); thud(l2, 0.6); thud(l3, 0.7);
  HITS.forEach((h, i) => { thud(h - 0.12, 0.8 + i * 0.1); crack(h, 0.35 + i * 0.15, i === 2 ? 1.2 : 0.5); tink(h, 2400 + i * 400, 0.1, i - 1); });
  // the filament dies: buzz, click, gone
  add(out, 0.35, (t) => 0.08 * (((t * 120) % 1) * 2 - 1) * (Math.sin(t * 90) > 0.2 ? 1 : 0.1));
  add(out + 0.36, 0.05, (t) => 0.4 * noise() * Math.exp(-t * 120));
  tink(l7, 660, 0.06); tink(l8, 440, 0.07);
  add(l8 + 0.3, 3, (t) => 0.1 * (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.5 * t)) * Math.exp(-t * 0.9));
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767), 46 + i * 4); }
  return buf;
}
