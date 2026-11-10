# TECH DROP 001 sound design: original, synthesised, seeded (numpy only). Restrained: a low, steady news pulse,
# precise interface ticks for each capability, one confirmation for each approval, and the series end sting.
# Every cue sits on the beat times td001.js load() uses, so real narration takes re-time the sound too.
import json, sys, wave, numpy as np; sys.path.insert(0, "..")
from timeline_util import brk
SR = 48000; T = json.load(open("timeline.json")); DUR = T["total"]; N = int(DUR * SR)
L = {l["n"]: l for l in T["lines"]}; rng = np.random.default_rng(3)
t = np.arange(N) / SR; out = np.zeros((N, 2)); db = lambda d: 10 ** (d / 20)
b = lambda n, f: brk(L, n, f)[1]
def env(pts): xs, ys = zip(*pts); return db(np.interp(t, xs, ys))
def add(sig, at, pan=0.0, g=0.0):
    i0 = int(at * SR); n = min(len(sig), N - i0)
    if n <= 0 or i0 < 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[i0:i0 + n, 0] += sig[:n] * db(g) * l * 1.414; out[i0:i0 + n, 1] += sig[:n] * db(g) * r * 1.414
def tone(f, d, a=0.004, rel=0.25, partials=((1, 1), (2, 0.25), (3, 0.08))):
    tt = np.arange(int(d * SR)) / SR; return sum(w * np.sin(2 * np.pi * f * k * tt) for k, w in partials) * np.minimum(1, tt / a) * np.exp(-tt / rel)
def tick(f=2600, d=0.05, dec=0.008): tt = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * tt) * 0.6 + rng.normal(0, 0.12, len(tt))) * np.exp(-tt / dec)
def whoosh(d, f0=300, f1=1800, up=True):
    n = int(d * SR); x = rng.normal(0, 1, n); u = np.arange(n) / n; fc = f0 + (f1 - f0) * (u if up else 1 - u); y = np.zeros(n); a1 = a2 = 0.0
    for i in range(n): k = np.exp(-2 * np.pi * fc[i] / SR); a1 = (1 - k) * x[i] + k * a1; a2 = (1 - k * 0.97) * a1 + k * 0.97 * a2; y[i] = a1 - a2 * 0.6
    return y * np.sin(np.pi * u) ** 1.5 * 2.2 * 0.56
def thud(f=70, d=0.35): tt = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * tt * (1 - 0.3 * tt)) + 0.3 * rng.normal(0, 1, len(tt)) * np.exp(-tt / 0.01)) * np.exp(-tt / 0.09)
def step(): tt = np.arange(int(0.09 * SR)) / SR; return (np.sin(2 * np.pi * 95 * tt) * 0.8 + rng.normal(0, 0.25, len(tt)) * np.exp(-tt / 0.006)) * np.exp(-tt / 0.03)
def paper(): n = int(0.18 * SR); x = rng.normal(0, 1, n); x = np.diff(np.concatenate([[0], x])); return x * np.exp(-np.arange(n) / SR / 0.05) * 0.5
def chime(f): return tone(f, 1.2, rel=0.45, partials=((1, 1), (2.0, 0.18), (3.0, 0.05)))

# beats: the same as td001.js load()
l = lambda n: L[n]
fable52, race = l(2)["at"], b(2, 7 / 13) - 0.2
envT, dep, found = l(4)["at"], l(5)["at"], b(5, 3 / 7) + 0.1
net, approve = l(6)["at"], l(6)["end"] - 0.5
key, keyIn = l(7)["at"], b(7, 2 / 9) + 0.1
usage, eat, fix, storage, clear = l(8)["at"], l(8)["at"] + 0.9, l(8)["end"] - 1.1, l(9)["at"], l(9)["at"] + 0.9
think, models, opus, fable, test = l(10)["at"], l(11)["at"], l(11)["at"] + 0.4, l(12)["at"] + 0.2, l(12)["end"] - 0.9
away, phone, shift = l(13)["at"], b(13, 7 / 13) + 0.1, l(14)["at"]
fin, build = l(15)["at"] - 0.6, b(15, 2 / 5)

# ---- the bed: a low steady pulse (news, not drama) and a soft pad that opens for the thesis ----
drone = np.sin(2 * np.pi * 55 * t) * 0.45 + np.sin(2 * np.pi * 82.4 * t + 0.4 * np.sin(2 * np.pi * 0.09 * t)) * 0.3
lvl = env([(0, -70), (0.5, -40), (envT, -38), (shift, -38), (fin + 0.5, -42), (DUR, -80)])
for ch in (0, 1): out[:, ch] += drone * lvl
x = 0.5
while x < fin: add(thud(60, 0.3) * 0.6, x, 0, -36); x += 0.96
pad = lambda f, ph: np.sin(2 * np.pi * f * t + ph)
padL = pad(220, 0) * 0.22 + pad(277.2, 0.4) * 0.14 + pad(329.6, 0.2) * 0.1; padR = pad(220.4, 0.6) * 0.22 + pad(277.6, 0.1) * 0.14 + pad(330.2, 0.8) * 0.1
pl = env([(0, -90), (shift - 0.5, -90), (shift + 2, -38), (fin + 1, -40), (DUR - 1.5, -46), (DUR, -90)])
out[:, 0] += padL * pl; out[:, 1] += padR * pl
res = sum(np.sin(2 * np.pi * f * t) * w for f, w in ((220, 0.3), (277.2, 0.2), (329.6, 0.2), (440, 0.08))); re = env([(0, -90), (fin + 0.6, -90), (fin + 1.3, -34), (DUR - 2, -36), (DUR, -80)])
out[:, 0] += res * re; out[:, 1] += res * re

# ---- S1 ----
add(tick(2400, 0.05), 0.35, 0, -30); add(tone(1046.5, 0.5, rel=0.15), 0.4, 0, -33)                    # the drop
add(whoosh(0.5, 900, 2600), fable52 - 0.1, 0, -38)
for k in range(12): add(tick(3200, 0.02, 0.003), race + k * 0.16, -0.3, -42)                         # the race
add(tone(1318.5, 0.6, rel=0.2), race + 2.0, 0.2, -31)                                                 # 5.2 finishes
# ---- S2: the environment assembles; dependency found; approval; secure key ----
add(whoosh(1.4, 300, 1600), envT, 0.3, -36)
for k in range(4): add(tick(1600 + k * 200, 0.05, 0.01), envT + 0.6 + k * 0.15, 0.3 + k * 0.1, -30)
add(tone(300, 0.35, a=0.02, rel=0.15, partials=((1, 1), (2.01, 0.4))), dep + 0.05, 0.4, -33)             # missing
add(tone(1500, 0.9, a=0.2, rel=0.4, partials=((1, 1), (1.01, 0.5))), dep + 0.3, 0.4, -42)                 # searching
add(tone(880, 0.5, rel=0.15), found, 0.4, -30); add(tick(1300, 0.06, 0.012), found + 0.9, 0.4, -27)       # found, installed
add(tone(660, 0.3, rel=0.1), net + 0.05, -0.4, -32)                                                       # the request
add(tick(2600, 0.04, 0.005), approve - 0.12, -0.4, -26); add(chime(880), approve, -0.3, -29); add(chime(1318.5), approve + 0.06, -0.3, -32)   # you approve
add(whoosh(0.8, 800, 2400), approve + 0.3, 0.6, -40)
add(tone(220, 0.25, rel=0.08), key + 0.3, 0, -36)                                                         # not the chat
add(whoosh(1.4, 400, 1200), keyIn, -0.2, -40); add(tick(900, 0.08, 0.02), keyIn + 1.35, 0.4, -27); add(tone(587.3, 0.5, rel=0.2), keyIn + 1.4, 0.4, -32)   # locked in
# ---- S3: housekeeping ----
for at2 in (usage, storage): add(whoosh(0.7, 1200, 300, up=False), at2 - 0.5, 0.5, -36); add(tick(2800, 0.05), at2 + 0.5, 0, -32)
add(tone(392, 0.4, rel=0.15), eat, 0, -32); add(whoosh(0.9, 1600, 500, up=False), fix, 0, -38); add(tone(784, 0.5, rel=0.18), fix + 0.9, 0, -32)
for k in range(4): add(tick(1100, 0.06, 0.01), clear + k * 0.2, 0.3, -32); add(tone(660, 0.5, rel=0.2), clear + 1.2, 0, -33)
# ---- S4: thinking, models ----
add(whoosh(0.7, 1200, 300, up=False), think - 0.5, 0.5, -36)
for k in range(16): add(tone(523.3 * 2 ** ((k % 5) / 12 * 2), 0.25, rel=0.08, partials=((1, 1),)), think + 0.2 + 2.2 * (k / 16), (k % 4 - 1.5) * 0.3, -40)   # branching
add(tone(1046.5, 0.8, rel=0.3), think + 2.5, 0, -31)
add(whoosh(0.7, 1200, 300, up=False), models - 0.5, 0.5, -36); add(tick(2400, 0.05), opus, -0.3, -30); add(tick(2400, 0.05), fable, 0.3, -30); add(tone(880, 0.5, rel=0.2), test, 0.3, -32)
# ---- S5: away, still running, picked up ----
add(whoosh(1.4, 2000, 300, up=False), away - 0.3, -0.5, -34); add(tick(700, 0.07, 0.02), away + 0.4, -0.4, -30)     # laptop closes
for k in range(4): add(step() * 0.7, away + 0.6 + k * 0.36, -0.3, -32)
add(chime(987.8), phone + 1.0, -0.2, -30)                                                                  # the session, on the other device
add(whoosh(1.6, 300, 1400), shift + 0.2, 0, -36)
# ---- Quiet Bands ----
add(whoosh(1.2, 200, 1500), fin, 0, -34)
sub = np.arange(int(1.2 * SR)) / SR; add(np.sin(2 * np.pi * 48 * sub) * np.exp(-sub / 0.35) * np.minimum(1, sub / 0.01), fin + 1.0, 0, -26)
add(tone(880, 2.2, rel=1.0, partials=((1, 1), (2.76, 0.1), (5.4, 0.04))), fin + 1.05, 0, -33); add(tick(2600, 0.04), build, 0, -34)
out = np.clip(out * db(3), -1, 1)
with wave.open("sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("sfx.wav", DUR, "s, peak", round(20 * np.log10(np.abs(out).max() + 1e-9), 1), "dBFS")
