# Film 002 captions from timeline.json. burn=False lines are carried by designed type (the headline, the four
# question cards, the end card) and live only in the SRT, so nothing is said twice on screen.
import json
T = json.load(open("timeline.json")); L = {l["n"]: l for l in T["lines"]}
p = lambda n, i, k: L[n]["pauses"][i][k]
C = [  # (start, end, text, emphasis, burn)
  (L[1]["at"], L[1]["end"] + 0.3, "AI will have you thinking you're cooking.", "cooking", True),
  (L[2]["at"], p(2, 1, 1), "You tell it your business idea…", "", True),
  (p(2, 1, 1), L[2]["end"] + 0.25, "and suddenly everything's brilliant.", "", True),
  (L[3]["at"], p(3, 1, 1), "Your strategy makes sense.", "", True),
  (p(3, 1, 1), p(3, 2, 1), "Your plan is solid.", "", True),
  (p(3, 2, 1), L[3]["end"] + 0.3, "You're about to change the world.", "", True),
  (L[4]["at"], p(4, 0, 1), "Meanwhile…", "", True),
  (p(4, 0, 1), L[4]["end"] + 0.5, "you ain't sold a damn thing.", "", True),
  (L[5]["at"], L[5]["end"] + 0.3, "Look, AI can help you build an idea.", "", True),
  (L[6]["at"], L[6]["end"] + 0.3, "But agreement ain't validation.", "", False),
  (L[7]["at"], L[7]["end"] + 0.3, "So stop asking it, “Is this a good idea?”", "", True),
  (L[8]["at"], L[8]["end"] + 0.3, "Ask it, “Why would this fail?”", "", False),
  (L[9]["at"], L[9]["end"] + 0.3, "“Who actually pays for this?”", "", False),
  (L[10]["at"], L[10]["end"] + 0.3, "“What am I assuming that I haven't proven?”", "", False),
  (L[11]["at"], p(11, 0, 1), "And my favorite…", "", True),
  (p(11, 0, 1), L[11]["end"] + 0.3, "“Make the strongest argument against my plan.”", "", False),
  (L[12]["at"], L[12]["end"] + 0.25, "The point isn't getting a machine to tell you you're right.", "", True),
  (L[13]["at"], L[13]["end"] + 0.3, "It's using the machine to get better at thinking.", "better at thinking", True),
  (L[14]["at"], p(14, 0, 0) + 0.15, "Quiet Bands.", "", False),
  (p(14, 0, 1), L[14]["end"] + 0.4, "Build what matters.", "", False),
]
ts = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000)):03d}".replace(",1000", ",999")
q = lambda s: s.replace("'", "’")
with open("QB_FILM_002_AI_YES_MAN_CAPTIONS.srt", "w") as f:
    for i, (a, b, txt, _, _) in enumerate(C, 1): f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{q(txt)}\n\n")
json.dump([dict(start=round(a, 3), end=round(b, 3), text=q(t), em=e, y=1340) for a, b, t, e, burn in C if burn], open("captions.json", "w"), indent=1)
print(sum(1 for c in C if c[4]), "burned /", len(C), "in SRT")
