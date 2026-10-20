// The score, synthesised from the same plan the picture uses, so every sound lands on its frame.
// Each morph has a gesture, each held shape has a bed, copy can ring a bell per word:
//   converge  closing whoosh, rising sub, a soft ignition on landing
//   bloom     reverse swell, sub impact, shimmer chord thrown wide
//   stretch   strained upward glide, a collapsing whoosh, impact on landing
//   scatter   pre-riser, wide burst and crackle, reverse swell, deep hit on reconnect
//   beds      core → hum · sphere/band → pulse on the beat · torus → driving 16ths · last step → long resolve chord
// Returns a 16-bit stereo WAV buffer.
import { plan as makePlan } from './timeline.js';

const NOTES = { C: -2, 'C#': -1, D: 0, 'D#': 1, E: 2, F: 3, 'F#': 4, G: 5, 'G#': 6, A: 7, 'A#': 8, B: 9 };
const BED = { core: 'hum', sphere: 'pulse', band: 'pulse', torus: 'drive', dust: 'none' };

export function score(cfg, rate = 48000) {
  const P = makePlan(cfg), A = cfg.audio, dur = cfg.duration;
  const n = Math.round(dur * rate);
  const L = new Float32Array(n), R = new Float32Array(n), SL = new Float32Array(n), SR = new Float32Array(n);
  let seed = 41; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const TAU = Math.PI * 2;
  const add = (t0, len, fn, { pan = 0, send = 0.25 } = {}) => {
    const a = Math.round(t0 * rate), b = Math.min(n, a + Math.round(len * rate));
    for (let i = Math.max(0, a); i < b; i++) {
      const t = (i - a) / rate, v = fn(t, t / len), p = typeof pan === 'function' ? pan(t) : pan;
      const l = v * Math.min(1, 1 - p), r = v * Math.min(1, 1 + p);
      L[i] += l; R[i] += r; SL[i] += l * send; SR[i] += r * send;
    }
  };
  const ROOT = 73.42 * 2 ** ((NOTES[A.key] ?? 0) / 12), note = (semi) => ROOT * 2 ** (semi / 12);
  const beat = 60 / cfg.rhythm.bpm, origin = P.time(cfg.rhythm.origin);

  // ---------- instruments
  const impact = (t0, g = 1, low = 38) => {
    let ph = 0;
    add(t0, 1.4, (t) => { ph += (TAU * (low + 130 * Math.exp(-t * 26))) / rate; return g * Math.sin(ph) * Math.exp(-t * 3.2); }, { send: 0.1 });
    let lp = 0;
    add(t0, 0.5, (t) => { lp += (noise() - lp) * 0.25 * Math.exp(-t * 6); return g * 0.5 * lp * Math.exp(-t * 9); }, { send: 0.6 });
  };
  const bell = (t0, f, g = 0.12, pan = 0) =>
    add(t0, 2.2, (t) => g * (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t) * Math.exp(-t * 4) + 0.15 * Math.sin(TAU * f * 3.02 * t) * Math.exp(-t * 8)) * Math.exp(-t * 2.4) * Math.min(1, t * 400), { pan, send: 0.7 });
  const tick = (t0, f, g, pan) => add(t0, 0.06, (t) => g * Math.sin(TAU * f * t) * Math.exp(-t * 90) + g * 0.4 * noise() * Math.exp(-t * 160), { pan, send: 0.15 });
  const kick = (t0, g = 0.5) => { let ph = 0; add(t0, 0.35, (t) => { ph += (TAU * (46 + 90 * Math.exp(-t * 40))) / rate; return g * Math.sin(ph) * Math.exp(-t * 9); }, { send: 0.05 }); };
  const pluck = (t0, f, g, pan) => {
    let lp = 0;
    add(t0, 0.5, (t) => { const saw = ((t * f) % 1) * 2 - 1; lp += (saw - lp) * (0.04 + 0.5 * Math.exp(-t * 20)); return g * lp * Math.exp(-t * 7); }, { pan, send: 0.35 });
  };
  const whoosh = (t0, len, g, bright, env, pan) => {
    let lp = 0, lp2 = 0;
    add(t0, len, (t, k) => { lp += (noise() - lp) * bright(k); lp2 += (lp - lp2) * bright(k); return g * env(k) * lp2 * 3; }, { pan, send: 0.45 });
  };
  const pad = (t0, len, freqs, g, att, rel) =>
    add(t0, len, (t) => {
      const env = Math.min(1, t / att) * Math.min(1, Math.max(0, (len - t) / rel));
      let v = 0; for (const f of freqs) v += Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t + 1) + 0.18 * Math.sin(TAU * f * 2 * t);
      return (g * env * v) / freqs.length;
    }, { send: 0.55 });
  const glide = (t0, len, f, g, send = 0.5) => { let ph = 0; add(t0, len, (t, k) => { ph += (TAU * f(k)) / rate; return g(k) * Math.sin(ph); }, { send }); };

  // ---------- morph gestures
  const GESTURE = {
    converge(s) {
      whoosh(s.at, s.dur + 0.05, 0.5, (k) => 0.01 + 0.25 * k * k, (k) => Math.sin(Math.PI * Math.min(1, k * 0.55 + 0.02)) ** 2 * (k < 0.97 ? 1 : 0), (t) => Math.sin(t * 9) * (1 - t / s.dur));
      glide(s.at, s.dur, (k) => 28 + 30 * k * k, (k) => 0.35 * k * k, 0);
      impact(s.land, 0.45, 55);
    },
    bloom(s) {
      whoosh(s.at - 0.45, 0.45, 0.45, (k) => 0.02 + 0.5 * k ** 3, (k) => k ** 3, 0);
      impact(s.at, 1.1);
      for (const [x, p] of [[24, -0.5], [28, 0.4], [31, -0.2], [38, 0.6], [43, -0.6]]) bell(s.at + 0.02, note(x), 0.055, p);
    },
    stretch(s) {
      let ph = 0;
      add(s.at, s.dur, (t, k) => {
        ph += (TAU * note(12 + 12 * Math.min(1, k * 1.25) ** 2)) / rate;
        return 0.11 * (Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph)) * Math.sin(Math.PI * Math.min(1, k * 1.1)) ** 0.7;
      }, { send: 0.4, pan: (t) => Math.sin(t * 3) * 0.3 });
      whoosh(s.land - 0.6, 0.62, 0.55, (k) => 0.4 * (1 - k) ** 2 + 0.01, (k) => Math.sin(Math.PI * k) ** 1.5, (t) => 0.4 - t);
      impact(s.land, 0.9);
    },
    scatter(s) {
      whoosh(s.at - 0.35, 0.36, 0.4, (k) => 0.05 + 0.6 * k * k, (k) => k ** 2, 0);
      impact(s.at, 0.75, 44);
      whoosh(s.at, 0.9, 0.6, (k) => 0.55 * (1 - k) + 0.02, (k) => (1 - k) ** 2, (t) => Math.sin(t * 15) * 0.8);
      for (let j = 0; j < 260; j++) { const u = (j * 0.618034) % 1; tick(s.at + 0.9 * u ** 1.7, 2500 + 9000 * ((j * 0.414) % 1), 0.09 * (1 - u) + 0.01, ((j * 0.732) % 1) * 2 - 1); }
      whoosh(s.land - 0.7, 0.7, 0.4, (k) => 0.01 + 0.3 * k ** 2, (k) => k ** 2.5, 0);
      glide(s.land - 0.7, 0.7, (k) => note(19) * (0.5 + 0.5 * k), (k) => 0.06 * k * k);
      impact(s.land, 1, 34);
    },
  };
  // ---------- beds under each held shape, from the step's start (or landing) to the next step
  const BEDS = {
    none() {},
    hum(s) {
      add(s.land, s.end - s.land, (t) => 0.05 * Math.min(1, t * 3) * (Math.sin(TAU * note(36) * t) + 0.6 * Math.sin(TAU * note(43) * t)) * (0.7 + 0.3 * Math.sin(t * 7.5)), { send: 0.6 });
      pad(s.land, s.end - s.land + 0.3, [note(0), note(7)], 0.08, 0.4, 0.3);
    },
    pulse(s) {
      for (let t = origin + Math.floor((s.at - origin) / beat + 1 + 1e-6) * beat; t < s.end - 0.01; t += beat) {
        kick(t, 0.7); pluck(t, note(12), 0.16, 0); pluck(t + beat / 2, note(19), 0.07, 0.3);
        tick(t + beat / 2, 5200, 0.1, Math.sin(t * 2) * 0.6);
        tick(t + beat / 4, 7400, 0.025, -0.5); tick(t + (3 * beat) / 4, 7400, 0.025, 0.5);
      }
      pad(s.at + 0.2, s.end - s.at, [note(0), note(7), note(16)], 0.06, 0.8, 0.4);
    },
    drive(s) {
      const arp = [0, 7, 12, 14, 19, 24, 26, 31];
      for (let j = 0, t = s.land; t < s.end - 0.05; j++, t += beat / 4) {
        const k = (t - s.land) / (s.end - s.land), circle = Math.sin(Math.PI * 2 * 1.1 * (t - s.land)) * 0.75;
        tick(t, 6000 + 2000 * k, 0.08 + (j % 2 ? 0 : 0.05), circle);
        if (j % 4 === 0) kick(t, 0.65);
        if (j % 2 === 0) pluck(t, note(12 + arp[(j / 2 + Math.floor(k * 4)) % arp.length]), 0.12 + 0.08 * k, -circle);
      }
      add(s.land, s.end - s.land, (t) => 0.12 * Math.min(1, t * 4) * Math.sin(TAU * ROOT * t) * (0.8 + 0.2 * Math.sin(TAU * 4 * t)), { send: 0.05 });
    },
    resolve(s) {
      pad(s.land, dur - s.land, [note(0), note(7), note(16), note(21), note(26)], 0.17, 0.15, 0.9);
      add(s.land, dur - s.land, (t) => 0.14 * Math.sin(TAU * note(-12) * t) * Math.exp(-t * 0.6), { send: 0 });
    },
  };

  for (const s of P.steps) {
    GESTURE[s.morph](s);
    BEDS[s.bed ?? (s.last ? 'resolve' : BED[s.to] ?? 'none')](s);
  }
  // a bell on each word of any line that asks for one, and two under the end title
  const BELLS = [36, 31, 38, 33];
  for (const c of cfg.copy ?? []) if (c.bell) c.text.split(' ').forEach((_, j) => bell(P.time(c.in) + 0.05 + 0.25 * j, note(BELLS[j % 4]), 0.12 - 0.02 * (j % 2), j % 2 ? 0.15 : -0.15));
  if (cfg.end?.title) { bell(P.time(cfg.end.in) + 0.05, note(38), 0.1, 0); if (cfg.end.tag) bell(P.time(cfg.end.tagIn ?? cfg.end.in) + 0.02, note(31), 0.06, 0.2); }

  // ---------- reverb (four damped combs into two allpasses per side), master, soft clip
  const reverb = (inp, off) => {
    const out = new Float32Array(n), s = rate / 44100;
    for (const d0 of [1557, 1617, 1491, 1422]) {
      const d = Math.round((d0 + off) * s), buf = new Float32Array(d); let j = 0, lp = 0;
      for (let i = 0; i < n; i++) { const y = buf[j]; lp = y * 0.6 + lp * 0.4; buf[j] = inp[i] + lp * 0.84; out[i] += y * 0.25; j = (j + 1) % d; }
    }
    for (const d0 of [556, 225]) {
      const d = Math.round((d0 + off) * s), buf = new Float32Array(d); let j = 0;
      for (let i = 0; i < n; i++) { const b = buf[j], y = -out[i] + b; buf[j] = out[i] + b * 0.5; out[i] = y; j = (j + 1) % d; }
    }
    return out;
  };
  const RL = reverb(SL, 0), RR = reverb(SR, 23);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, (n - i) / (0.25 * rate), i / (0.01 * rate));
    L[i] = (L[i] + RL[i] * A.reverb) * fade; R[i] = (R[i] + RR[i] * A.reverb) * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = A.enabled === false ? 0 : A.loudness / (peak || 1), buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(Math.tanh(L[i] * g) * 0.8 * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.tanh(R[i] * g) * 0.8 * 32767), 46 + i * 4); }
  return buf;
}
