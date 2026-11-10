# Film 003 captions from timeline.json. Beats are found by word position (brk), so any take works.
# burn=False lines are already said on screen (the counters, ACTIVITY ≠ INCOME, the two questions and the fork's
# labels, the end card) and live only in the SRT, so nothing is said twice.
import json, sys; sys.path.insert(0, "..")
from timeline_util import brk
T = json.load(open("timeline.json")); L = {l["n"]: l for l in T["lines"]}
b = lambda n, f: brk(L, n, f)[1]
e = lambda n, pad=0.3: L[n]["end"] + pad
C = [  # (start, end, text, emphasis, burn)
  (L[1]["at"], e(1), "Everybody’s chasing money.", "money", True),
  (L[2]["at"], b(2, 3 / 15), "The next hustle.", "", True),
  (b(2, 3 / 15), b(2, 6 / 15), "The next app.", "", True),
  (b(2, 6 / 15), e(2), "The next thing that’s supposed to make you rich.", "", True),
  (L[3]["at"], b(3, 4 / 10), "And I get it.", "", True),
  (b(3, 4 / 10), e(3), "Bills don’t care about your passion.", "", True),
  (L[4]["at"], e(4), "But here’s where we mess up.", "", True),
  (L[5]["at"], e(5), "You can build ten apps. Launch five businesses. Automate your whole life…", "", False),
  (L[6]["at"], e(6, 0.6), "…and still be broke.", "", True),
  (L[7]["at"], e(7), "Because activity ain’t income.", "", False),
  (L[8]["at"], e(8), "And attention ain’t a business model.", "", True),
  (L[9]["at"], b(9, 10 / 19), "We get so focused on how to get the money…", "", True),
  (b(9, 10 / 19), e(9), "we stop asking why anybody would give it to us.", "give", True),
  (L[10]["at"], e(10, 0.5), "Think about that.", "", True),
  (L[11]["at"], e(11), "Money moves when somebody sees enough value to trade something for it.", "value", True),
  (L[12]["at"], e(12), "So instead of asking AI, “How do I make ten thousand dollars?”", "", False),
  (L[13]["at"], e(13), "Ask it, “What problem can I solve that’s worth ten thousand dollars?”", "", False),
  (L[14]["at"], e(14), "Then ask who has that problem.", "", False),
  (L[15]["at"], e(15), "How they’re solving it right now.", "", False),
  (L[16]["at"], e(16), "And why they’d pay you to fix it.", "", False),
  (L[17]["at"], e(17), "Stop chasing the money long enough to understand what makes it move.", "what makes it move", True),
  (L[18]["at"], e(18, 0.5), "Quiet Bands. Build what matters.", "", False),
]
ts = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000)):03d}".replace(",1000", ",999")
with open("QB_FILM_003_MONEY_CHASE_CAPTIONS.srt", "w") as f:
    for i, (a, z, txt, _, _) in enumerate(C, 1): f.write(f"{i}\n{ts(a)} --> {ts(z)}\n{txt}\n\n")
burn = [c for c in C if c[4]]
json.dump([dict(start=round(a, 3), end=round(min(z, nx[0]) if nx else z, 3), text=t, em=em, y=1340) for (a, z, t, em, _), nx in zip(burn, burn[1:] + [None])], open("captions.json", "w"), indent=1)
print(len(burn), "burned /", len(C), "in SRT")
