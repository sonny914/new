"""The Quiet Bands sonic logo: one struck dyad, A4 + E5 (a perfect fifth), with a felt tap on the hit,
a little body underneath and a short room tail. It is the "ding" from the end of the AI gold rush reel,
kept to the same notes, balance and decay, then given width and space.

make_sting() returns float32 stereo at `sr`, hit at sample 0, peak −3 dBFS.
Run directly to write qb-sting.wav (48 kHz / 24-bit), .m4a and .mp3 into ./export.
"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np

A4, E5 = 440.0, 659.26          # the dyad: root and fifth
DUR = 1.7                       # seconds, tail included


def _bell(t, f):
    # struck-bell partials: fundamental, 2.76× and 5.40× (inharmonic, like a small hand bell)
    p1 = np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.002) * np.exp(-5.2 * t)
    p2 = np.sin(2 * np.pi * 2.76 * f * t) * np.minimum(1, t / 0.0015) * np.exp(-9.0 * t)
    p3 = np.sin(2 * np.pi * 5.40 * f * t) * np.minimum(1, t / 0.001) * np.exp(-16.0 * t)
    return p1 + 0.35 * p2 + 0.10 * p3


def _bandnoise(n, lo, hi, sr, seed):
    spec = np.fft.rfft(np.random.default_rng(seed).standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / sr)
    spec[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(spec, n)
    return y / (np.abs(y).max() + 1e-9)


def _room(x, sr, seed):
    # short synthetic room: decaying, darkened noise impulse, convolved by FFT
    n = int(1.2 * sr); t = np.arange(n) / sr
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-t / 0.33)
    spec = np.fft.rfft(ir); f = np.fft.rfftfreq(n, 1 / sr)
    spec *= 1 / (1 + (f / 4500) ** 2)                      # gentle high cut
    ir = np.fft.irfft(spec, n); ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n - 1; size = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]


def make_sting(sr=48000):
    n = int(DUR * sr); t = np.arange(n) / sr
    left = _bell(t, A4 - 0.4) + 0.6 * _bell(t, E5 + 0.3)  # a hair of detune either side = width
    right = _bell(t, A4 + 0.4) + 0.6 * _bell(t, E5 - 0.3)
    tap = _bandnoise(n, 2000, 7000, sr, 1) * np.minimum(1, t / 0.0005) * np.exp(-t / 0.008) * 0.25
    body = np.sin(2 * np.pi * 110 * t) * np.exp(-14 * t) * 0.18   # A2 under the hit: the "pop"
    out = []
    for ch, seed in ((left, 11), (right, 12)):
        dry = ch + tap + body
        out.append(dry + 0.16 * _room(dry, sr, seed))
    st = np.stack(out, 1)
    st[-int(0.05 * sr):] *= np.linspace(1, 0, int(0.05 * sr))[:, None]
    return (st / np.abs(st).max() * 10 ** (-3 / 20)).astype(np.float32)


def write_wav24(path, st, sr=48000):
    pcm = np.clip(st, -1, 1) * (2 ** 23 - 1)
    data = pcm.astype('<i4').view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(sr); w.writeframes(data)


if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / 'export')
    out.mkdir(parents=True, exist_ok=True)
    write_wav24(out / 'qb-sting.wav', make_sting())
    for ext, args in (('m4a', ['-c:a', 'aac', '-b:a', '256k']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '256k'])):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'qb-sting.wav'), *args, str(out / f'qb-sting.{ext}')], check=True)
    print('sting audio →', out)
