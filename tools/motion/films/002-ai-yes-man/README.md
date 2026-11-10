# Film 002: THE AI YES MAN (AI & the creative economy)

A vertical narrated editorial film: 1080×1920, 30 fps, H.264 with AAC, 60.4 s. It's the same world, figure and pipeline as Film 001. The source composition is `tools/motion/comps/the-ai-yes-man/film002.js`.

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

## v2: character-led (the story)

v1 illustrated each line with abstract objects. v2 tells one story in one set, with two characters and a single product that changes because of what the characters do:

- **The builder** sits at his desk, then stands next to the store he builds.
- **The Yes Man** (`engine/cast.js` → `yesMan`) is the AI as a character: a small floating assistant whose screen face says ✓ to everything.
- **The store** (`engine/cast.js` → `storefront`) shows his idea as a real place. It has a SOLD counter over the door.

| Line | What happens on screen |
|---|---|
| cooking / brilliant | The Yes Man gives a ✓ and a thumbs-up. The idea flies from his screen into its hands: "BRILLIANT." |
| strategy / plan / world | It stamps the plan APPROVED. The store rises from the floor. PREMIUM, WORLDWIDE and flags pile on. He stands, proud |
| Meanwhile… | Everything freezes. **SOLD 0.** He deflates while the Yes Man keeps its thumb up |
| AI can help you build | It really can: it adds the awning in a second |
| agreement ain't validation | A passerby walks up, looks and leaves. Its ✓ turns into "?" |
| stop asking "is this a good idea?" | He asks. "ABSOLUTELY." He scratches the question out |
| why would this fail? | It scans the store and finds NO HANDLE on the door and NO PRICE |
| who actually pays? | It points down the street, where a real customer with a need appears |
| what haven't I proven? | The extras are tagged ASSUMED and come off |
| argue against my plan | It crosses its arms and pushes back. He fixes the door and adds the price |
| the point isn't… / better at thinking | The customer walks in and pays. **SOLD 1** turns orange, the street lights up and the Yes Man gives a small, earned ✓ |

Beats are found by word position (`brk` in `comps/shared/story.js` and `films/timeline_util.py`), so a re-recorded take keeps the picture, captions and sound in sync. v1 is kept as `comps/the-ai-yes-man/film002-v1.js`.

**Narration fix (both films):** the TTS engine often clipped the last word of a line. Each line is now generated with a throwaway word after it, and that word is cut off at the pause before it. Every take is checked: it has to end in silence and run at a plausible words-per-second rate.
