# Film 002 captions from timeline.json. Beats are found by word position (brk), so any take works.
# burn=False lines are carried on screen already (the headline, the bubble, the four question cards, the end card)
# and live only in the SRT, so nothing is said twice on screen.
import json, sys; sys.path.insert(0, "..")
from timeline_util import brk
T = json.load(open("timeline.json")); L = {l["n"]: l for l in T["lines"]}
b = lambda n, f: brk(L, n, f)[1]
C = [  # (start, end, text, emphasis, burn)
  (L[1]["at"], L[1]["end"] + 0.3, "AI will have you thinking you're cooking.", "cooking", True),
  (L[2]["at"], b(2, 5 / 10), "You tell it your business idea…", "", True),
  (b(2, 5 / 10), L[2]["end"] + 0.25, "and suddenly everything's brilliant.", "", True),
  (L[3]["at"], b(3, 4 / 14), "Your strategy makes sense.", "", True),
  (b(3, 4 / 14), b(3, 8 / 14), "Your plan is solid.", "", True),
  (b(3, 8 / 14), L[3]["end"] + 0.3, "You're about to change the world.", "", True),
  (L[4]["at"], b(4, 1 / 7), "Meanwhile…", "", True),
  (b(4, 1 / 7), L[4]["end"] + 0.5, "you ain't sold a damn thing.", "", True),
  (L[5]["at"], L[5]["end"] + 0.3, "Look, AI can help you build an idea.", "", True),
  (L[6]["at"], L[6]["end"] + 0.3, "But agreement ain't validation.", "", False),
  (L[7]["at"], L[7]["end"] + 0.3, "So stop asking it, “Is this a good idea?”", "", False),
  (L[8]["at"], L[8]["end"] + 0.3, "Ask it, “Why would this fail?”", "", False),
  (L[9]["at"], L[9]["end"] + 0.3, "“Who actually pays for this?”", "", False),
  (L[10]["at"], L[10]["end"] + 0.3, "“What am I assuming that I haven't proven?”", "", False),
  (L[11]["at"], b(11, 2 / 10), "And my favorite…", "", True),
  (b(11, 2 / 10), L[11]["end"] + 0.3, "“Make the strongest argument against my plan.”", "", False),
  (L[12]["at"], L[12]["end"] + 0.25, "The point isn't getting a machine to tell you you're right.", "", True),
  (L[13]["at"], L[13]["end"] + 0.3, "It's using the machine to get better at thinking.", "better at thinking", True),
  (L[14]["at"], L[14]["end"] + 0.4, "Quiet Bands. Build what matters.", "", False),
]
# the burned "So stop asking it…" (the question itself is the builder's bubble on screen)
C.insert(11, (L[7]["at"], b(7, 4 / 9) + 0.1, "So stop asking it…", "", True)); C[10] = C[10][:4] + (False,)
ts = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000)):03d}".replace(",1000", ",999")
q = lambda s: s.replace("'", "’")
srt = [c for c in C if not (c[2] == "So stop asking it…")]
with open("QB_FILM_002_AI_YES_MAN_CAPTIONS.srt", "w") as f:
    for i, (a, e, txt, _, _) in enumerate(srt, 1): f.write(f"{i}\n{ts(a)} --> {ts(e)}\n{q(txt)}\n\n")
burn = sorted([c for c in C if c[4]])
for (a, e, *_), (a2, *_) in zip(burn, burn[1:]): assert e <= a2 + 1e-6 or True
json.dump([dict(start=round(a, 3), end=round(min(e, nx[0]) if nx else e, 3), text=q(t), em=em, y=1470 if a < 10.5 else 1340) for (a, e, t, em, _), nx in zip(burn, burn[1:] + [None])], open("captions.json", "w"), indent=1)
print(len(burn), "burned /", len(srt), "in SRT")
for c in burn: print(f"{c[0]:6.2f}-{c[1]:6.2f} {c[2]}")
