---
name: harlem88-production-notes
description: Make HARLEM '88 Production Notes, the build-in-public series of short vertical episodes that show a real problem in the series' AI-generated footage, explain it, and show the real fix, with editorial motion graphics over the actual takes. Use whenever the founder asks for a Production Notes episode, an "episode" or "reel" about a mistake, fix or lesson from HARLEM '88 (formerly THE BLOCK) footage, hands over a creative review ZIP or export, asks what topics the footage supports, or wants captions, post copy, a silent preview or approval package for one. Also use when editing the Production Notes overlay library (tools/capture/stage/overlays.js). Never fabricates footage or fixes, never spends credits or publishes without an explicit yes.
---

# HARLEM '88: Production Notes

An episode is 30–45 s, 9:16, cut from the real footage: the problem as it was generated, why it happened or how it was caught, the edit or rule that fixed it, and whether the fix held. It runs on QB Capture's documentary mode (`tools/capture/`, `doc` command) with the Production Notes theme. Episode 01, *The silent mouth*, is the reference: its storyboard and notes are in `references/episode-01.md`.

## Rules that do not bend

- **Real footage, real fixes.** Only takes that were generated and edits that were made. Never generate, upscale, retime or composite footage into a "before" or "after" that did not exist. If a topic needs footage the export doesn't have, say which file is missing and stop. Don't substitute stock or a similar take.
- **Evidence on screen.** Every number on screen, including numbers in the burned-in subtitles, needs a `facts` entry. A measurement fact (`clip:summary.key`) is checked against the file. A `record:` fact cites the review or decision log, and a person checks it. `doc --check` refuses to render an uncited number. Never invent a source to get past it: change the words.
- **Faces stay clear.** Graphics never cover eyes or mouths. Type goes in the band the face isn't in. The stage measures the face per frame and picks it. Check every still before showing anything.
- **Money and publishing.** Narration in the founder's `flighty` voice costs credits: quote the price and wait for a yes. Final renders, posting and anything public each need their own yes. Silent previews are free and come first.
- **Brand.** Quiet Bands black `#000000`, cream `#F2EEE5`, orange `#FF5A00` (load the `qb-identity` skill). In Production Notes, orange means the fault being shown: mouth movement with no voice, the cut that removed it. Orange is also the subtitle emphasis. The HARLEM '88 identity (yellow, red, black) belongs to the series logo only. Use the approved logo file as the watermark; never typeset a stand-in. With no file, the preview shows an empty slot and the final render refuses.

## Workflow

### 1. Intake: a creative review export

```
node tools/capture/cli.mjs notes intake <review.zip|dir> --out <workdir>
```

- Unpacks safely: entries outside the folder are refused, symlinks are removed, and nothing in the export is executed.
- Hashes every file and probes the videos.
- Parses `creative-review.md` into findings and ranks them in `<workdir>/topics.md`.
- Ranking: footage of the problem is required. A measurement, a recorded change, a checked result, the founder's own words and a Verified label each make a topic stronger; a Subjective label makes it weaker.

Keep the workdir private: outside the repo, or in the scratchpad. Footage and the founder's notes are not repo content.

Read `topics.md` and recommend one topic to the founder, with the reason and the gaps. A finding with only stills (cards) and no excerpt is not makeable: say so and name the files that would make it.

### 2. Footage review

Before scripting, look at the takes yourself.

- **Contact sheet:**
  ```
  ffmpeg -i <take> -vf "select='not(mod(n\,12))',scale=240:-1,tile=11x1" -frames:v 1 sheet.jpg
  ```
- **Measure** every take that will carry overlays:
  - `tools/capture/analysis/mouth_sync.py <take> <outdir>` gives voice segments, mouth movement, silent movement and face boxes.
  - `tools/capture/analysis/track.py` gives the mouth and eye landmarks that the brackets and arrows follow.
  - Setup is in `tools/capture/analysis/README.md`. Run Python on export files with `-I`.
- **Pick the frames:**
  - the hook: the clearest frame of the fault (for the silent mouth, the widest silent opening);
  - the freeze;
  - the cut point the record names.
- Check the review's claims against the frames. Report anything that doesn't match rather than smoothing it over.

### 3. Script

```
node tools/capture/cli.mjs notes draft <workdir> --topic <n> --episode <n>
```

This writes `ep<NN>/<slug>.json` and `script.md`:
- the storyboard: a cold open, then the four chapters *What you see*, *How it surfaced*, *The fix*, *Did it work*, then the end card;
- draft lines quoted from the review, each beside its source.

The drafts are raw. Rewrite every line in the founder's voice:
- first person ("I cut the shot"), short, blunt, no hype;
- each line one claim the source supports;
- digits for numbers, every number a fact;
- `*asterisks*` around the one phrase per line the subtitles should set in orange;
- the sign-off stays: "I'm building HARLEM ’88, and I'm showing the work."

Aim for about 60–80 words in total. The flighty voice runs about 2.2 words a second.

Then refine the beats with the measurement:
- `play` stretches with their own sound where the audio matters;
- `audio: 0` where narration runs over silent footage;
- `hold` frames for freezes.

Narration never lands on dialogue; the check enforces it.

### 4. Overlays

Choose from the library (`references/overlays.md` has every option and an example). Per scene, at most one statement graphic (headline, chapter or compare), plus pointing graphics (track, arrow, id, timeline) as needed:

| Component | Use it for |
|---|---|
| `headline` | the cold-open title, or one big statement |
| `id` | the first time a character appears |
| `track` | brackets on the mouth or face; `hot` turns them orange on silent frames |
| `freeze` | the flash and punch-in on a held frame (pair with a `hold` beat) |
| `compare` | before/after labels on a two-panel beat (`props.pair: "side"` in 9:16) |
| `timeline` | the take as a ruler: voice cream, silent movement orange, `cut` and hum `marks` |
| `arrow` | one short note pointing at the mouth or face, placed beside the face |
| `chapter` | the number and title at the start of each chapter scene |

Document options:
- `theme: "notes"`;
- `subs: "words"` (word-timed subtitles with emphasis);
- `timecode: true`;
- `transition: "wipe"`;
- `watermark: { file }`.

### 5. Silent preview, inspect, revise

```
node tools/capture/cli.mjs doc <storyboard.json> --formats 9x16 --check
node tools/capture/cli.mjs doc <storyboard.json> --formats 9x16 --stills 1.4,3.6,6.8,...
node tools/capture/cli.mjs doc <storyboard.json> --formats 9x16          # silent preview, about 7 min for 40 s
```

- Take stills at every scene's busiest moment and tile them into a contact sheet to look at.
- Run the QA checklist in `references/qa.md` and fix what it finds. Expect two or three passes.
- Only then send the preview (SendUserFile) with a short summary of what's on screen, the script, and the open items.

### 6. Voice (only after a yes)

1. **Quote.** Call `mcp__Higgsfield__generate_audio` with `get_cost: true` on each line:
   - model `seed_audio`;
   - `voice_type: element`;
   - voice `0888f943-90ae-47cf-8152-962889806dc5`, confirmed with `list_voices`.

   Send the plain words: no asterisks, and **numbers and terms spelled as said** ("one point four seconds", "zero point two five", "Harlem eighty-eight"). Digits break this voice: in Episode 01, "1.4" produced a silent file and a truncated one. Quote the spelled text, because it can cost more than the digits. Report the total and wait.
2. **On yes,** generate with `generate_audio_batch` and log the job ids and exact charge (`transactions`). Record each line's status in `narration/jobs.json`, and the approvals and spend in the storyboard (`approvals`, `spend`), so the package reports them.
   - **Check every file before using it.** Run `volumedetect`, and a level reading every 0.1 s. A take that is silent, truncated (much shorter than about 2.2 words a second) or full of long pauses gets set aside in `narration/rejected/`, and is not used. A retake is a new spend: quote it and ask.
3. **Download.** The result host `d8j0ntlcm91z4.cloudfront.net` may be blocked by the environment's network policy. If so:
   - re-host each result with `mcp__Higgsfield__media_import_url`;
   - download from `https://d2ol7oe51mr4n9.cloudfront.net/<user>/<media_id>.mp3`. It is the original WAV.
4. **Render.** Save the files as `<line id>.wav` in a folder and render with `--narration <folder>`. This is a **narrated draft** (`documentary-9x16-narrated.mp4`, tagged with `draftTag`). The engine re-times holds to the real lines; re-check stills after.
5. **Final.** Only `--narration <folder> --final` makes `documentary-9x16.mp4`, and it refuses without the approved logo file. Render it only after the founder approves the narrated draft.

### 7. Captions, post copy, approval package

```
node tools/capture/cli.mjs notes package <storyboard.json> [--render <doc out dir>]
```

This writes:
- the render(s) and stills;
- `captions.srt`;
- `social.md`: Reels/TikTok caption, Shorts title, alt text, all drafts;
- `production-notes.md`: footage hashes, every fact and its source, the script with timings, the graphics per scene;
- `approval.json`: script, voice, logo, final and publish, all `pending` until the founder says yes.

Give the founder the package and the checklist. Never post it yourself.

## When the episode is done

Commit engine or library changes (`tools/capture/`, this skill) on the working branch with tests green (`node --test tools/capture.test.mjs`). Footage, storyboards with private paths and renders stay out of the repo.
