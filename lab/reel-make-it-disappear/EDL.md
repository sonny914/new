# Make it disappear reel: edit decision list

Quiet Bands, 9:16, 1080×1920, 30 fps, 25.2 s. One talking-head recording (24.1 s, 1080×1920 HEVC,
24 fps). Built on `lab/reel-kit`. Word timings are forced alignment of the actual delivery
(`words.json`); the reel starts 0.1 s into the recording and nothing in the speech is cut, sped up or
reordered. Times below are **recording time** (reel time + 0.1 s).

**The idea:** one orange line runs through the whole reel. It strikes out CODE, underlines the
problem, scans the busywork, locks onto one problem, becomes its workflow, and ends as the dot the
sting lands on.

| Time | Spoken | Picture | Sound |
|---|---|---|---|
| 0.10–0.72 | "You don't need to learn…" | Face, settling in from a 12 % push. Caption on from frame 1. | Bed in. |
| 0.72–3.0 | "…how to code to make money with AI." | **Signature 1, the Strike.** The frame darkens, code types itself, **CODE** rises, and on "money" the orange line slashes through it. The code falls away. | Keys, impact on CODE, slash, flicks. |
| 3.0–6.4 | (beat) "You need to learn how to solve expensive problems." | CODE drops out; the line shrinks to a waiting dash, then becomes the underline of **EXPENSIVE PROBLEMS.** | Bed drops for the beat, returns on "You need"; impacts. |
| 6.4–6.95 | (beat) | The line goes up to the top edge and wipes the dark away, top to bottom. | Whoosh pair. |
| 6.92–12.6 | "Businesses are still copy-and-pasting data, chasing emails, and doing work that AI could help automate." | Face clean. A spreadsheet copies and pastes (⌘C, ⌘V), an inbox piles up, a to-do list fills. On "automate" the line scans down once and everything it passes gets done. | Keys, paste ticks, rising pops, the scan. |
| 12.55–14.6 | "Find one of those problems." | **Signature 2, Find → Learn → Build.** Twelve problem tiles deal in; an orange reticle hunts and locks onto *Chasing emails* on "problems"; the rest fall away. | Ticks per hop, a stamp on the lock. |
| 15.16–16.34 | "Learn the workflow." | The line runs down from the problem; four steps pop in along it. | Riser, an ascending bell per step. |
| 16.99–18.02 | "Build a solution." | The steps become bricks and stack into one block; an orange pass runs through it (the workflow running); ✓ AUTOMATED. | A stamp per brick, run ticks, two-note chime. |
| 18.02–20.6 | "Because nobody's paying for your prompts." | Back on the face. A prompt types itself; on "prompts" a **$0** stamp lands on it. | Keys, stamp. |
| 20.6–23.5 | "They're paying for the problem you make disappear." | **Signature 3, the Disappear.** Dark. **PROBLEM** rises over its underline; on "disappear" it dissolves left to right into drifting dust (a few orange embers) while the line shrinks to a dot and goes. | Bed falls away; impact on PROBLEM; dust. |
| 23.5–25.3 | (end) | The Quiet Bands sting: the mark lands as the dot vanishes, the wordmark a beat later. | The sting, on the hit (23.60). |

## Captions

From the recording. Cream, one orange word per phrase, 50 px at y 1490 over a dark gradient, so
they clear the reel UI and stay readable on the white shirt. They step aside only where the kinetic
type says the same words (CODE, SOLVE EXPENSIVE PROBLEMS, THEY'RE PAYING FOR THE PROBLEM).
`captions.srt` (reel time) carries every line.

## Treatment notes

- **Mirrored source.** The front camera flipped the shot (the cap read backwards). The face is
  un-mirrored; nothing else changes.
- **Transcript.** A draft from Vosk (small en-us), checked against pocketsphinx. The first line is
  "You *don't* need…": the "don't" is reduced in the delivery, and the second recognizer heard the
  nasal ("you mean to…") that a reduced "don't" leaves, which "you'll" wouldn't. It also matches the
  next line's contrast ("You need to learn how to solve…").
- **Grade.** Contrast +5 %, saturation −10 %. 24 fps footage, 30 fps graphics.
- **Loudness.** −14.8 LUFS, −1.3 dBTP as delivered (AAC).

## Asset and source manifest

| Asset | Source | Rights |
|---|---|---|
| Talking head + voice | Supplied recording | Owner's footage |
| All graphics (code, spreadsheet, inbox, tasks, tiles, workflow, prompt, particles) | Original, code-generated in `index.html` | Original work |
| Sting, brand lockup | `lab/qb-sting` (Quiet Bands) | Owner's brand |
| Fonts | Bricolage Grotesque, Instrument Sans, Space Mono (Google Fonts) | SIL Open Font License |
| Music bed, sound effects | Synthesized (`lab/reel-kit/sfx.py`) | Original work |

No stock footage, no AI-generated video, no paid credits. Names in the inbox are generic first names;
no real products or companies appear.

## Rebuild

`./build.sh <recording.mp4> [work dir]` (`PREVIEW=1` for a 540×960 check). Live preview:
`index.html?play&face=<dir of graded frames>`.
