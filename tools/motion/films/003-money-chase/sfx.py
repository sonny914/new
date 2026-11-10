# Film 003 sound design: original, synthesised, seeded (numpy only, no samples). Every cue is a story event at the
# beat times the picture uses (film003.js load()). The arc: a distant mechanical pulse and footsteps that speed up,
# interface clicks multiplying, an abrupt cut to silence on $0, then a spatial, harmonic opening for the reveal,
# clear interaction sounds and one confirmation per real exchange.
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

# beats: the same as film003.js load()
bills, mess = L[3]["at"] + 0.5, L[4]["at"]
apps, biz, auto = L[5]["at"], b(5, 5 / 12) - 0.1, b(5, 8 / 12) - 0.05
broke, activity, attention = L[6]["at"], L[7]["at"], L[8]["at"]
orbit, give = L[9]["at"] - 0.3, b(9, 10 / 19) + 1.4
problem = L[11]["at"]; fix, use, pay = problem + 1.2, problem + 2.1, problem + 3.0
fork, askA, shatter, forkB = L[12]["at"] + 0.5, b(12, 6 / 12), L[12]["end"] - 0.2, L[13]["at"] + 0.3
nodes = [b(13, 6 / 12), L[14]["at"] + 0.5, L[15]["at"] + 0.4, L[16]["at"] + 0.3, L[16]["end"] - 0.5]; closeB = L[16]["end"] + 0.1
shift = L[17]["at"]; use2, pay2 = shift + 2.0, shift + 2.9; fin, build = L[18]["at"] - 0.6, b(18, 2 / 5)
ROUTE = [[0, 0, 0], [1.4, 0, 0], [2.3, 0, 1.1], [3.6, 0, 7.5], [5.0, 0, 13.0], [6.4, 4.6, 16.2], [6.9, 4.6, 16.2], [8.0, 2.6, 20.5], [9.3, -3.0, 23.5],
  [10.3, -5.6, 21.0], [10.6, -5.6, 21.0], [11.8, -3.6, 16.5], [12.9, -0.4, 13.6], [13.4, -0.4, 13.6], [14.2, 0, 17.4], [15.7, 0, 26.6], [16.6, 0, 30]]
OFFER_ON = [4.2, 6.9, 8.6, 10.7, 13.5]; DEAD = [6.4, 10.3]

# ---- the bed: low tension that climbs with the chase, cut dead on $0, then opens out for the reveal ----
drone = np.sin(2 * np.pi * 41.2 * t) * 0.5 + np.sin(2 * np.pi * 61.7 * t + 0.6 * np.sin(2 * np.pi * 0.11 * t)) * 0.3 + np.sin(2 * np.pi * 82.4 * t) * 0.15
lvl = env([(0, -70), (0.6, -40), (8, -36), (16, -33), (broke - 0.05, -31), (broke + 0.08, -80), (orbit - 0.5, -80), (orbit + 3, -80), (DUR, -80)])
for ch in (0, 1): out[:, ch] += drone * lvl
hum = np.sin(2 * np.pi * 523.3 * t) * 0.15 + np.sin(2 * np.pi * 784 * t) * 0.08                                  # the machine keeps running, thin
out[:, 0] += hum * env([(0, -90), (auto, -90), (auto + 1, -46), (broke, -46), (broke + 1.4, -90), (broke + 2.4, -52), (orbit, -52), (orbit + 2, -90), (DUR, -90)])
out[:, 1] += hum * env([(0, -90), (auto, -90), (auto + 1, -46), (broke, -46), (broke + 1.4, -90), (broke + 2.4, -52), (orbit, -52), (orbit + 2, -90), (DUR, -90)])
pad = lambda f, ph: np.sin(2 * np.pi * f * t + ph)                                                                  # the reveal: open fifths, wide
padL = pad(110, 0) * 0.3 + pad(164.8, 0.3) * 0.22 + pad(220.4, 0.1) * 0.15 + pad(277.2, 0.7) * 0.08
padR = pad(110.3, 0.5) * 0.3 + pad(165.2, 0.1) * 0.22 + pad(219.6, 0.9) * 0.15 + pad(329.6, 0.2) * 0.07
pl = env([(0, -90), (orbit, -90), (orbit + 4, -36), (give, -33), (problem, -36), (fork, -38), (shift, -35), (fin + 1, -36), (DUR - 1.5, -44), (DUR, -90)])
out[:, 0] += padL * pl; out[:, 1] += padR * pl
res = sum(np.sin(2 * np.pi * f * t) * w for f, w in ((220, 0.3), (277.2, 0.2), (329.6, 0.2), (440, 0.08))); re = env([(0, -90), (fin + 0.6, -90), (fin + 1.3, -34), (DUR - 2, -36), (DUR, -80)])
out[:, 0] += res * re; out[:, 1] += res * re

# ---- 1 the chase: a distant mechanical pulse that speeds up, and his footsteps ----
x, k = 0.5, 0
while x < broke - 0.05:
    add(thud(52, 0.4), x, 0, -30 + 4 * min(1, x / 16)); x += 0.78 - 0.3 * min(1, x / 18); k += 1
dist, last, step_at = 0.0, None, 0.0
for i in range(1, len(ROUTE)):
    t0, x0, z0 = ROUTE[i - 1]; t1, x1, z1 = ROUTE[i]; seglen = np.hypot(x1 - x0, z1 - z0)
    if seglen < 0.01: continue
    stride = 0.85 if seglen / (t1 - t0) < 2 else 1.6
    for s in np.arange(0, seglen, stride): add(step(), t0 + (t1 - t0) * s / seglen, np.clip((x0 + (x1 - x0) * s / seglen) / 8, -0.6, 0.6), -26)
add(tone(1318.5, 1.6, a=0.3, rel=0.8, partials=((1, 1), (1.5, 0.2))), 0.8, 0.2, -38)                                    # the glow appears
# ---- 2 the maze: each offer lights up (rising whoosh + ping); dead ends land hard; the loop folds back ----
for i, on in enumerate(OFFER_ON): add(whoosh(0.6, 500, 2600), on, 0.3 if i % 2 else -0.3, -36); add(tone(1046.5 * 2 ** (i / 12 * 2), 0.5, rel=0.12), on + 0.35, 0.3 if i % 2 else -0.3, -32)
for d in DEAD: add(thud(60, 0.5), d, 0, -24); add(tick(400, 0.08, 0.03), d + 0.02, 0, -30)
add(whoosh(0.9, 2200, 400, up=False), 12.6, 0, -32); add(tone(392, 0.8, rel=0.3), 12.9, 0, -34)                            # back where he started
for k2 in range(7): at = bills + k2 * 0.42 + 0.75; add(paper(), at, (k2 % 3 - 1) * 0.5, -28); add(tick(900, 0.04, 0.01), at, 0, -36)   # bills land
# ---- 3 the trap: assembly multiplies; then $0 ----
for i in range(10): add(tick(2400 + i * 60, 0.05, 0.007), apps + i * 0.155 + 0.2, (i / 9 - 0.5), -29)
for i in range(5): add(thud(140, 0.2) * 0.7, biz + i * 0.3 + 0.25, (i / 4 - 0.5), -27); add(tick(1500, 0.05, 0.01), biz + i * 0.3 + 0.27, 0, -31)
for i in range(60): add(tick(rng.uniform(2800, 4200), 0.025, 0.003), auto + 1.6 * (i / 60) ** 1.6, rng.uniform(-0.7, 0.7), -36)
sub = np.arange(int(1.4 * SR)) / SR; add(np.sin(2 * np.pi * 38 * sub) * np.exp(-sub / 0.4) * np.minimum(1, sub / 0.005), broke, 0, -22)            # $0
add(tick(1800, 0.05), activity + 0.05, 0, -32)
for i in range(40): add(tick(3600, 0.02, 0.002), attention + 1.6 * (i / 40) ** 0.7, 0.5, -42)                              # views counting up
# ---- 4 the reveal: the orbit opens the space; the money comes down to someone; the network starts trading ----
add(whoosh(8.0, 120, 700), orbit + 0.5, 0, -40)
add(whoosh(1.6, 1400, 300, up=False), give - 1.0, -0.2, -36)
for f2, d2 in ((440, 0), (554.4, 0.05), (659.3, 0.1)): add(tone(f2, 2.2, a=0.15, rel=1.0, partials=((1, 1), (2, 0.1))), give + 0.6 + d2, 0, -33)
order = [0, 3, 6, 1, 8, 4, 2, 7, 5, 9]
for i, o in enumerate(order):
    fire = 37.4 + o * 0.62; pan = (i / 9 - 0.5) * 1.4
    add(tick(2200, 0.04, 0.006), fire, pan, -38); add(chime(1318.5), fire + 2.0, pan, -42)
# ---- 5 the exchange we follow ----
add(tone(150, 0.4, a=0.02, rel=0.2, partials=((1, 1), (2.01, 0.5), (3.02, 0.3))), problem + 0.1, -0.3, -32)              # broken step: a dull buzz
for k2 in range(3): add(tick(1700 + k2 * 150, 0.06, 0.012), fix + 0.1 + k2 * 0.18, -0.2, -26)                              # the piece set in place
add(whoosh(0.8, 700, 1800), use, -0.3, -38); add(tone(880, 0.6, rel=0.2), use + 0.8, -0.2, -30)                           # it works
add(whoosh(0.9, 900, 2400), pay, 0.2, -38); add(chime(880), pay + 0.9, 0.3, -27); add(chime(1318.5), pay + 0.96, 0.3, -30)  # payment: the confirmation
# ---- 6 the better question ----
add(whoosh(1.6, 600, 2000), fork, -0.4, -40)
for k2 in range(9): add(tick(rng.uniform(3000, 5200), 0.03, 0.003), shatter + k2 * 0.09, -0.5 + rng.uniform(-0.3, 0.3), -32)   # path A breaks
for k2 in range(4): add(tone(700 - k2 * 90, 0.4, rel=0.15), shatter + 0.2 + k2 * 0.16, -0.5, -38)
penta = [523.3, 587.3, 659.3, 784, 880]
for i, at in enumerate(nodes): add(tick(2600, 0.04, 0.006), at, 0.4, -32); add(tone(penta[i], 0.6, rel=0.25), at + 0.02, 0.4, -31)
add(chime(659.3), closeB + 0.9, 0, -28); add(chime(987.8), closeB + 0.95, 0, -31)
# ---- 7 the shift: a customer comes, is helped, pays ----
for k2 in range(4): add(step() * 0.7, shift + 0.25 + k2 * 0.32, -0.5, -32)
add(whoosh(0.8, 700, 1800), use2, -0.3, -38); add(tone(880, 0.6, rel=0.2), use2 + 0.8, -0.2, -30)
add(chime(880), pay2 + 0.9, 0.3, -27); add(chime(1318.5), pay2 + 0.96, 0.3, -30)
add(whoosh(2.2, 200, 900), pay2 + 1.0, 0, -36)
# ---- Quiet Bands ----
add(whoosh(1.2, 200, 1500), fin, 0, -34)
sub = np.arange(int(1.2 * SR)) / SR; add(np.sin(2 * np.pi * 48 * sub) * np.exp(-sub / 0.35) * np.minimum(1, sub / 0.01), fin + 1.0, 0, -26)
add(tone(880, 2.2, rel=1.0, partials=((1, 1), (2.76, 0.1), (5.4, 0.04))), fin + 1.05, 0, -33); add(tick(2600, 0.04), build, 0, -34)
out = np.clip(out * db(3), -1, 1)
with wave.open("sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("sfx.wav", DUR, "s, peak", round(20 * np.log10(np.abs(out).max() + 1e-9), 1), "dBFS")
