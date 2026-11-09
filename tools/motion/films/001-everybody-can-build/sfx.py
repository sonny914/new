# Original sound design for Film 001, synthesised (no samples, nothing to license). Deterministic (seeded).
# Every cue sits on a story event from timeline.json / the animation; levels stay well under the narration.
import json, wave, numpy as np
SR = 48000; T = json.load(open("timeline.json")); DUR = T["total"]; N = int(DUR * SR)
L = {l["n"]: l for l in T["lines"]}; rng = np.random.default_rng(7)
out = np.zeros((N, 2)); t = np.arange(N) / SR
db = lambda d: 10 ** (d / 20)
def env_points(pts):  # piecewise-linear envelope in dB over the whole film
    xs, ys = zip(*pts); return db(np.interp(t, xs, ys))
def lowpass(x, fc):    # one-pole, enough for soft textures
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y
def add(sig, at, pan=0.0, gain_db=0.0):
    i0 = int(at * SR); n = min(len(sig), N - i0)
    if n <= 0: return
    g = db(gain_db); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[i0:i0 + n, 0] += sig[:n] * g * l * 1.414; out[i0:i0 + n, 1] += sig[:n] * g * r * 1.414
def tone(f, d, a=0.004, rel=0.25, partials=((1, 1), (2, 0.25), (3, 0.08))):
    tt = np.arange(int(d * SR)) / SR; s = sum(w * np.sin(2 * np.pi * f * k * tt) for k, w in partials)
    return s * np.minimum(1, tt / a) * np.exp(-tt / rel)
def tick(f=2600, d=0.05): tt = np.arange(int(d * SR)) / SR; return (np.sin(2 * np.pi * f * tt) * 0.6 + rng.normal(0, 0.3, len(tt))) * np.exp(-tt / 0.008)
def whoosh(d, f0=300, f1=1800, up=True):
    n = int(d * SR); x = rng.normal(0, 1, n); tt = np.arange(n) / n
    # sweep a resonant-ish band by mixing two lowpasses
    fc = f0 + (f1 - f0) * (tt if up else 1 - tt); y = np.zeros(n); a1 = a2 = 0.0
    for i in range(n): k = np.exp(-2 * np.pi * fc[i] / SR); a1 = (1 - k) * x[i] + k * a1; a2 = (1 - k * 0.97) * a1 + k * 0.97 * a2; y[i] = a1 - a2 * 0.6
    return y * np.sin(np.pi * tt) ** 1.5 * 2.2

# ---- the bed: a low, slowly moving chord; its level follows the story ----
bed = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t + 0.4 * np.sin(2 * np.pi * 0.07 * t)) * 0.35 + np.sin(2 * np.pi * 110.3 * t) * 0.18)
warm = (np.sin(2 * np.pi * 138.6 * t) * 0.16 + np.sin(2 * np.pi * 164.8 * t) * 0.12) * np.clip((t - 30.0) / 4, 0, 1)
air = lowpass(rng.normal(0, 1, N), 900) * 0.5
bedlvl = env_points([(0, -60), (1.5, -36), (12, -35), (16.4, -33), (21, -29), (23.2, -38), (30, -37), (34, -33), (42.4, -31), (48, -30), (50, -33), (DUR - 1.5, -38), (DUR, -70)])
for ch, ph in ((0, 0.0), (1, 0.3)): out[:, ch] += (bed + warm + air * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t + ph))) * bedlvl
# resolution chord under the logo (A major, soft)
res = sum(np.sin(2 * np.pi * f * t) * w for f, w in ((220, 0.3), (277.2, 0.2), (329.6, 0.2), (440, 0.08)))
out[:, 0] += res * env_points([(0, -90), (48.6, -90), (49.3, -34), (52.5, -36), (DUR, -80)]); out[:, 1] += res * env_points([(0, -90), (48.6, -90), (49.3, -34), (52.5, -36), (DUR, -80)])

# ---- 1 the idea (opening) ----
add(tone(523, 0.9, rel=0.6, partials=((1, 1), (2, 0.1))) * np.linspace(0, 1, int(0.9 * SR)) ** 2, 1.1, -0.2, -40)   # the pulse travelling
add(tick(1800, 0.06), 1.95, 0.1, -28); add(tone(1320, 0.25, rel=0.07), 1.95, 0.1, -32)                                # the screen takes it
add(whoosh(1.0, 400, 2200), 2.4, 0.3, -34)                                                                           # the window lifts off
for at, pan in ((3.62, 0.5), (3.8, -0.3)): add(tick(2400), at, pan, -33)
# ---- 2 everyone ----
for k in range(6): add(tone(392 * (1 + k * 0.0), 1.2, a=0.2, rel=0.5, partials=((1, 1), (1.5, 0.3))), 7.5 + k * 0.13, -0.6 + k * 0.24, -46)   # the team, there
add(whoosh(0.9, 2000, 300, up=False), 9.6, 0.0, -34)                                                                  # and gone
for at, pan in ((10.35, 0.4), (10.6, -0.4)): add(tick(2200), at, pan, -31)
for k in range(30): add(tick(2000 + rng.uniform(-300, 300), 0.04), 12.4 + 3.1 * (k / 30) ** 0.9 + rng.uniform(0, 0.08), rng.uniform(-0.8, 0.8), -41)
# ---- 3 the flood: a rain of tiny ticks, denser and louder, then it stops when one thing is chosen ----
for k in range(420):
    at = 16.7 + 4.6 * rng.random() ** 0.8; add(tick(rng.uniform(1600, 3600), 0.03), at, rng.uniform(-1, 1), -46 + 8 * (at - 16.7) / 4.6)
add(whoosh(1.4, 1600, 250, up=False), L[7]["at"] - 0.3, -0.2, -33)                                                    # the crowd steps back
# ---- 4 the problem: an attempt that rises and falls ----
tryA = L[7]["at"] + 0.85 + 1.6 + 0.15
add(tone(659.3, 0.5, rel=0.18), tryA + 0.05, -0.3, -32); add(tone(493.9, 0.7, rel=0.3), tryA + 0.42, -0.3, -33); add(tone(392, 0.9, rel=0.4), tryA + 0.8, -0.3, -36)
# ---- 5 the connection ----
s5 = L[8]["at"]; add(whoosh(2.0, 300, 1200), s5 + 0.2, 0.3, -36)
for k, at in enumerate((s5 + 2.4, s5 + 2.55, s5 + 2.7, s5 + 2.85)): add(tick(1900 + k * 150), at, -0.4 + k * 0.25, -33)
need, use, pay = L[10]["at"], L[10]["pauses"][1][1], L[10]["pauses"][2][1]
add(tone(440, 0.6, rel=0.2), need + 0.95, -0.2, -28)          # request arrives at the business
add(tone(554.4, 0.6, rel=0.2), use + 0.75, 0.3, -28)          # the workflow takes it
add(tone(659.3, 0.6, rel=0.2), use + 1.65, 0.0, -28)          # the person completes it
for f, d in ((880, 0), (1108.7, 0.03), (1318.5, 0.06)): add(tone(f, 1.6, rel=0.7, partials=((1, 1), (2.76, 0.12))), pay + 0.2 + d, 0.0, -29)   # delivered
add(tick(3200, 0.05), pay + 1.15, -0.3, -30)                  # paid
add(whoosh(1.8, 250, 900), L[11]["at"] - 0.1, 0.0, -36)       # pull back to the distinction
# ---- 7 Quiet Bands ----
end = 48.0; add(whoosh(1.2, 200, 1500), end, 0.0, -34)
sub = np.arange(int(1.2 * SR)) / SR; add(np.sin(2 * np.pi * 48 * sub) * np.exp(-sub / 0.35) * np.minimum(1, sub / 0.01), end + 1.2, 0, -26)
add(tone(880, 2.2, rel=1.0, partials=((1, 1), (2.76, 0.1), (5.4, 0.04))), end + 1.25, 0, -33)
add(tick(2600, 0.04), L[12]["pauses"][0][1], 0, -34)

out = np.clip(out * db(3), -1, 1)   # +3 dB after the first mix check (cues were too shy to register)
with wave.open("sfx.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype("<i2").tobytes())
print("sfx.wav", DUR, "s, peak", round(20 * np.log10(np.abs(out).max() + 1e-9), 1), "dBFS")
