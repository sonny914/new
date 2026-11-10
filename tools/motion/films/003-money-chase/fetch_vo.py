#!/usr/bin/env python3
# Fetch the "<line> Alright." takes (Flighty voice), cut the throwaway last word at the pause before it, verify each line.
import re, subprocess, urllib.request, os, sys
B = "https://d8j0ntlcm91z4.cloudfront.net/user_3JmSJylII1Rwwc3uXrm5CkcuSQk/hf_20261110_"
LINES = ["Everybody's chasing money.", "The next hustle. The next app. The next thing that's supposed to make you rich.", "And I get it. Bills don't care about your passion.",
  "But here's where we mess up.", "You can build ten apps. Launch five businesses. Automate your whole life.", "And still be broke.", "Because activity ain't income.",
  "And attention ain't a business model.", "We get so focused on how to get the money, we stop asking why anybody would give it to us.", "Think about that.",
  "Money moves when somebody sees enough value to trade something for it.", "So instead of asking AI, how do I make ten thousand dollars?",
  "Ask it, what problem can I solve that's worth ten thousand dollars?", "Then ask who has that problem.", "How they're solving it right now.", "And why they'd pay you to fix it.",
  "Stop chasing the money long enough to understand what makes it move."]
SRC = {1: "125113_2807ac12-f8f3-43ec-87a5-ce854de62250", 2: "125157_a785a9b8-4e80-46b6-afc1-9bad7f15b5db", 3: "125113_cbe2cca1-2ee0-47c3-adfb-6d0a3a7fdaa1",
  4: "125113_82cbb1fb-ce5e-460f-9b1f-d94d0ba528d9", 5: "125157_4b0906b9-e3f2-4caf-a287-ec9eda4ebaf1", 6: "125113_3b7a3394-dd14-434d-b87f-fb8cd27acdcd",
  7: "125113_a4ebf17c-8196-4075-bf12-987666b3ebc7", 8: "125113_ec191e5b-4ed3-4c98-99ee-8755bec938d7", 9: "125113_4ca3b875-910f-433c-8220-851df5cb102e",
  10: "125113_97c58d0e-6e8e-4fc2-a354-8014d435771d", 11: "125113_36dc6f1f-9ef5-45a2-a2f6-cfb1944ddab8", 12: "125157_3ed300da-30b3-416d-a6d9-99165946e4cd",
  13: "125213_e65bfd73-a6a3-4c36-94c5-5928c9430550", 14: "125213_b6b85083-6d1d-43fa-9060-85d8ca1989fa", 15: "125215_a53e7feb-f2ae-4497-a9f6-bde030708070",
  16: "125239_622ae48e-ef28-4bf2-a994-7cbcd6d2a1ba", 17: "125238_dfe009f0-0f07-4c95-9a61-22c1c1ee787b"}
def segments(f):
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
    log = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=noise=-45dB:d=0.18", "-f", "null", "-"], capture_output=True, text=True).stderr
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
bad = 0
for n, rid in SRC.items():
    if not rid: print(f"{n:02d}  MISSING"); bad += 1; continue
    raw = f"vo/raw-{n:02d}.wav"
    if not os.path.exists(raw): urllib.request.urlretrieve(B + rid + ".wav", raw)
    segs = segments(raw); words = len(LINES[n - 1].split())
    last = segs[-1]; gap = last[0] - segs[-2][1] if len(segs) > 1 else 0
    if not (len(segs) > 1 and (last[1] - last[0]) <= 0.8 and gap >= 0.25): bad += 1; print(f"{n:02d}  NO TAIL  {[(round(a,2),round(b,2)) for a,b in segs]}"); continue
    end = min(segs[-2][1] + 0.18, last[0] - 0.05)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-t", f"{end:.3f}", "-c:a", "pcm_s16le", f"vo/{n:02d}.wav"], check=True)
    wps = words / (segs[-2][1] - segs[0][0]); ok = 1.6 <= wps <= 4.2; bad += not ok
    print(f"{n:02d}  {words:2d} words  {wps:3.1f} w/s  {'ok' if ok else 'CHECK RATE'}  segs={len(segs)}")
print("problems:", bad)
