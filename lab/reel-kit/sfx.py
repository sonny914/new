"""Quiet Bands reel kit, audio: the synthesized sound palette (rights-clear), the music bed, the
conservative voice clean-up and the mix. A reel's build-audio.py is just its cue sheet:

    from sfx import *
    r = Reel(rec, out, offset=0.1, length=25.2)
    r.at(2.04, slash(), 0.5)               # times are recording seconds (the words.json clock)
    r.sting(23.6)                          # the Quiet Bands sting, on its hit
    r.bed(gains=[...]); r.finish()

finish() writes voice.wav, music.wav, sfx.wav, mix.wav and mix_nomusic.wav (48 kHz stereo, −14 LUFS / −2 dBTP before encoding: AAC adds up to ~0.7 dB, so the delivered file stays under −1).
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 48000
_rng = np.random.default_rng(7)


def env(n, a=0.005, d=0.2, curve=4.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-curve * t / max(d, 1e-4))


def lowpass(x, fc):
    # one-pole low-pass, done in the frequency domain (fast, close enough for a bed)
    n = len(x); f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(np.fft.rfft(x) / np.sqrt(1 + (f / fc) ** 2), n)


def bandnoise(n, lo, hi):
    spec = np.fft.rfft(_rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(spec, n)
    return y / (np.abs(y).max() + 1e-9)


# ------------------------------------------------------------------------------------- palette --
def impact(dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(62 * np.exp(-t * 3) + 38) / SR) * env(n, 0.002, 0.35, 3)
    return 0.9 * boom + 0.35 * bandnoise(n, 900, 6000) * env(n, 0.001, 0.03, 6)

def tick(f=2400, dur=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.02, 6)

def flick():
    n = int(0.09 * SR); return bandnoise(n, 1800, 7000) * env(n, 0.002, 0.04, 5)

def pop(f0=520, f1=880):
    n = int(0.09 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / t[-1]) / SR) * env(n, 0.002, 0.05, 4)

def whoosh(dur=0.45, up=True):
    n = int(dur * SR); t = np.linspace(0, 1, n); x = bandnoise(n, 300, 9000)
    return (lowpass(x, 1500) * (1 - t if up else t) + x * (t if up else 1 - t) * 0.5) * np.sin(np.pi * t) ** 2

def key():
    n = int(0.03 * SR); return bandnoise(n, 2500, 8000) * env(n, 0.0005, 0.012, 6)

def bell(f, dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t)) * env(n, 0.002, 0.5, 3)

def riser(dur):
    n = int(dur * SR); t = np.linspace(0, 1, n); return bandnoise(n, 500, 10000) * t ** 2.5

def slash(dur=0.32):
    # a blade-fast airy sweep into a dry hit: for a line cutting through type
    n = int(dur * SR); t = np.linspace(0, 1, n)
    sweep = bandnoise(n, 2500, 11000) * np.minimum(1, t / 0.35) ** 2 * np.exp(-np.maximum(0, t - 0.35) * 14)
    hit = np.zeros(n); h = impact(dur * 0.9)[: n - int(0.1 * SR)]; hit[int(0.1 * SR):] = h
    return 0.55 * sweep + 0.8 * hit

def stamp():
    n = int(0.25 * SR); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * np.cumsum(140 * np.exp(-t * 18) + 70) / SR) * env(n, 0.001, 0.1, 4)
    return 0.9 * thud + 0.4 * bandnoise(n, 600, 4000) * env(n, 0.001, 0.02, 6)

def dust(dur=1.1):
    # glittering, thinning grains drifting upward in pitch: for something dissolving
    n = int(dur * SR); t = np.linspace(0, 1, n); out = np.zeros(n)
    for _ in range(140):
        i = int(_rng.uniform(0, 0.85) * n); g = int(0.012 * SR)
        f = 3000 + 6000 * (i / n) + _rng.uniform(-600, 600)
        grain = np.sin(2 * np.pi * f * np.arange(g) / SR) * np.hanning(g)
        out[i:i + g] += grain[: n - i] * (1 - i / n) * _rng.uniform(0.3, 1)
    return out / (np.abs(out).max() + 1e-9) * 0.7 + bandnoise(n, 4000, 12000) * (1 - t) ** 2 * np.sin(np.pi * t) * 0.25


# ----------------------------------------------------------------------------------------- reel --
class Reel:
    def __init__(self, rec, out, offset, length):
        self.rec, self.out, self.offset, self.length = rec, Path(out), offset, length
        self.out.mkdir(parents=True, exist_ok=True)
        self.N = int(length * SR); self.sfx = np.zeros(self.N); self.music = np.zeros(self.N)

    def _place(self, buf, t, x, gain):
        i = int((t - self.offset) * SR)
        if i < 0: x, i = x[-i:], 0
        if i >= len(buf): return
        j = min(len(buf), i + len(x)); buf[i:j] += gain * x[: j - i]

    def at(self, t, x, gain=1.0):
        self._place(self.sfx, t, x, gain)

    def sting(self, hit, gain=0.43):
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'qb-sting'))
        from sting_audio import make_sting
        s = make_sting(SR).mean(axis=1); self.at(hit, s / np.abs(s).max(), gain)

    def bed(self, gains, bpm=96, arp=()):
        """Original bed: Am9 · Fmaj7 · Cmaj7 · G6 pads, kick and offbeat hat. gains = [(t, g), ...]
        breakpoints in recording seconds (linear between them); arp = [(t, f), ...] bell notes."""
        beat = 60 / bpm; bar = 4 * beat
        chords = [[110, 164.8, 196, 246.9, 261.6], [87.3, 130.8, 174.6, 220, 261.6],
                  [65.4, 130.8, 164.8, 196, 246.9], [98, 146.8, 196, 246.9, 329.6]]
        for k in range(int(self.length / (2 * bar)) + 1):
            n = int(2 * bar * SR); tt = np.arange(n) / SR
            tone = sum(np.sin(2 * np.pi * f * tt + d) + 0.4 * np.sin(2 * np.pi * f * 2.003 * tt) for f, d in zip(chords[k % 4], range(5)))
            tone *= np.minimum(1, tt / 0.6) * np.minimum(1, (2 * bar - tt) / 0.5) / 5
            self._place(self.music, k * 2 * bar + self.offset, tone, 0.5)
        kn = int(0.4 * SR); kt = np.arange(kn) / SR
        kick = np.sin(2 * np.pi * np.cumsum(50 + 60 * np.exp(-kt * 25)) / SR) * env(kn, 0.001, 0.25, 4)
        hat = bandnoise(int(0.05 * SR), 6000, 12000) * env(int(0.05 * SR), 0.0005, 0.02, 6)
        b = 0.0
        while b < self.length:
            self._place(self.music, b + self.offset, kick, 0.55); self._place(self.music, b + beat / 2 + self.offset, hat, 0.08); b += beat
        for t, f in arp: self._place(self.music, t, bell(f, 0.35), 0.14)
        ts = np.arange(self.N) / SR + self.offset
        g = np.interp(ts, [p[0] for p in gains], [p[1] for p in gains])
        m = lowpass(self.music * g, 5200); self.music = m / (np.abs(m).max() + 1e-9)

    def finish(self, voice_fade_at):
        o, L = self.out, self.length
        wav(o / 'music.wav', self.music * 0.5)
        wav(o / 'sfx.wav', self.sfx / (np.abs(self.sfx).max() + 1e-9) * 0.9)
        vf = ('highpass=f=75,lowpass=f=15000,afftdn=nr=6:nf=-32,deesser=i=0.3,'
              'acompressor=threshold=-21dB:ratio=2.4:attack=8:release=160:makeup=2,'
              f'loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st={voice_fade_at - self.offset:.3f}:d=0.12')
        ff('-ss', str(self.offset), '-t', str(L), '-i', self.rec, '-vn', '-af', vf, '-ar', str(SR), '-ac', '2', o / 'voice.wav')
        pad = f'apad=whole_dur={L},atrim=0:{L}[out]'
        ff('-i', o / 'voice.wav', '-i', o / 'music.wav', '-i', o / 'sfx.wav', '-filter_complex',
           '[1:a]volume=0.32[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=300[md];'
           '[2:a]volume=0.55[s];[0:a][md][s]amix=inputs=3:duration=longest:normalize=0,' + pad, '-map', '[out]', '-ar', str(SR), o / 'premix.wav')
        ff('-i', o / 'voice.wav', '-i', o / 'sfx.wav', '-filter_complex',
           '[1:a]volume=0.55[s];[0:a][s]amix=inputs=2:duration=longest:normalize=0,' + pad, '-map', '[out]', '-ar', str(SR), o / 'premix_nomusic.wav')
        loudnorm(o / 'premix.wav', o / 'mix.wav'); loudnorm(o / 'premix_nomusic.wav', o / 'mix_nomusic.wav')
        print('audio →', o)


def wav(path, x):
    x = np.clip(x, -1, 1); st = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())


def loudnorm(src, dst, I=-14, TP=-2.0, LRA=10):
    # two-pass: measure, then apply linearly, so the result lands on the target (single pass undershoots)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(src), '-af', f'loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, check=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    ff('-i', src, '-af', f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
       f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", '-ar', str(SR), dst)


def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *map(str, args)], check=True)
