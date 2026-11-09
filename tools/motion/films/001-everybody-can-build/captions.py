# Caption chunks from timeline.json (measured narration). "burn" = shown on screen; the rest are carried by
# designed type (title, headlines, logo) and live only in the SRT, so nothing is said twice on screen.
import json
T = json.load(open("timeline.json")); L = {l["n"]: l for l in T["lines"]}
p = lambda n, i, k: L[n]["pauses"][i][k]
C = [
  # (start, end, text, emphasis, burn)
  (L[1]["at"], L[1]["end"] + 0.2, "Everybody can build now.", "", False),
  (L[2]["at"], p(2, 2, 1), "An app. A website.", "", True),
  (p(2, 2, 1), L[2]["end"] + 0.25, "A whole business idea.", "", True),
  (L[3]["at"], p(3, 0, 1), "Stuff that used to take a whole team?", "", True),
  (p(3, 0, 1), L[3]["end"] + 0.25, "One person and a prompt.", "", True),
  (L[4]["at"], L[4]["end"] + 0.25, "And that's wild, when you really sit with it.", "", True),
  (L[5]["at"], L[5]["end"] + 0.2, "But here's the part nobody wants to talk about.", "", True),
  (L[6]["at"], p(6, 0, 1), "If everybody can build…", "", True),
  (p(6, 0, 1), L[6]["end"] + 0.2, "building ain't the advantage anymore.", "", False),
  (L[7]["at"], p(7, 0, 1), "Nobody cares how fast you made it", "", True),
  (p(7, 0, 1), L[7]["end"] + 0.25, "if it doesn't solve a problem.", "", True),
  (L[8]["at"], L[8]["end"] + 0.25, "So the question isn't, “what can you create?”", "", True),
  (L[9]["at"], L[9]["end"] + 0.3, "It's, “what can you make work?”", "make work", True),
  (L[10]["at"], p(10, 1, 1), "Something people need.", "", True),
  (p(10, 1, 1), p(10, 2, 1), "Something they actually use.", "", True),
  (p(10, 2, 1), L[10]["end"] + 0.3, "Something worth paying for.", "worth paying for", True),
  (L[11]["at"], p(11, 0, 1), "AI changed who gets to build.", "", False),
  (p(11, 0, 1), L[11]["end"] + 0.2, "It didn't change why people buy.", "", False),
  (L[12]["at"], p(12, 0, 0) + 0.3, "Quiet Bands.", "", False),
  (p(12, 0, 1), L[12]["end"] + 0.4, "Build what matters.", "", False),
]
ts = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000)):03d}".replace(",1000", ",999")
with open("everybody-can-build.srt", "w") as f:
    for i, (a, b, txt, _, _) in enumerate(C, 1): f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{txt.replace(chr(39), '’')}\n\n")
json.dump([dict(start=round(a, 3), end=round(b, 3), text=t.replace("'", "’"), em=e) for a, b, t, e, burn in C if burn], open("captions.json", "w"), indent=1)
print(sum(1 for c in C if c[4]), "burned /", len(C), "in SRT")
