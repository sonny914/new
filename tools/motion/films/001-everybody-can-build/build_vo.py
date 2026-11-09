# Builds narration.wav and timeline.json from the Flighty takes in vo/.
# Each take is trimmed to its measured speech (silencedetect -42 dB), gain-matched to -18 LUFS,
# and placed after a designed gap. Animation and captions both read timeline.json, so picture
# is cut to the real voice, not the voice to a guessed picture.
import json, re, subprocess
START = 0.60                     # first word, over the opening title
GAPS = [None, 0.70, 0.50, 0.45, 0.90, 0.45, 0.60, 0.80, 0.35, 0.70, 0.90, 0.90]  # silence before line n (n>1)
TAIL = 3.35                      # hold after the last word (logo)
lines = []
for n in range(1, 13):
    f = f"vo/{n:02d}.wav"
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
    log = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=noise=-42dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    ev = [(k, float(v)) for k, v in re.findall(r"silence_(start|end): ([0-9.]+)", log)]
    s0 = ev[0][1] if ev and ev[0] == ("start", 0.0) and len(ev) > 1 else 0.0
    if ev and ev[0][0] == "start" and ev[0][1] == 0.0: s0 = ev[1][1]
    s1 = ev[-1][1] if ev and ev[-1][0] == "start" else dur
    pauses = [(ev[i][1], ev[i + 1][1]) for i in range(len(ev) - 1) if ev[i][0] == "start" and ev[i][1] > s0 and ev[i + 1][0] == "end" and ev[i + 1][1] < s1]
    lufs = float(re.findall(r"I:\s+(-?[0-9.]+) LUFS", subprocess.run(["ffmpeg", "-i", f, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr)[-1])
    lines.append(dict(n=n, file=f, s0=max(0, s0 - 0.04), s1=min(dur, s1 + 0.08), pauses=pauses, lufs=lufs))
t = START
for i, L in enumerate(lines):
    if i: t += GAPS[i]
    L["at"] = round(t, 3); L["len"] = round(L["s1"] - L["s0"], 3); L["end"] = round(t + L["len"], 3)
    L["pauses"] = [[round(L["at"] + a - L["s0"], 3), round(L["at"] + b - L["s0"], 3)] for a, b in L["pauses"]]
    t = L["end"]
total = round(t + TAIL, 3)
# render: trim, gain to -18 LUFS, delay into place, mix (48 kHz stereo)
inputs, chains = [], []
for i, L in enumerate(lines):
    inputs += ["-i", L["file"]]
    g = -18 - L["lufs"]
    chains.append(f"[{i}:a]atrim={L['s0']}:{L['s1']},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st={L['len'] - 0.06}:d=0.06,volume={g}dB,adelay={int(L['at'] * 1000)}|{int(L['at'] * 1000)}[v{i}]")
mix = "".join(f"[v{i}]" for i in range(len(lines))) + f"amix=inputs={len(lines)}:normalize=0,apad=whole_dur={total}[out]"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(chains) + ";" + mix, "-map", "[out]", "-ar", "48000", "-ac", "2", "-t", str(total), "narration.wav"], check=True)
json.dump(dict(total=total, lines=[{k: L[k] for k in ("n", "at", "end", "len", "pauses")} for L in lines]), open("timeline.json", "w"), indent=1)
print("total", total); [print(L["n"], L["at"], L["end"], L["pauses"]) for L in lines]
