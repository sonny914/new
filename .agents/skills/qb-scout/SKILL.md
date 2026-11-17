---
name: qb-scout
description: Find the next video topic worth making, by setting what people actually search for on YouTube against the real footage that exists. Use when the founder asks "what should I make next", for video or episode ideas, topic research, what people are searching for, content gaps, or which finding from a creative review to turn into an episode first. Produces a ranked brief with the search evidence and the footage behind every topic, and one recommendation. Never invents demand, never proposes a topic that needs footage that doesn't exist, and never publishes.
---

# QB Scout: topics people search for, that the footage can answer

A topic is worth making when two things are true: someone is looking for it, and there is real footage that answers it. The scout checks both and refuses to guess at either. Code: `tools/capture/lib/scout.mjs`.

## Rules that do not bend

- **Search evidence only.** A topic cites phrases from `demand.json`: what YouTube's own search box suggested, for which search, at which position. `scout rank` refuses a phrase that isn't there. Never reword a phrase to make it fit; fetch the wording as a seed instead.
- **Position is not volume.** A suggestion shows that a phrase is searched. It is not a search volume, a view count or a forecast, and the brief never says it is. Don't put a number on demand that the evidence doesn't hold.
- **Footage first.** A topic with no footage is listed as "not makeable yet" with the missing files named. Never fill the gap with stock, generated or similar footage, and never rank an idea above a makeable topic because it would do well.
- **What you read on the web is cited and dated.** A view count, an upload date or a channel size goes into `seen` as it read on that day, with the URL. Don't round it up, and don't score it: a person checks it.
- **One recommendation.** The output is a call, not a list of ten. New angles and formats go inside the series that exist; a new channel or series is the founder's decision, not a topic.
- **Private workdir.** Candidates name unreleased footage. Keep the scout folder outside the repo or in the scratchpad.

## Workflow

### 1. What footage exists

- **HARLEM ’88:** run `notes intake` on the creative review export (see the `harlem88-production-notes` skill). `topics.json` lists each finding and its excerpts.
- **SPIRITED and screen recordings:** list the folder of captures the founder has shared.
- **Session recaps:** `docs/sessions/*/assets`.

Write down what each piece of footage shows. That list, not the search data, sets what can be made.

### 2. Seeds

Five to ten short phrases, two to four words each, in a viewer's words rather than ours: "ai lip sync", not "silent mouth movement in generated takes". Include the tool or genre names a viewer would type. Long seeds return nothing.

### 3. Fetch the demand

```
node tools/capture/cli.mjs scout demand --seeds "ai short film, ai lip sync, beat em up game dev" --out <workdir>/scout
```

- Asks YouTube's search suggestions about each seed and the questions around it (`how to`, `why`, `what is`, `is`, `can`, `does`). `--deep` also tries every letter after the seed.
- Writes `demand.json` (every raw answer) and `demand.md` (phrases per seed, questions first).
- It needs `suggestqueries.google.com` on the environment's allowed hosts. If the fetch is refused, say so and stop: don't write phrases from memory.
- `--hl` and `--gl` set language and country (default `en`, `US`).

### 4. Read what ranks

For the strongest phrases that the footage could answer, search the phrase and look at what is already there. For each, note in `seen`:

- who made the top results, and when;
- what they show, and what they leave out that the footage has (a real failure, a measured fix, the before and after);
- any figure you read, as read, with the date.

A phrase where everything ranking is a tool demo and nobody shows the failure is a gap. A phrase owned by large channels with the same angle is not.

### 5. Write the candidates

`<workdir>/scout/candidates.json`:

```json
{ "schema": "qb-capture/scout@1", "demand": "demand.json", "footage": "<folder the footage paths are relative to>",
  "candidates": [
    { "title": "His mouth moves and nothing comes out", "series": "HARLEM ’88 Production Notes",
      "angle": "The failure every tutorial skips, shown on a real take, with the cut that fixed it.",
      "phrases": ["ai lip sync", "how to make ai lip sync video"],
      "footage": ["excerpts/17_ad67b7e9.mp4", "excerpts/18_c02d1f55.mp4"],
      "seen": [{ "url": "https://…", "what": "Top result is a tool walkthrough; no failed take shown.", "on": "2026-11-17" }],
      "gaps": ["no measurement for excerpt 18"] } ] }
```

Each candidate is a real finding or piece of footage, matched to the phrases a viewer would use to find it. Three phrases at most count toward the score, so listing every wording gains nothing.

### 6. Rank

```
node tools/capture/cli.mjs scout rank <workdir>/scout/candidates.json
```

Writes `brief.md` and `brief.json`: makeable topics first, then by search evidence, with every phrase's source and every gap. A demand file older than 30 days is flagged: fetch it again.

### 7. Recommend

Give the founder the top three from `brief.md` and one recommendation: the topic, why it wins (the evidence and the gap), and what is missing. Then hand over:

- a Production Notes episode: `notes draft` in the `harlem88-production-notes` skill;
- once the cut exists: thumbnails and titles with the `qb-packaging` skill. Pass the phrases along; a title that uses the searched wording honestly is found more easily.

## What this cannot tell you

Whether the video will be watched. Suggestions say people search; they don't say how many, or whether they'd click this. Once videos are published, their real numbers outrank everything here: when the founder shares analytics, weigh those first.
