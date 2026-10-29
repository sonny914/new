// The recap's score, synthesised so it is deterministic and costs nothing: a low drone, one chord per story
// stage, a soft thump on each scene change and a riser into it. Under narration the bed ducks by about 9 dB.
// Returns a 16-bit stereo WAV buffer.
const CHORDS = { // root-position voicings in Hz, low to high
  intro: [110, 164.81, 220, 261.63], goal: [110, 164.81, 220, 261.63], process: [87.31, 130.81, 174.61, 220],
  obstacle: [73.42, 110, 146.83, 174.61], correction: [98, 146.83, 196, 246.94], result: [130.81, 196, 261.63, 329.63],
  lesson: [110, 164.81, 220, 329.63], outro: [110, 164.81, 220, 261.63],
};

export function score(scenes, duration, { speech = [], rate = 44100 } = {}) {
  const n = Math.ceil(duration * rate), L = new Float32Array(n), R = new Float32Array(n);
  let seed = 11; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (t0, len, fn, pan = 0) => {
    const a = Math.max(0, Math.round(t0 * rate)), b = Math.min(n, Math.round((t0 + len) * rate));
    for (let i = a; i < b; i++) { const v = fn((i - Math.round(t0 * rate)) / rate); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
  };
  // drone on A, breathing slowly
  add(0, duration, (t) => { const env = Math.min(1, t / 2) * Math.min(1, (duration - t) / 1.2); return 0.05 * env * (Math.sin(2 * Math.PI * 55 * t) + 0.5 * Math.sin(2 * Math.PI * 82.41 * t + 1)) * (0.75 + 0.25 * Math.sin(t * 0.9)); });
  // a pad per scene, crossfading through the transitions
  for (const s of scenes) {
    const ch = CHORDS[s.stage ?? s.template] ?? CHORDS.intro, len = s.duration + 0.6;
    ch.forEach((f, k) => add(s.start, len, (t) => {
      const env = Math.min(1, t / 1.1) * Math.min(1, (len - t) / 0.9);
      const tri = (ph) => 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1;
      return 0.022 * env * (tri(f * t) * 0.6 + Math.sin(2 * Math.PI * f * 1.003 * t) * 0.4) * (k ? 0.8 : 1);
    }, (k % 2 ? 0.25 : -0.25)));
  }
  // transitions: a riser into each cut, a thump and a tick on it
  scenes.forEach((s, i) => {
    if (i) { let lp = 0; add(s.start - 0.55, 0.55, (t) => { const k = t / 0.55; lp += (noise() - lp) * (0.02 + 0.25 * k); return 0.12 * k * k * lp; }); }
    let ph = 0; add(s.start + (i ? 0 : 0.2), 0.6, (t) => { ph += (2 * Math.PI * (44 + 90 * Math.exp(-t * 28))) / rate; return 0.5 * Math.sin(ph) * Math.exp(-t * 7); });
    add(s.start + 0.02, 0.15, (t) => 0.06 * Math.sin(2 * Math.PI * 1760 * t) * Math.exp(-t * 45), i % 2 ? 0.5 : -0.5);
  });
  // the end card blooms, then everything decays
  const last = scenes[scenes.length - 1];
  if (last) add(last.start + 0.3, Math.max(1, duration - last.start - 0.3), (t) => 0.06 * (Math.sin(2 * Math.PI * 110 * t) + 0.6 * Math.sin(2 * Math.PI * 164.81 * t) + 0.4 * Math.sin(2 * Math.PI * 220 * t)) * Math.exp(-t * 0.9));

  // duck under speech, with 0.15 s attack and 0.4 s release
  if (speech.length) {
    const g = new Float32Array(n).fill(1);
    for (const { start, end } of speech) for (let i = Math.max(0, Math.round((start - 0.15) * rate)); i < Math.min(n, Math.round((end + 0.4) * rate)); i++) {
      const t = i / rate, k = t < start ? (start - t) / 0.15 : t > end ? (t - end) / 0.4 : 0;
      g[i] = Math.min(g[i], 0.35 + 0.65 * Math.min(1, k));
    }
    for (let i = 0; i < n; i++) { L[i] *= g[i]; R[i] *= g[i]; }
  }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = 0.5 / (peak || 1), buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * gain) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * gain) * 32767), 46 + i * 4); }
  return buf;
}
