# Production workflow

## The pipeline

| Step | Command | Gate |
|---|---|---|
| 1. Validate inputs | `npm run validate -- <id>` | No errors. Warnings read and either fixed or understood. |
| 2. Storyboard | `npm run storyboard -- <id>` | Every scene has a purpose and a transition; no "short" reading times. |
| 3. Assemble | edit `project.json`; `npm run still -- <id> --frames …` | Key frames look right at full size. |
| 4. Preview | `npm run preview -- <id>` | `report.md`: 0 errors. |
| 5. Inspect | open `preview-overview.png`, `preview-scenes.png`, `preview-transitions.png`, watch `preview.mp4` | Your eyes. Automated checks cannot judge aesthetics. |
| 6. Correct | edit, repeat 3–5 | |
| 7. Final master | `npm run render -- <id>` (runs 7–10) | Refuses to start without a passing preview of this exact project and engine. |
| 8. Delivery encode | (automatic) | Adaptive bitrate, under `export.targetMB`. |
| 9. Verify | (automatic; `npm run verify -- <id>` to repeat) | Dimensions, frames, duration, codecs, colour space, fast start, size, decode, blanks, audio, loudness, brand colours. |
| 10. Package | (automatic) | `output/<id>/`: delivery mp4, master, report, manifest with hashes, contact sheets, project + storyboard copies. |

## Input modes

| Mode | Start with | What is measured | What is assumed (and written into `assumptions`) |
|---|---|---|---|
| Idea | `npm run new -- <id> --idea "topic"` | nothing | A hook → tension → turn → reveal → sign-off structure. Copy is TODO: the words are yours. |
| Script | `npm run from-script -- lines.txt --id <id>` | word counts | Timing from reading speed (0.8 s + 0.28 s per word + entry/exit). |
| Voice | `npm run voice -- voice.wav --id <id> [--script lines.txt]` | phrase boundaries (silence detection) and duration | No word-level timestamps. If phrases and lines do not match in number, the merge/split is stated. |
| Reference | `npm run reference -- clip.mp4` | cuts, shot lengths, motion energy, holds, bursts, loudness, silences | Typefaces, easing curves and intent are listed as unknown until a person confirms them from the sheets. |
| Brand | the `quiet-bands` theme | — | Values come from verified repository files only. |
| Hybrid | any of the above, then edit | | Keep each source's assumptions in the list. |

Script format: blank lines separate beats; the first line of a beat is its display line, the rest are supporting lines.

```
AUTOMATE
THE COORDINATION.

PRESERVE
THE HUMAN.
```

### Using a reference well

1. `npm run reference -- ref.mp4` and read `reference.md`: observed, inferred, unknown are kept apart.
2. Open `shots.png`, `timeline.png` and `energy.svg`; fill in the "Reviewer notes" table by watching, frame-stepping where motion matters.
3. Translate confirmed techniques into recipes: an existing preset with params, or a new preset (see ARCHITECTURE "Adding a preset"). Never reproduce a reference shot for shot.
4. If only screenshots exist, there is no timing or easing to analyse: say so and design the timing.

## Review checklist (step 5)

- First frame: is something there? Is the hook visible within 0.5 s?
- Hierarchy: one thing to read at a time; the accent on one element only.
- Every scene boundary (`preview-transitions.png`): continuous, no title cards dropped in from nowhere.
- Every hold listed in the report: can you name why it is there?
- Text rests long enough (storyboard reading table) and stays inside the safe area (report).
- Motion grammar: entrances ease out, exits ease in and are faster, transforms ease in-out. No bounce, glow, particles or spin.
- Brand: black ground, cream type, orange once; logo whole and unmodified; wordmark never typeset.
- Sound (if any): the waveform's beats match the storyboard; true peak below −1 dBFS.

## After a production

1. List the techniques the piece needed that the library did not have.
2. For each: is it reusable beyond this piece? If it is only this video's flourish, keep it in the project (a path, a param combination), not in the library.
3. If reusable: implement it as a preset or a new option on an existing one, with defaults that preserve current behaviour (backward compatible), a schema, docs, an example and tests.
4. Add any fix you discovered to `COMMON_FIXES` in `scripts/lib/catalog.ts`.
5. `npm test && npm run gallery && npm run catalog`, and re-render the existing projects to confirm nothing moved.

## Delivery specs

| Format id | Size | Use |
|---|---|---|
| `story` (default) | 1080×1920 | Reels, TikTok, Shorts |
| `portrait` | 1080×1350 | Feed |
| `square` | 1080×1080 | Feed |
| `landscape` | 1920×1080 | YouTube, decks |
| `{width, height}` | any | custom |

H.264 High, yuv420p, BT.709 tags, fast start, AAC 48 kHz when there is audio, under 30 MB by default (`export.targetMB`). 60 fps: set `"fps": 60`; durations scale automatically.
