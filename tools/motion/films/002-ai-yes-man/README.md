# Film 002: THE AI YES MAN (AI & the creative economy)

A vertical narrated editorial film: 1080×1920, 30 fps, H.264 with AAC, 59.7 s. It's the same world, figure and pipeline as Film 001. The source composition is `tools/motion/comps/the-ai-yes-man/film002.js`.

## Deliverables (`out/`)

| File | What |
|---|---|
| `QB_FILM_002_AI_YES_MAN_FINAL.mp4` | Final narrated film with burned captions |
| `QB_FILM_002_AI_YES_MAN_CLEAN.mp4` | The same film without captions |
| `QB_FILM_002_AI_YES_MAN_CAPTIONS.srt` | Every spoken line, including those carried on screen by the headline, the question cards and the end card |
| `QB_FILM_002_AI_YES_MAN_SCRIPT.md` | Final narration, with the revision notes |
| `QB_FILM_002_AI_YES_MAN_CONTACT_SHEET.png` | Contact sheet of the major scenes |

## Pipeline

1. **Narration.** `script.md` holds the final narration, generated in the authorized flighty voice (Higgsfield element `0888f943-…`, `seed_audio`, 48 kHz). The takes are in `vo/01–14.wav`.
2. **`python3 build_vo.py`** trims the speech and gain-matches it to −18 LUFS. It caps pauses the voice model over-held at 0.75 s, cutting silence only. The beat after "Meanwhile…" keeps 1 s. It writes `narration.wav` and **`timeline.json`**.
3. **Picture.** Render with `node tools/motion/render.mjs the-ai-yes-man/film002 --to=<total×30> --out=<picture.mp4>`. Every beat reads `timeline.json`.
4. **`python3 sfx.py`** synthesises the original sound design.
5. **Captions.** `python3 captions.py` writes the SRT and `captions.json`, and `node captions-render.mjs` writes `captions/*.png`.
6. **`./assemble.sh <picture.mp4>`** mixes to −14 LUFS (true peak −1.5 dBTP) and writes the clean and captioned films.

## Shared pieces (reusable by future films)

- **`comps/shared/story.js`:** camera keys, arcs and floor paths, a walking figure, editorial headlines and kickers, and the series end card.
- **Engine additions:**
  - a business-plan illustration (`thing('plan')`)
  - the creator can leave the chair (`A({ figure: false })`)
  - the screen prompt is settable

  None of these change Film 001's renders; its approved stills re-render byte-identical.
