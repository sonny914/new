# Film 002 sound design (v2, character-led): original, synthesised, seeded. Every cue is a story event, at the same
# beat times the picture uses (film002.js load()). The comedy is in the contrast: approvals that keep climbing,
# then near-silence and one dry knock on SOLD 0; at the end a single earned coin.
import json, sys, wave, numpy as np; sys.path.insert(0, '..')
from timeline_util import brk
SR = 48000; T = json.load(open("timeline.json")); DUR = T["total"]; N = int(DUR * SR)
L = {l["n"]: l for l in T["lines"]}; rng = np.random.default_rng(11)
t = np.arange(N) / SR; out = np.zeros((N, 2)); db = lambda d: 10 ** (d / 20)
b = lambda n, f: brk(L, n, f)[1]
def env(pts): xs, ys = zip(*pts); return db(np.interp(t, xs, ys))
def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y
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
    return y * np.sin(np.pi * u) ** 1.5 * 2.2 * 0.56   # -5 dB: sweeps stay felt, never heard as noise
def thud(f=70, d=0.35): tt = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * tt * (1 - 0.3 * tt)) + 0.3 * rng.normal(0, 1, len(tt)) * np.exp(-tt / 0.01)) * np.exp(-tt / 0.09)

# beats: the same as film002.js load()
hook, idea, brilliant = b(1, 3 / 7), L[2]["at"] + 0.15, b(2, 5 / 10) + 0.15
a3, rise, extras = L[3]["at"], b(3, 4 / 14), b(3, 8 / 14)
mean, punch, fair, agree = L[4]["at"], b(4, 1 / 7), L[5]["at"], L[6]["at"]
pas, look, ask = agree - 0.3, agree + 1.4, b(7, 4 / 9)
q = [L[8]["at"], L[9]["at"], L[10]["at"], b(11, 2 / 10)]; fav = L[11]["at"]; fix1, fix2 = q[3] + 1.9, q[3] + 2.6
l12 = L[12]["at"]; walk_in, enter = l12 + 0.2, l12 + 2.4; sold = L[13]["at"] + 0.75
fin, build = L[14]["at"] - 0.55, b(14, 2 / 5)

# ---- the bed: swells with the false confidence, cuts out on "Meanwhile...", comes back warm once someone actually buys ----
bed = np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t + 0.4 * np.sin(2 * np.pi * 0.07 * t)) * 0.35 + np.sin(2 * np.pi * 110.3 * t) * 0.18
bright = (np.sin(2 * np.pi * 220 * t) * 0.12 + np.sin(2 * np.pi * 277.2 * t) * 0.08) * np.clip((t - a3) / 4, 0, 1) * np.clip((mean - t) / 0.3, 0, 1)
warm = (np.sin(2 * np.pi * 138.6 * t) * 0.16 + np.sin(2 * np.pi * 164.8 * t) * 0.12) * np.clip((t - sold) / 2, 0, 1)
lvl = env([(0, -60), (0.8, -36), (a3, -33), (14, -29), (mean, -28), (mean + 0.3, -56), (fair - 0.2, -56), (fair + 1.0, -38), (ask, -37), (q[0], -35), (l12, -34), (sold, -31), (fin + 1, -32), (DUR - 1.5, -38), (DUR, -80)])
for ch in (0, 1): out[:, ch] += (bed + bright + warm) * lvl
res = sum(np.sin(2 * np.pi * f * t) * w for f, w in ((220, 0.3), (277.2, 0.2), (329.6, 0.2), (440, 0.08))); re = env([(0, -90), (fin + 0.6, -90), (fin + 1.3, -34), (DUR - 2, -36), (DUR, -80)])
out[:, 0] += res * re; out[:, 1] += res * re
ding = lambda at, f, pan=0.0, g=-27: (add(tone(f, 0.5, rel=0.15, partials=((1, 1), (2, 0.2))), at, pan, g), add(tone(f * 1.5, 0.6, rel=0.2, partials=((1, 1),)), at + 0.07, pan, g - 3))
steps = lambda a, e, pan, g=-40: [add(tick(700, 0.04, 0.006), x, pan, g) for x in np.arange(a, e, 0.34)]

# ---- 1 the yes man says yes ----
add(tick(1800, 0.06), 0.3, 0.3, -32); add(tone(1320, 0.25, rel=0.07), 0.32, 0.3, -36)                       # it wakes
for k in range(30): add(tick(rng.uniform(2800, 3600), 0.03, 0.004), 0.6 + k * 0.17 + rng.uniform(0, 0.03), -0.3, -40)   # he types
ding(hook, 659.3, 0.3)                                                                                        # ✓, thumbs up
add(whoosh(1.3, 500, 2200), idea, 0.1, -35)                                                                   # the idea flies over
ding(brilliant, 830.6, 0.3, -25)                                                                              # BRILLIANT.
add(thud(110, 0.3), a3 + 0.3, 0.3, -26); add(tick(1200, 0.05, 0.01), a3 + 0.3, 0.3, -30)                       # APPROVED (stamp)
# ---- 2 the store goes up, then gets bigger ----
add(whoosh(1.2, 250, 1400), rise - 0.1, 0.2, -33); add(thud(65, 0.4), rise + 1.05, 0.2, -27)
for k, at in enumerate((extras + 0.2, extras + 0.45, extras + 0.7)): add(tick(1500 + k * 300, 0.06, 0.012), at, 0.3 + 0.15 * k, -30)
ding(extras + 1.0, 987.8, 0.4, -29)                                                                           # thumbs up again
# ---- "Meanwhile..." everything stops. SOLD 0 lights. One dry knock. ----
add(tick(2000, 0.04), mean + 0.35, 0.3, -36)
add(thud(150, 0.25) * 0.8, punch, 0.0, -24); add(tick(900, 0.03, 0.004) * 0.6, punch, 0.0, -24)
# ---- 3 it really can help build (the awning) ----
add(whoosh(1.0, 800, 2600), fair + 1.0, 0.3, -35)
for k in range(4): add(tick(2200, 0.04, 0.006), fair + 1.2 + k * 0.18, 0.3, -33)
# ---- the passerby: walks up, looks, leaves. The ✓ turns into ? ----
steps(pas, look, 0.6); steps(look + 1.0, look + 2.7, 0.7, -43)
for i in range(3): add(tone(523.3 * 2 ** (-i / 6), 0.5, rel=0.2), look + 0.6 + i * 0.22, 0.2, -33)
# ---- the habit: he asks, it agrees instantly, he scratches the question out ----
add(tick(2600, 0.04), ask, -0.2, -34); ding(ask + 0.7, 987.8, 0.2, -28)
add(whoosh(0.45, 2400, 900, up=False), ask + 1.5, -0.2, -33)
# ---- the four questions: a precision click each, then what it finds ----
for at in q: add(tick(3000, 0.05, 0.006), at, 0.0, -28); add(tone(1046.5, 0.18, rel=0.05), at + 0.02, 0, -34)
add(tone(1500, 1.3, a=0.2, rel=0.6, partials=((1, 1), (1.01, 0.5))), q[0] + 0.6, 0.3, -40)                     # the scan
for k in range(2): add(tick(1400, 0.06, 0.01), q[0] + 1.25 + k * 0.12, 0.1 + k * 0.4, -29)                       # NO HANDLE, NO PRICE
add(tone(392, 0.8, rel=0.3), q[1] + 0.45, 0.6, -32)                                                            # a real customer
add(whoosh(1.1, 1400, 300, up=False), q[2] + 1.6, 0.3, -33); add(thud(70, 0.35), q[2] + 2.8, 0.3, -28)          # the assumptions come off
add(thud(95, 0.3), q[3] + 0.9, -0.1, -27)                                                                      # it pushes back
add(tick(1100, 0.07, 0.015), fix1 + 0.2, 0.4, -28); add(tick(2300, 0.05, 0.008), fix2 + 0.2, 0.2, -30)          # handle on, price on
# ---- someone actually comes in. And pays. ----
steps(walk_in, enter - 0.2, 0.6)
add(tone(310, 0.5, a=0.05, rel=0.2, partials=((1, 1), (1.5, 0.2))), enter - 0.4, 0.4, -36)                     # the door
for f, d in ((1975.5, 0), (2637, 0.06)): add(tone(f, 0.9, rel=0.3, partials=((1, 1), (2.76, 0.15))), sold + d, 0.4, -28)   # the coin
for f, d in ((440, 0), (554.4, 0.04), (659.3, 0.08)): add(tone(f, 1.8, rel=0.8, partials=((1, 1), (2, 0.1))), sold + 0.35 + d, 0, -31)   # earned
# ---- 6 Quiet Bands ----
add(whoosh(1.2, 200, 1500), fin, 0, -34)
sub = np.arange(int(1.2 * SR)) / SR; add(np.sin(2 * np.pi * 48 * sub) * np.exp(-sub / 0.35) * np.minimum(1, sub / 0.01), fin + 1.0, 0, -26)
add(tone(880, 2.2, rel=1.0, partials=((1, 1), (2.76, 0.1), (5.4, 0.04))), fin + 1.05, 0, -33); add(tick(2600, 0.04), build, 0, -34)
out = np.clip(out * db(3), -1, 1)
with wave.open("sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("sfx.wav", DUR, "s, peak", round(20 * np.log10(np.abs(out).max() + 1e-9), 1), "dBFS")
