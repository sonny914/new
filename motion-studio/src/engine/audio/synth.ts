// Audio controller, procedural half: renders a cue sheet to stereo PCM. Small, deterministic DSP
// (noise bursts, swept sines, simple biquads) so a project can have timed sound design without
// a sample library or a paid service. It is a placeholder layer: real music or voice goes in as
// an audio track with a `src`, and both can play together.
import {rng} from '../../utils/random';

export interface Cue {
  /** Seconds. */
  time: number;
  sound: 'tick' | 'thump' | 'tone' | 'air' | 'riser';
  gain: number;
  pitch: number;
  /** Seconds. */
  duration: number;
  /** riser: hard stop, seconds. */
  until?: number;
  pan: number;
}

export const DEFAULTS: Record<Cue['sound'], {gain: number; pitch: number; duration: number}> = {
  tick: {gain: 0.25, pitch: 4500, duration: 0.03},
  thump: {gain: 0.6, pitch: 60, duration: 0.6},
  tone: {gain: 0.25, pitch: 220, duration: 2},
  air: {gain: 0.25, pitch: 1500, duration: 1.2},
  riser: {gain: 0.3, pitch: 800, duration: 2},
};

class Biquad {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  constructor(
    private kind: 'lowpass' | 'highpass' | 'bandpass',
    private sr: number,
  ) {}
  set(freq: number, q: number) {
    const w = (2 * Math.PI * Math.min(freq, this.sr * 0.45)) / this.sr;
    const alpha = Math.sin(w) / (2 * q);
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    if (this.kind === 'lowpass') {
      this.b0 = (1 - cos) / 2 / a0;
      this.b1 = (1 - cos) / a0;
      this.b2 = this.b0;
    } else if (this.kind === 'highpass') {
      this.b0 = (1 + cos) / 2 / a0;
      this.b1 = -(1 + cos) / a0;
      this.b2 = this.b0;
    } else {
      this.b0 = alpha / a0;
      this.b1 = 0;
      this.b2 = -alpha / a0;
    }
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
    return this;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

export interface Rendered {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  peak: number;
}

export function synthesize(cues: Cue[], seconds: number, sampleRate = 48000, seed = 'sound'): Rendered {
  const n = Math.ceil(seconds * sampleRate);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const noise = rng(seed);
  const white = () => noise() * 2 - 1;
  const add = (i: number, v: number, pan: number) => {
    if (i < 0 || i >= n) return;
    const a = ((pan + 1) * Math.PI) / 4;
    left[i] += v * Math.cos(a);
    right[i] += v * Math.sin(a);
  };
  for (const c of cues) {
    const s0 = Math.round(c.time * sampleRate);
    if (c.sound === 'tick') {
      const bp = new Biquad('bandpass', sampleRate).set(c.pitch, 1.4);
      const len = Math.round(0.045 * sampleRate);
      for (let k = 0; k < len; k++) {
        const t = k / sampleRate;
        const env = (t < 0.0006 ? t / 0.0006 : 1) * Math.exp(-t / 0.006);
        add(s0 + k, bp.run(white() * env) * c.gain * 3.2, c.pan);
      }
    } else if (c.sound === 'thump') {
      const lp = new Biquad('lowpass', sampleRate).set(2400, 0.7);
      const len = Math.round(c.duration * sampleRate);
      let phase = 0;
      for (let k = 0; k < len; k++) {
        const t = k / sampleRate;
        const f = c.pitch + c.pitch * 0.9 * Math.exp(-t / 0.035);
        phase += (2 * Math.PI * f) / sampleRate;
        const env = Math.min(1, t / 0.002) * Math.exp(-t / 0.16);
        const click = t < 0.004 ? lp.run(white()) * (1 - t / 0.004) * 0.25 : 0;
        add(s0 + k, (Math.sin(phase) * env + click) * c.gain, c.pan);
      }
    } else if (c.sound === 'tone') {
      const len = Math.round(c.duration * sampleRate);
      for (let k = 0; k < len; k++) {
        const t = k / sampleRate;
        const env = Math.min(1, t / 0.03) * Math.exp((-t / c.duration) * 4.5);
        const w = 2 * Math.PI * c.pitch * t;
        const v = Math.sin(w) + 0.32 * Math.sin(2 * w + 0.3) + 0.12 * Math.sin(3 * w + 0.7) + 0.05 * Math.sin(4.01 * w);
        add(s0 + k, v * env * c.gain * 0.7, c.pan);
      }
    } else if (c.sound === 'air') {
      const bp = new Biquad('bandpass', sampleRate);
      const len = Math.round(c.duration * sampleRate);
      for (let k = 0; k < len; k++) {
        const u = k / len;
        const env = Math.sin(Math.PI * Math.min(1, u * 1.25)) ** 2 * (u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1);
        bp.set(c.pitch * (0.7 + 0.6 * u), 0.8);
        add(s0 + k, bp.run(white()) * env * c.gain * 1.8, c.pan + (u - 0.5) * 0.8);
      }
    } else if (c.sound === 'riser') {
      const lp = new Biquad('lowpass', sampleRate);
      const end = Math.round((c.until ?? c.time + c.duration) * sampleRate);
      const len = end - s0;
      let phase = 0;
      for (let k = 0; k < len; k++) {
        const u = k / len;
        lp.set(180 + c.pitch * 4 * u * u, 0.9);
        const amp = Math.pow(10, (-38 + 38 * u) / 20);
        const f = c.pitch / 8 + (c.pitch / 8) * 0.25 * u;
        phase += (2 * Math.PI * f) / sampleRate;
        // 3 ms ramp at the cut so the stop is hard but does not click.
        const tail = Math.min(1, (len - k) / (0.003 * sampleRate));
        add(s0 + k, (lp.run(white()) * 0.8 + Math.sin(phase) * 0.35) * amp * c.gain * tail, c.pan);
      }
    }
  }
  // Normalise the bed to -1.5 dBFS sample peak: loud enough to be heard on a phone, with
  // headroom for the AAC encoder's overshoot. Cue gains set the balance, this sets the level.
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const ceiling = 0.8414; // -1.5 dBFS
  if (peak > 0) {
    const k = ceiling / peak;
    for (let i = 0; i < n; i++) {
      left[i] *= k;
      right[i] *= k;
    }
    peak = ceiling;
  }
  return {left, right, sampleRate, peak};
}

export function wav(r: Rendered): Buffer {
  const n = r.left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(r.sampleRate, 24);
  buf.writeUInt32LE(r.sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r.left[i] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r.right[i] * 32767))), 46 + i * 4);
  }
  return buf;
}
