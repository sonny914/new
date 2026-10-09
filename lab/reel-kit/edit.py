"""Jump-cut edit list for a reel: keeps every word, trims the pauses between them.

  python3 edit.py words.json <out dir> [--start 0.05] [--gap 0.2] [--over 0.3] [--hold I=SEC ...] [--end SEC]

A pause longer than --over seconds is cut down to --gap (or to SEC for --hold I=SEC, the pause after
word I, for a beat you want to keep). Cuts land in the silence: 60 % of the kept pause after the last
word, 40 % before the next. --end holds the picture after the last word (graphics, final frame).
Writes edit.json (for sfx.Reel) and edit.js (window.EDIT, for kit.js): segments in recording time,
duration, and every word with its output time (os/oe), which is the clock compositions cue on.
"""
import argparse, json
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('words'); ap.add_argument('out')
ap.add_argument('--start', type=float, default=0.05); ap.add_argument('--gap', type=float, default=0.2)
ap.add_argument('--over', type=float, default=0.3); ap.add_argument('--hold', action='append', default=[])
ap.add_argument('--end', type=float, default=0.0); ap.add_argument('--src-end', type=float, default=None)
a = ap.parse_args()
W = json.load(open(a.words)); holds = {int(k): float(v) for k, v in (h.split('=') for h in a.hold)}

segs, s0 = [], min(a.start, W[0]['s'])
for i in range(len(W) - 1):
    pause = W[i + 1]['s'] - W[i]['e']; keep = holds.get(i, a.gap)
    if pause > max(a.over, keep):
        segs.append([s0, W[i]['e'] + 0.6 * keep]); s0 = W[i + 1]['s'] - 0.4 * keep
last = W[-1]['e'] + 0.12
segs.append([s0, min(a.src_end or last, last)])
segs = [[round(x, 3), round(y, 3)] for x, y in segs]

def to_out(t):
    acc = 0.0
    for s, e in segs:
        if t < s: return acc
        if t <= e: return acc + t - s
        acc += e - s
    return acc

speech = sum(e - s for s, e in segs)
edit = {'segments': segs, 'speech': round(speech, 3), 'duration': round(speech + a.end, 3),
        'cuts': [round(to_out(s), 3) for s, _ in segs[1:]],
        'words': [dict(w, os=round(to_out(w['s']), 3), oe=round(to_out(w['e']), 3)) for w in W]}
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
(out / 'edit.json').write_text(json.dumps(edit, indent=1))
(out / 'edit.js').write_text('window.EDIT = ' + json.dumps(edit) + ';\n')
src = W[-1]['e'] - min(a.start, W[0]['s'])
print(f"{len(segs)} segments, {len(segs) - 1} cuts: speech {src:.2f} s → {speech:.2f} s, reel {edit['duration']:.2f} s")
