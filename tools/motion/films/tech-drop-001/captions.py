# TECH DROP 001 captions from timeline.json (beats by word position, so real takes re-time everything).
# burn=False lines are already on screen as designed type (the headlines, the speed claim, the end card).
import json, sys; sys.path.insert(0, "..")
from timeline_util import brk
T = json.load(open("timeline.json")); L = {l["n"]: l for l in T["lines"]}
b = lambda n, f: brk(L, n, f)[1]; e = lambda n, pad=0.25: L[n]["end"] + pad
C = [
  (L[1]["at"], e(1), "Claude Code just got a pretty serious upgrade.", "", False),
  (L[2]["at"], b(2, 6 / 13), "Everybody’s talking about Fable 5.2.", "", True),
  (b(2, 6 / 13), e(2), "Up to thirty percent faster than 5.1.", "", False),
  (L[3]["at"], e(3), "Cool. But that’s not the headline.", "", True),
  (L[4]["at"], e(4), "Claude can now help set up its own cloud environment.", "", False),
  (L[5]["at"], e(5), "Missing a dependency? It can find it.", "find it", True),
  (L[6]["at"], e(6), "Network access? It asks for your approval.", "your approval", True),
  (L[7]["at"], e(7), "API key? You enter it securely, outside the chat.", "outside the chat", True),
  (L[8]["at"], e(8), "/usage shows what’s eating your usage, and how to fix it.", "", True),
  (L[9]["at"], e(9), "/storage clears out old worktrees and sessions.", "", True),
  (L[10]["at"], e(10), "Ultrathink is back. Extra reasoning, for one turn.", "", True),
  (L[11]["at"], e(11), "I’m still using Opus for most of my coding.", "", True),
  (L[12]["at"], e(12), "But Fable for bigger, open-ended problems? Worth testing.", "", True),
  (L[13]["at"], e(13), "Your session keeps running in the cloud. Pick it up from another device.", "", True),
  (L[14]["at"], e(14), "The real shift? AI handling more of the work between the idea and the finished product.", "", True),
  (L[15]["at"], e(15, 0.5), "Quiet Bands. Build what matters.", "", False),
]
ts = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000)):03d}".replace(",1000", ",999")
srt = [c for c in C if c[2] != "Up to thirty percent faster than 5.1."]
srt[1] = (L[2]["at"], e(2), "Everybody’s talking about Fable 5.2. Up to thirty percent faster than 5.1.", "", True)
with open("QB_TECH_DROP_001_CAPTIONS.srt", "w") as f:
    for i, (a, z, txt, _, _) in enumerate(srt, 1): f.write(f"{i}\n{ts(a)} --> {ts(z)}\n{txt}\n\n")
burn = [c for c in C if c[4]]
json.dump([dict(start=round(a, 3), end=round(min(z, nx[0]) if nx else z, 3), text=t, em=em, y=1420) for (a, z, t, em, _), nx in zip(burn, burn[1:] + [None])], open("captions.json", "w"), indent=1)
print(len(burn), "burned /", len(srt), "in SRT", "(provisional timing for lines", T.get("provisional"), ")")
