"""Builds the reel's original music bed and sound effects (all synthesized here, so rights-clear),
then mixes them under the cleaned voice. Cue times are source-recording seconds from words.json;
the reel starts OFFSET seconds into the recording.

Usage: python3 build-audio.py <recording.mp4> <out dir>
Writes: voice.wav, music.wav, sfx.wav, mix.wav (48 kHz stereo) in <out dir>.
"""
import subprocess, sys, wave
from pathlib import Path
import numpy as np

SR, OFFSET, LENGTH = 48000, 0.2, 834 / 30          # output: 27.8 s
rec, out = sys.argv[1], Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)
N = int(LENGTH * SR)
T = lambda src: src - OFFSET                         # source time → reel time


def write(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())


def env(n, a=0.005, d=0.2, curve=4.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-curve * t / max(d, 1e-4))


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x):
        s = (1 - a) * v + a * s; y[i] = s
    return y


def bandnoise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(spec, n)
    return y / (np.abs(y).max() + 1e-9)


def place(buf, t, x, gain=1.0):
    i = int(T(t) * SR) if t is not None else 0
    if i < 0: x, i = x[-i:], 0
    if i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += gain * x[: j - i]


# ---------------------------------------------------------------- sound effects (stereo-mono) --
def impact(dur=0.7):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 62 * np.exp(-t * 3) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.35, 3)
    snap = bandnoise(n, 900, 6000) * env(n, 0.001, 0.03, 6)
    return 0.9 * boom + 0.35 * snap

def tick(f=2400, dur=0.05):
    n = int(dur * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.02, 6)

def flick():
    n = int(0.09 * SR); return bandnoise(n, 1800, 7000) * env(n, 0.002, 0.04, 5)

def pop(f0=520, f1=880):
    n = int(0.09 * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / t[-1]
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.05, 4)

def whoosh(dur=0.45, up=True):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = bandnoise(n, 300, 9000)
    shape = np.sin(np.pi * t) ** 2
    bright = onepole_lp(x, 1500) * (1 - t if up else t) + x * (t if up else 1 - t) * 0.5
    return bright * shape

def tapestop(dur=0.32):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 220 * (1 - t / t[-1]) ** 2 + 30
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 * env(n, 0.001, 0.25, 1.5)

def key():
    n = int(0.03 * SR); return bandnoise(n, 2500, 8000) * env(n, 0.0005, 0.012, 6)

def bell(f, dur=0.9):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t)) * env(n, 0.002, 0.5, 3)

def riser(dur):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    return bandnoise(n, 500, 10000) * t ** 2.5

def pen(dur=0.55):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 28 * t)
    return bandnoise(n, 1200, 5000) * trem * np.sin(np.pi * t) ** 0.6


sfx = np.zeros(N)
place(sfx, 1.50, impact(), 0.55)                                             # GET RICH
for i in range(16): place(sfx, 2.1 + i * 0.105, flick(), 0.22)               # tool cards pile in
place(sfx, 3.97, tapestop(), 0.5)                                            # "But" — the interrupt
for s in (4.11, 4.28, 4.42, 4.55, 5.38): place(sfx, s, tick(1900), 0.18)     # label types
place(sfx, 5.42, impact(0.8), 0.7)                                           # WRONG
place(sfx, 5.78, tick(1400, 0.08), 0.35)                                     # THING?
place(sfx, 6.42, whoosh(0.3, False), 0.25)                                   # back to the face
for i, s in enumerate((6.44, 6.63, 6.96, 7.3, 7.63, 8.02, 8.4)): place(sfx, s, pop(500 + 40 * i, 820 + 40 * i), 0.22)
place(sfx, 8.66, whoosh(0.45), 0.32)                                         # windows clear
for i in range(30): place(sfx, 10.38 + i * 0.032, key(), 0.16)               # coach types
place(sfx, 11.44, tick(1200, 0.06), 0.4)                                     # send
place(sfx, 12.62, bell(1318, 0.6), 0.16); place(sfx, 12.7, bell(1760, 0.6), 0.12)   # sent
place(sfx, 12.98, whoosh(0.35, False), 0.3)                                  # collapse to the dot
place(sfx, 13.34, bell(660), 0.22); place(sfx, 13.63, bell(880), 0.2)        # teacher, learner
place(sfx, 14.88, whoosh(0.4), 0.28)                                         # training → implementation
for i in range(3): place(sfx, 15.05 + i * 0.16, bell(988 + 132 * i, 0.5), 0.13)
place(sfx, 16.6, riser(0.62), 0.22)                                          # into the loop
place(sfx, 17.2, impact(0.9), 0.6); place(sfx, 17.22, bell(523, 1.2), 0.18)  # BUSINESS
place(sfx, 17.98, whoosh(0.5, False), 0.3)                                   # iris back to the face
place(sfx, 22.15, tick(2000), 0.18); place(sfx, 22.45, tick(1600), 0.2)      # NOT JUST / BUILDING.
place(sfx, 24.45, impact(0.8), 0.45)                                         # TEACHING.
place(sfx, 25.0, pen(), 0.18)                                                # underline
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'qb-sting'))
from sting_audio import make_sting                                           # the Quiet Bands sting
sting = make_sting(SR).mean(axis=1)
place(sfx, 26.6, sting / np.abs(sting).max(), 0.43)                          # end frame: on the mark

# ------------------------------------------------------------------------- music bed (original) --
BPM = 96; beat = 60 / BPM
chords = [[110, 164.8, 196, 246.9, 261.6], [87.3, 130.8, 174.6, 220, 261.6],     # Am9, Fmaj7
          [65.4, 130.8, 164.8, 196, 246.9], [98, 146.8, 196, 246.9, 329.6]]      # Cmaj7, G6
music = np.zeros(N); t_all = np.arange(N) / SR
bar = 4 * beat
for k in range(int(LENGTH / (2 * bar)) + 1):                                     # pad: one chord per 2 bars
    s0 = k * 2 * bar; n = int(2 * bar * SR); tt = np.arange(n) / SR
    tone = sum(np.sin(2 * np.pi * f * tt + d) + 0.4 * np.sin(2 * np.pi * f * 2.003 * tt) for f, d in zip(chords[k % 4], range(5)))
    tone *= np.minimum(1, tt / 0.6) * np.minimum(1, (2 * bar - tt) / 0.5) / 5
    place(music, s0 + OFFSET, tone, 0.5)
kick_n = int(0.4 * SR); kt = np.arange(kick_n) / SR
kick = np.sin(2 * np.pi * np.cumsum(50 + 60 * np.exp(-kt * 25)) / SR) * env(kick_n, 0.001, 0.25, 4)
hat = bandnoise(int(0.05 * SR), 6000, 12000) * env(int(0.05 * SR), 0.0005, 0.02, 6)
b = 0.0
while b < LENGTH:
    place(music, b + OFFSET, kick, 0.55)
    place(music, b + beat / 2 + OFFSET, hat, 0.08)
    b += beat
for i, s in enumerate(np.arange(13.3, 17.2, beat / 2)):                          # centerpiece arpeggio
    f = [440, 523.3, 659.3, 784][i % 4] * (1 + (s > 15.0) * 0.5)
    place(music, s, bell(f, 0.35), 0.14)
# arrangement: drop out on "But", return on "Most", stop on "business", restrained ending
gain = np.ones(N)
def ramp(a, b, g0, g1):
    i, j = int(T(a) * SR), int(T(b) * SR); gain[i:j] = np.linspace(g0, g1, j - i)
def hold(a, b, g):
    i, j = int(T(a) * SR), min(N, int(T(b) * SR)); gain[i:j] = g
hold(3.97, 6.4, 0.0); ramp(6.4, 6.9, 0.0, 1.0)
hold(17.23, 17.98, 0.35); ramp(17.98, 19.0, 0.35, 0.55); hold(19.0, 26.5, 0.55)
ramp(26.5, OFFSET + LENGTH, 0.55, 0.0)
music = onepole_lp(music * gain, 5200)
music /= np.abs(music).max() + 1e-9

write(out / 'music.wav', music * 0.5)
write(out / 'sfx.wav', sfx / (np.abs(sfx).max() + 1e-9) * 0.9)

# ------------------------------------------------------------------- voice: conservative clean-up --
vf = ('highpass=f=75,lowpass=f=15000,afftdn=nr=6:nf=-32,deesser=i=0.3,'
      'acompressor=threshold=-21dB:ratio=2.4:attack=8:release=160:makeup=2,'
      'loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st=26.45:d=0.12')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(OFFSET), '-t', str(LENGTH), '-i', rec, '-vn',
                '-af', vf, '-ar', str(SR), '-ac', '2', str(out / 'voice.wav')], check=True)

# ---------------------------------------------------- mix: music ducks under the voice, sfx on top --
fc = ('[1:a]volume=0.32[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=300[md];'
      '[2:a]volume=0.55[s];[0:a][md][s]amix=inputs=3:duration=longest:normalize=0,'
      'apad=whole_dur=' + str(LENGTH) + ',atrim=0:' + str(LENGTH) + ',loudnorm=I=-14:TP=-1.0:LRA=10[out]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'voice.wav'), '-i', str(out / 'music.wav'),
                '-i', str(out / 'sfx.wav'), '-filter_complex', fc, '-map', '[out]', '-ar', str(SR), str(out / 'mix.wav')], check=True)
print('audio →', out)
