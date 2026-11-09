# Caption chunks from timeline.json (measured narration). "burn" = shown on screen; the rest are carried by
# designed type (title, headlines, logo) and live only in the SRT, so nothing is said twice on screen.
import json
T = json.load(open("timeline.json")); L = {l["n"]: l for l in T["lines"]}
import sys; sys.path.insert(0, ".."); from timeline_util import brk
b = lambda n, f, k: brk(L, n, f)[k]   # the pause nearest a word position (robust to how many pauses a take has)
C = [
  # (start, end, text, emphasis, burn)
  (L[1]["at"], L[1]["end"] + 0.2, "Everybody can build now.", "", False),
  (L[2]["at"], b(2, 4 / 8, 1), "An app. A website.", "", True),
  (b(2, 4 / 8, 1), L[2]["end"] + 0.25, "A whole business idea.", "", True),
  (L[3]["at"], b(3, 7 / 13, 1), "Stuff that used to take a whole team?", "", True),
  (b(3, 7 / 13, 1), L[3]["end"] + 0.25, "One person and a prompt.", "", True),
  (L[4]["at"], L[4]["end"] + 0.25, "And that's wild, when you really sit with it.", "", True),
  (L[5]["at"], L[5]["end"] + 0.2, "But here's the part nobody wants to talk about.", "", True),
  (L[6]["at"], b(6, 4 / 9, 1), "If everybody can build…", "", True),
  (b(6, 4 / 9, 1), L[6]["end"] + 0.2, "building ain't the advantage anymore.", "", False),
  (L[7]["at"], b(7, 7 / 13, 1), "Nobody cares how fast you made it", "", True),
  (b(7, 7 / 13, 1), L[7]["end"] + 0.25, "if it doesn't solve a problem.", "", True),
  (L[8]["at"], L[8]["end"] + 0.25, "So the question isn't, “what can you create?”", "", True),
  (L[9]["at"], L[9]["end"] + 0.3, "It's, “what can you make work?”", "make work", True),
  (L[10]["at"], b(10, 3 / 11, 1), "Something people need.", "", True),
  (b(10, 3 / 11, 1), b(10, 7 / 11, 1), "Something they actually use.", "", True),
  (b(10, 7 / 11, 1), L[10]["end"] + 0.3, "Something worth paying for.", "worth paying for", True),
  (L[11]["at"], b(11, 6 / 12, 1), "AI changed who gets to build.", "", False),
  (b(11, 6 / 12, 1), L[11]["end"] + 0.2, "It didn't change why people buy.", "", False),
  (L[12]["at"], b(12, 2 / 5, 0) + 0.3, "Quiet Bands.", "", False),
  (b(12, 2 / 5, 1), L[12]["end"] + 0.4, "Build what matters.", "", False),
]
ts = lambda x: f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round((x%1)*1000)):03d}".replace(",1000", ",999")
with open("everybody-can-build.srt", "w") as f:
    for i, (a, b, txt, _, _) in enumerate(C, 1): f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{txt.replace(chr(39), '’')}\n\n")
# while the opening's lockup is still on screen (until 7.45 s) captions sit higher, clear of the logo
json.dump([dict(start=round(a, 3), end=round(b, 3), text=t.replace("'", "’"), em=e, y=1290 if a < 7.45 else 1340) for a, b, t, e, burn in C if burn], open("captions.json", "w"), indent=1)
print(sum(1 for c in C if c[4]), "burned /", len(C), "in SRT")
