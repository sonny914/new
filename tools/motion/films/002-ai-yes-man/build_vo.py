# Film 002 narration: like Film 001's builder, plus pause compression. The voice model sometimes holds a
# "..." for 2-3 s; internal pauses longer than MAXP (per line) are shortened by cutting silence from their
# middle (10 ms fades at each cut). Speech is never cut. Writes narration.wav + timeline.json.
import json, re, subprocess
START = 0.35
GAPS = [None, 0.55, 0.45, 0.95, 1.35, 0.40, 1.10, 0.55, 0.85, 0.85, 0.85, 1.00, 0.40, 1.00]
MAXP = {4: 1.0}; DEFAULT_MAXP = 0.75   # line 4 keeps its comic beat after "Meanwhile..."
TAIL = 3.4
def probe(f):
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
    log = subprocess.run(["ffmpeg", "-i", f, "-af", "silencedetect=noise=-42dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    ev = [(k, float(v)) for k, v in re.findall(r"silence_(start|end): ([0-9.]+)", log)]
    s0 = ev[1][1] if ev and ev[0] == ("start", 0.0) and len(ev) > 1 else 0.0
    s1 = ev[-1][1] if ev and ev[-1][0] == "start" else dur
    pauses = [(ev[i][1], ev[i + 1][1]) for i in range(len(ev) - 1) if ev[i][0] == "start" and ev[i][1] > s0 and ev[i + 1][0] == "end" and ev[i + 1][1] < s1]
    lufs = float(re.findall(r"I:\s+(-?[0-9.]+) LUFS", subprocess.run(["ffmpeg", "-i", f, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr)[-1])
    return dur, max(0, s0 - 0.04), min(dur, s1 + 0.08), pauses, lufs
lines, inputs, chains, t = [], [], [], START
for n in range(1, len(GAPS) + 1):
    f = f"vo/{n:02d}.wav"; dur, s0, s1, pauses, lufs = probe(f)
    mp = MAXP.get(n, DEFAULT_MAXP)
    # keep-segments in source time: speech plus pauses capped at mp (cut from the middle of each long pause)
    keep, cur = [], s0
    for a, b in pauses:
        if b - a > mp: keep.append((cur, a + mp / 2)); cur = b - mp / 2   # keep the pause's two edges, drop its middle
    keep.append((cur, s1))
    out_t = lambda x: sum(min(x, kb) - ka for ka, kb in keep if x > ka)   # source time -> output time
    if n > 1: t += GAPS[n - 1]
    length = sum(b - a for a, b in keep)
    lines.append(dict(n=n, at=round(t, 3), end=round(t + length, 3), len=round(length, 3),
                      pauses=[[round(t + out_t(a), 3), round(t + out_t(b), 3)] for a, b in pauses]))
    i = len(inputs) // 2; inputs += ["-i", f]; g = -18 - lufs
    segs = "".join(f"[{i}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, b - a - 0.01)}:d=0.01[s{i}_{k}];" for k, (a, b) in enumerate(keep))
    chains.append(segs + "".join(f"[s{i}_{k}]" for k in range(len(keep))) + f"concat=n={len(keep)}:v=0:a=1,afade=t=in:d=0.03,afade=t=out:st={length - 0.06}:d=0.06,volume={g}dB,adelay={int(t * 1000)}|{int(t * 1000)}[v{i}]")
    t += length
total = round(t + TAIL, 3)
mix = "".join(f"[v{i}]" for i in range(len(lines))) + f"amix=inputs={len(lines)}:normalize=0,alimiter=limit=0.84:attack=2:release=60:level=disabled,apad=whole_dur={total}[out]"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(chains) + ";" + mix, "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", "-t", str(total), "narration.wav"], check=True)
json.dump(dict(total=total, lines=lines), open("timeline.json", "w"), indent=1)
print("total", total); [print(L["n"], L["at"], L["end"], L["pauses"]) for L in lines]
