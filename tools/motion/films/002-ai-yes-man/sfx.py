# Film 002 sound design: original, synthesised, seeded. Cued to story events from timeline.json; the
# comedy lives in the contrast (approvals that keep climbing, then near-silence and one dry knock on $0).
import json, wave, numpy as np
SR = 48000; T = json.load(open("timeline.json")); DUR = T["total"]; N = int(DUR * SR)
L = {l["n"]: l for l in T["lines"]}; rng = np.random.default_rng(11)
t = np.arange(N) / SR; out = np.zeros((N, 2)); db = lambda d: 10 ** (d / 20)
pz = lambda n, i, k: L[n]["pauses"][i][k]
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

pops = [1.75, pz(2, 1, 1) + 0.05, pz(2, 1, 1) + 0.55, pz(2, 1, 1) + 1.0, pz(2, 1, 1) + 1.4, L[2]["end"] - 0.25, L[2]["end"] + 0.15]
mean, rev, s3, agree, ask = L[4]["at"], pz(4, 0, 1), L[5]["at"], L[6]["at"], L[7]["at"]
q = [L[8]["at"], L[9]["at"], L[10]["at"], pz(11, 0, 1)]; fav, s5, better, fin, build = L[11]["at"], L[12]["at"], L[13]["at"], L[14]["at"] - 0.9, pz(14, 0, 1)

# ---- the bed: rises with the false confidence, drops out for "Meanwhile...", returns warmer once the thinking gets better ----
bed = np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t + 0.4 * np.sin(2 * np.pi * 0.07 * t)) * 0.35 + np.sin(2 * np.pi * 110.3 * t) * 0.18
bright = (np.sin(2 * np.pi * 220 * t) * 0.12 + np.sin(2 * np.pi * 277.2 * t) * 0.08) * np.clip((t - 8) / 6, 0, 1) * np.clip((mean - t) / 0.4, 0, 1)   # the swagger
warm = (np.sin(2 * np.pi * 138.6 * t) * 0.16 + np.sin(2 * np.pi * 164.8 * t) * 0.12) * np.clip((t - s5) / 3, 0, 1)
air = np.zeros(N)   # (was low-passed noise: heard as hiss under the whole film; removed after review)
lvl = env([(0, -60), (0.8, -36), (8, -34), (14, -30), (mean, -29), (mean + 0.35, -54), (s3 - 0.3, -54), (s3 + 1.0, -38), (ask, -37), (q[0], -35), (s5, -33), (better + 1, -30), (fin + 1, -32), (DUR - 1.5, -38), (DUR, -80)])
for ch, ph in ((0, 0.0), (1, 0.3)): out[:, ch] += (bed + bright + warm + air * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t + ph))) * lvl
res = sum(np.sin(2 * np.pi * f * t) * w for f, w in ((220, 0.3), (277.2, 0.2), (329.6, 0.2), (440, 0.08))); re = env([(0, -90), (fin + 0.6, -90), (fin + 1.3, -34), (DUR - 2, -36), (DUR, -80)])
out[:, 0] += res * re; out[:, 1] += res * re

# ---- 1 the yes man ----
add(tick(1800, 0.06), 0.3, 0.3, -32); add(tone(1320, 0.25, rel=0.07), 0.32, 0.3, -36)                  # the assistant wakes
for k in range(22): add(tick(rng.uniform(2800, 3600), 0.03, 0.004), 2.95 + k * 0.095 + rng.uniform(0, 0.02), 0.2, -38)   # typing the idea
for i, at in enumerate(pops):                                                                            # each approval: a bright little ding, a step higher every time
    f = 659.3 * 2 ** (i / 12 * 2); add(tone(f, 0.5, rel=0.15, partials=((1, 1), (2, 0.2))), at, (-0.5 + i * 0.17), -27); add(tone(f * 1.5, 0.6, rel=0.2, partials=((1, 1),)), at + 0.07, (-0.5 + i * 0.17), -30)
# ---- 2 false confidence: approvals become things; the empire assembles; pull back ----
for i in range(7): add(whoosh(0.5, 600, 2400), 9.0 + i * 0.42 + 0.2, 0.2, -38); add(tick(1500, 0.06, 0.012), 9.0 + i * 0.42 + 1.2, 0.3, -31)
for k in range(26): add(tick(rng.uniform(1100, 1900), 0.05, 0.01), 12.3 + 4.0 * rng.random() ** 1.2, rng.uniform(-0.8, 0.8), -36)
for at in (L[2]["end"] - 0.6, L[3]["at"], pz(3, 2, 1)): add(tick(2400, 0.04), at, 0.5, -34)          # the approving labels
add(whoosh(3.8, 250, 1200), 12.8, 0.0, -35)
# ---- "Meanwhile..." everything stops. Then one dry knock on $0, and a held silence ----
add(tick(2000, 0.04), mean + 0.45, 0.0, -36)
add(thud(150, 0.25) * 0.8, rev, 0.0, -24); add(tick(900, 0.03, 0.004) * 0.6, rev, 0.0, -24)
# ---- 3 nobody buys; the approvals turn into questions ----
add(whoosh(2.0, 300, 900), s3, 0.2, -38)
for k in range(5): add(tick(700, 0.04, 0.006), s3 + 0.7 + k * 0.32, -0.3, -40)                         # footsteps in
for i in range(4): add(tone(523.3 * 2 ** (-i / 12 * 2), 0.6, rel=0.25), agree + 0.55 + i * 0.45, -0.4 + i * 0.25, -33)   # approval -> question, a step down each
for k in range(5): add(tick(700, 0.04, 0.006), agree + 1.1 + k * 0.32, -0.3, -42)                       # footsteps away
add(whoosh(0.45, 2400, 900, up=False), ask + 1.9, 0.3, -33)                                             # scratch out "is this a good idea?"
# ---- 4 the four questions: a precision click each, and the picture's own sound ----
for i, at in enumerate(q): add(tick(3000, 0.05, 0.006), at, 0.0, -28); add(tone(1046.5, 0.18, rel=0.05), at + 0.02, 0, -34)
q1len = q[1] - q[0]; add(tone(180, 0.9, a=0.1, rel=0.5, partials=((1, 1), (1.5, 0.3))), q[0] + q1len * 0.15, 0, -33)      # the load
for k in range(2): add(tick(1400, 0.06, 0.01), q[0] + q1len * (0.45 + k * 0.06), -0.2 + k * 0.4, -29)                     # the weak joints
add(tick(3400, 0.05, 0.008), q[1] + (q[2] - q[1]) * 0.82, 0.3, -30)                                                        # paid
add(whoosh(0.6, 1500, 3500), q[2] + (fav - q[2]) * 0.15, 0, -36)                                                           # the plan opens
span = s5 - (fav + 0.15)
for d in (0.42, 0.58, 0.74): add(thud(85, 0.3), fav + 0.15 + span * (d + 0.06), 0.3, -28)                                  # evidence on the scale
# ---- 5 better thinking: what's left works ----
add(whoosh(1.8, 1600, 250, up=False), s5 + 0.2, 0, -36)
add(tone(440, 0.6, rel=0.2), s5 + 3.6, -0.2, -29); add(tone(554.4, 0.6, rel=0.2), s5 + 4.4, 0.3, -29)
for f, d in ((880, 0), (1108.7, 0.03), (1318.5, 0.06)): add(tone(f, 1.6, rel=0.7, partials=((1, 1), (2.76, 0.12))), better + 0.8 + d, 0, -30)
# ---- 6 Quiet Bands ----
add(whoosh(1.2, 200, 1500), fin, 0, -34)
sub = np.arange(int(1.2 * SR)) / SR; add(np.sin(2 * np.pi * 48 * sub) * np.exp(-sub / 0.35) * np.minimum(1, sub / 0.01), fin + 1.0, 0, -26)
add(tone(880, 2.2, rel=1.0, partials=((1, 1), (2.76, 0.1), (5.4, 0.04))), fin + 1.05, 0, -33); add(tick(2600, 0.04), build, 0, -34)
out = np.clip(out * db(3), -1, 1)
with wave.open("sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("sfx.wav", DUR, "s, peak", round(20 * np.log10(np.abs(out).max() + 1e-9), 1), "dBFS")
