# Time-warp between the narration Film 001 was choreographed to (timeline_v1.json) and the current one (timeline.json).
# Anchors: the splice at 5 s, every line start/end after it, and the beats the picture and sound key on.
import json, sys
sys.path.insert(0, '..'); from timeline_util import brk
BEATS = [(3, 7 / 13), (6, 4 / 9), (7, 7 / 13), (10, 3 / 11), (10, 7 / 11), (11, 6 / 12), (12, 2 / 5)]
def anchors():
    o, n = [json.load(open(f)) for f in ("timeline_v1.json", "timeline.json")]
    O, N = ({l["n"]: l for l in T["lines"]} for T in (o, n))
    pts = [(0.0, 0.0), (5.0, 5.0)]
    for k in O:
        for key in ("at", "end"):
            if O[k][key] > 5.05: pts.append((O[k][key], N[k][key]))
    for k, f in BEATS: pts.append(((brk(O, k, f)[1]), brk(N, k, f)[1]))
    pts.append((o["total"], n["total"]))
    pts = sorted(set(pts)); mono = all(b[0] > a[0] and b[1] > a[1] for a, b in zip(pts, pts[1:]))
    return pts, mono
if __name__ == "__main__":
    pts, mono = anchors(); json.dump(pts, open("warp.json", "w")); print(len(pts), "anchors, monotonic:", mono)
    for a, b in pts: print(f"  old {a:7.3f} -> new {b:7.3f}")
