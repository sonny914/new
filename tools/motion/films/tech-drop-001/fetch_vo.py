#!/usr/bin/env python3
# Fetch narration takes listed in vo_ids.json ({"2": "<result url>", ...}), cut the throwaway "Alright." at the pause
# before it, and verify each line (ends in silence, plausible words/second). Lines already cut are left alone.
import json, re, subprocess, urllib.request, os
from lines import LINES
def segments(f):
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
    log = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=noise=-40dB:d=0.16", "-f", "null", "-"], capture_output=True, text=True).stderr
    ev = [(k, float(v)) for k, v in re.findall(r"silence_(start|end): ([0-9.]+)", log)]; sil, cur = [], None
    for k, v in ev:
        if k == "start": cur = v
        else: sil.append((cur, v)); cur = None
    if cur is not None: sil.append((cur, dur))
    segs, t = [], 0.0
    for a, b in sil:
        if a > t + 0.01: segs.append((t, a))
        t = b
    if t < dur - 0.01: segs.append((t, dur))
    return segs
ids = json.load(open("vo_ids.json")) if os.path.exists("vo_ids.json") else {}
bad = 0
for k, url in sorted(ids.items(), key=lambda x: int(x[0])):
    n = int(k); raw, out = f"vo/raw-{n:02d}.wav", f"vo/{n:02d}.wav"
    if os.path.exists(out): continue
    if not os.path.exists(raw): urllib.request.urlretrieve(url, raw)
    segs = segments(raw); words = len(LINES[n - 1].replace("/", "slash ").split())
    last = segs[-1]; gap = last[0] - segs[-2][1] if len(segs) > 1 else 0
    if not (len(segs) > 1 and last[1] - last[0] <= 0.8 and gap >= 0.2): bad += 1; print(f"{n:02d} NO TAIL {[(round(a,2),round(b,2)) for a,b in segs]}  (cut by hand)"); continue
    end = min(segs[-2][1] + 0.16, last[0] - 0.05)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-t", f"{end:.3f}", "-c:a", "pcm_s16le", out], check=True)
    wps = words / (segs[-2][1] - segs[0][0]); ok = 1.6 <= wps <= 4.4; bad += not ok
    print(f"{n:02d} {words:2d} words {wps:3.1f} w/s {'ok' if ok else 'CHECK RATE'}")
print("problems:", bad)
