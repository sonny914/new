# AI gold rush reel: edit decision list

Quiet Bands, 9:16, 1080×1920, 30 fps, 27.8 s. Built from one talking-head recording (27.0 s, 512×910,
30 fps, stereo AAC). Word timings come from forced alignment of the actual recording against the
spoken words (`words.json`, pocketsphinx en-us). The reel starts 0.2 s into the recording to cut the
dead air before the first word; nothing inside the speech is cut, sped up or reordered.

Times below are **reel time** (recording time − 0.2 s).

| Reel time | Spoken (actual delivery) | Picture | Sound |
|---|---|---|---|
| 0.00–3.79 | "Everybody's trying to get rich building AI tools." | Opens on the face, no intro. **GET RICH** masks in on "rich" (1.30); **BUILDING AI TOOLS** on "building" (1.88). Sixteen generic tool cards (categories only, no real products) deal in and swamp the frame: market saturation. | Impact on GET RICH; a paper flick per card; music bed in. |
| 3.79 | "But…" | Hard interrupt: every graphic gone, face pushed in 14 %. | Tape stop; music drops out. |
| 3.91–5.22 | "…what if we're selling the…" | The question types word by word above the head. | A tick per word. |
| 5.22–6.24 | "…wrong thing?" | Full-screen typographic takeover: **WRONG** (orange) then **THING?**, held to let it land. | Impact on WRONG, tick on THING?. |
| 6.24–8.48 | "Most people don't need another AI app." | Back on the face. One app window pops per word until they bury it (tool overload). | Rising pops; music returns. |
| 8.48–8.90 | (beat) | All windows but one fly off: simplification. | Whoosh. |
| 8.88–12.85 | "They need somebody to show them how to use the ones they already have." | The surviving window becomes the demo; the face becomes a card above it. An orange **COACH** cursor points at the notes and types the prompt, the cream **YOU** cursor follows and hits send, the email writes itself, **✓ Sent**. The title bar turns to *the AI you already have* on "already". | Key clicks, send click, two-note chime. |
| 12.78–13.14 | (beat) | The demo collapses into a single point. | Whoosh. |
| 13.14–17.75 | "That's training. That's implementation. That's a whole business." | Centerpiece, one continuous system: teacher node → learner node with knowledge pulses (**TRAINING**) → the learner unfolds into a five-step workflow, Learn · Map · Build · Test · Run (**IMPLEMENTATION**) → the steps swing onto a circle that closes into an orange loop (**A WHOLE BUSINESS.**). Each word masks out as the next masks in. | Bells per node, riser into the loop, impact on "business"; arpeggio under the build. |
| 17.80–18.30 | "Maybe," | The loop expands into an iris that reveals the face. | Whoosh; music returns quietly. |
| 17.80–26.35 | "…just maybe, the real AI gold rush isn't building the tools. It's teaching people how to use 'em." | Restrained: face, slow 6 % push-in, captions. **NOT JUST / BUILDING.** on "isn't building"; it steps back as **TEACHING.** (orange) rises letter by letter on "teaching", then a hand-drawn underline. | Ticks, impact on TEACHING., pen stroke. |
| 26.35–27.80 | (end) | Cut to black; the Quiet Bands lockup in cream. | Soft two-note bell; bed fades. |

## Captions

From the recording, not the script (the delivery adds "just maybe"). Cream, one orange word per phrase,
46 px, held at y ≈ 1330 so they clear the reel UI (top bar, right-hand buttons, bottom caption area).
They step aside only where the kinetic type is already saying the same words (WRONG THING?, the
centerpiece). `captions.srt` carries every line, including those.

## Asset and source manifest

| Asset | Source | Rights |
|---|---|---|
| Talking head + voice | Supplied recording | Owner's footage |
| All B-roll, interface demo, product cards, windows, geometry | Original, code-generated in `index.html` | Original work |
| Brand lockup | `assets/brand/lockup.svg` (Quiet Bands) | Owner's brand |
| Fonts | Bricolage Grotesque, Instrument Sans, Space Mono (Google Fonts) | SIL Open Font License |
| Music bed, sound effects | Synthesized in `build-audio.py` | Original work |

No stock footage, no AI-generated video and no paid credits were used. The demo is a generic,
unbranded assistant UI; the tool cards and windows name categories, never real products.

## Treatment notes

- **Burned-in captions in the source.** The recording already carries yellow app captions at chest
  height. They can't be removed cleanly, so the face is cropped above them (rows 90–615) and the
  reel's own captions replace them.
- **Resolution.** 512 px wide footage is upscaled ×2.06 (Lanczos, light unsharp). Contrast +6 %,
  saturation −10 %; skin left natural. The darkened ceiling becomes the type zone.
- **Palette.** Black ground, cream `#F2EEE5` type and lines, orange `#FF5A00` only where it carries the
  argument: the coach, WRONG, the business loop, TEACHING.

## Rebuild

`./build.sh <recording.mp4> [work dir]`: grades the face frames, renders the composition frame by
frame, builds the audio, and writes `export/ai-gold-rush-reel.mp4` plus a 540×960 preview.
Live preview of the composition: open `index.html?play&face=<dir of graded frames>`.
