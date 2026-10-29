// The Test 01 temp sound, synthesised from the shot data so it can never drift from the picture.
// Rain follows world speed: it thins as time brakes and is gone in the freeze, where the only sound left is the bell's
// hum and the chain she is listening to. The strike rings with a real bell's inharmonic partials. Returns a 16-bit stereo WAV.
import { DURATION, speedAt, editAt, EV, STEP_TIMES, BEATS } from './shots.mjs';

export function synth(rate = 44100) {
  const dur = DURATION, n = Math.round(dur * rate), L = new Float32Array(n), R = new Float32Array(n);
  let seed = 11; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const add = (t0, len, fn, pan = 0) => {
    const a = Math.round(t0 * rate), b = Math.min(n, a + Math.round(len * rate));
    for (let i = Math.max(0, a); i < b; i++) { const v = fn((i - a) / rate); L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
  };
  const beat = (name) => BEATS.find(([b]) => b === name)[1];
  const splash = (t0, g, pan = 0) => { let lp = 0, hp = 0; add(t0, 0.6, (t) => { const x = noise(); lp += (x - lp) * 0.35; hp = lp - hp * 0.0; return g * (x * 0.35 + lp) * Math.exp(-t * 9) * (1 - Math.exp(-t * 400)); }, pan); };
  const thump = (t0, g, f = 48) => { let ph = 0; add(t0, 0.7, (t) => { ph += (2 * Math.PI * (f + 70 * Math.exp(-t * 25))) / rate; return g * Math.sin(ph) * Math.exp(-t * 6); }); };
  const ping = (t0, f, g, pan) => add(t0, 0.25, (t) => g * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 28), pan);
  const whoosh = (t0, len, g, pan = 0) => { let lp = 0; add(t0, len, (t) => { const k = t / len; lp += (noise() - lp) * (0.03 + 0.25 * Math.sin(Math.PI * k)); return g * Math.sin(Math.PI * k) ** 2 * lp; }, pan); };
  // a bell: hum, prime, tierce, quint, nominal, superquint, octave nominal, each with its own decay
  const bellStrike = (t0, f, g, len, pan = 0) => {
    const parts = [[0.5, 1, 0.55], [1, 0.8, 0.9], [1.2, 0.7, 1.4], [1.5, 0.45, 1.8], [2, 0.6, 1.6], [2.5, 0.3, 2.6], [3.0, 0.25, 3.4], [4.1, 0.15, 5]];
    add(t0, len, (t) => parts.reduce((s, [r, a, d]) => s + a * Math.sin(2 * Math.PI * f * r * t + r) * Math.exp((-t * d * 3.2) / len), 0) * g * (1 - Math.exp(-t * 900)), pan);
  };

  // rain and room: rain level follows world speed, so the freeze is silence
  { let a = 0, b = 0, c = 0, d = 0;
    for (let i = 0; i < n; i++) {
      const t = i / rate, s = speedAt(t), wet = Math.min(1, s / 0.35) ** 1.5, outside = t > 17.3 ? 1.25 : 1;
      a += (noise() - a) * 0.55; b += (a - b) * 0.08; const rain = (a - b) * 0.13 * wet * outside;
      c += (noise() - c) * 0.012; const room = c * 0.5 * (0.3 + 0.7 * wet);
      d += (noise() - d) * 0.35; const pat = (noise() + 1) / 2 < 0.0009 * wet ? 1 : 0; // a drop hits something near
      L[i] += rain + room + pat * d * 0.4; R[i] += rain * 0.92 + room + pat * d * 0.3;
    }
  }
  // the charge
  STEP_TIMES.forEach((w, k) => splash(editAt(w), 0.35, k % 2 ? 0.25 : -0.25));
  splash(beat('Takeoff'), 0.55); thump(beat('Takeoff'), 0.25, 60);
  whoosh(1.2, 1.3, 0.12, -0.3);
  // MOVE 01: brake to silence, then the hum she hears, and the chain
  whoosh(2.35, 0.9, 0.22, 0);
  add(2.9, 4.3, (t) => { const env = Math.min(1, t / 1.4) * Math.min(1, (4.3 - t) / 0.4); return env * 0.11 * (Math.sin(2 * Math.PI * 98 * t) + 0.35 * Math.sin(2 * Math.PI * 196.4 * t) + 0.18 * Math.sin(2 * Math.PI * 235 * t)) * (0.75 + 0.25 * Math.sin(t * 2.2)); });
  for (const [t, f, p] of [[3.7, 3100, 0.6], [4.5, 2700, 0.55], [5.15, 3350, 0.65], [5.7, 2900, 0.6], [6.3, 3600, 0.62]]) ping(t, f, 0.06, p);
  // the snap: a crack, the rain slams back, the bell rips past
  { let lp = 0; add(6.95, 0.12, (t) => { lp += (noise() - lp) * 0.7; return 0.5 * lp * Math.exp(-t * 30); }); }
  thump(7.0, 0.45, 40); whoosh(7.0, 0.75, 0.38, 0.5);
  // MOVE 03: the bell's mass going by at 2%: a slow sub swell and two heartbeats
  add(7.6, 6.8, (t) => { const k = Math.exp(-(((t + 7.6 - beat('Near miss')) / 1.9) ** 2)); return 0.22 * k * (Math.sin(2 * Math.PI * 41 * t) + 0.5 * Math.sin(2 * Math.PI * 61.5 * t)); });
  whoosh(8.4, 5.2, 0.14, -0.4);
  thump(beat('Near miss') - 0.55, 0.42, 38); thump(beat('Near miss') + 0.25, 0.32, 38);
  // back to speed, landing, the wind-up
  whoosh(13.9, 0.8, 0.25, 0.2);
  splash(beat('Land'), 0.8); thump(beat('Land'), 0.5, 55);
  whoosh(14.9, 0.45, 0.32, -0.2);
  // MOVE 04: contact. A struck bell, a sub boom, and the same strike stretched out under the 4% hold
  const hit = beat('Contact');
  { let lp = 0; add(hit, 0.18, (t) => { lp += (noise() - lp) * 0.6; return 0.9 * lp * Math.exp(-t * 22); }); }
  thump(hit, 1.0, 34);
  bellStrike(hit, 220, 0.22, 9.5, 0.05);
  bellStrike(hit + 0.02, 55, 0.2, 7, -0.05);
  // the louvers go, then the open air
  for (let k = 0; k < 9; k++) splash(beat('Louvers go') + k * 0.045, 0.22, (k % 3) / 2 - 0.5);
  whoosh(17.0, 2.4, 0.3, 0);
  // the city answers: other towers' bells, far off
  for (const [t, f, p] of [[19.6, 311, -0.7], [20.5, 262, 0.6], [21.3, 349, -0.3]]) bellStrike(t, f, 0.05, 4, p);
  // the bell meets the flood, far below
  { const t0 = beat('Bell hits the flood'); thump(t0, 0.55, 30); let lp = 0; add(t0, 2.5, (t) => { lp += (noise() - lp) * 0.02; return 0.5 * lp * Math.exp(-t * 1.5); }); }
  // the title: the hum returns and stops dead on the last frame
  add(22.9, 2.1, (t) => Math.min(1, t / 0.8) * 0.09 * (Math.sin(2 * Math.PI * 98 * t) + 0.4 * Math.sin(2 * Math.PI * 147 * t)));

  const fadeTail = Math.round(0.03 * rate);
  for (let i = n - fadeTail; i < n; i++) { const k = (n - i) / fadeTail; L[i] *= k; R[i] *= k; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / peak, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 32767), 46 + i * 4); }
  return buf;
}
