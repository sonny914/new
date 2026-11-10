# Film 001: EVERYBODY CAN BUILD. (AI & the creative economy)

A vertical narrated editorial film: 1080×1920, 30 fps, H.264 with AAC, 54.6 s. It is built on the approved opening (`renders/everybody-can-build-cover-open.mp4`) and the Motion Lab engine (`tools/motion/engine`).

## Deliverables (`out/`)

| File | What |
|---|---|
| `everybody-can-build-film001.mp4` | Final narrated film with burned captions |
| `everybody-can-build-film001-clean.mp4` | The same film without captions |
| `everybody-can-build.srt` | Captions for every spoken line, including the lines the film shows as designed type |
| `everybody-can-build-script.md` | Final narration, with the revision notes |
| `everybody-can-build-film001-sheet.png` | Contact sheet of the major scenes |

## Pipeline (each step reads the previous one's output)

1. **Narration.** `script.md` is the final script. The 12 lines were generated in the authorized **flighty** voice: Higgsfield custom voice element `0888f943-…`, model `seed_audio`, 48 kHz WAV. The takes are kept in `vo/01–12.wav`.
2. **`python3 build_vo.py`** measures the speech in each take (silencedetect at −42 dB), trims it and gain-matches it to −18 LUFS. It places each line after a designed pause and writes `narration.wav` and **`timeline.json`**, the clock everything else follows.
3. **Picture.** `comps/everybody-can-build/film001.js` reads `timeline.json`. Render it with `node tools/motion/render.mjs everybody-can-build/film001 --from=150 --to=<total×30> --out=<body.mp4>`. It starts at 5.0 s, on the opening's last frame.
4. **`python3 sfx.py`** synthesises the original sound design (`sfx.wav`) on the same clock.
5. **Captions.** `python3 captions.py` writes the SRT and `captions.json`, and `node captions-render.mjs` writes `captions/*.png`.
6. **`./assemble.sh <body.mp4>`** joins the opening and the body, mixes to −14 LUFS (true peak −1.5 dBTP), and writes the clean and captioned films.

To make a new cut, change `script.md`, regenerate the takes, and run steps 2–6. The picture follows the voice automatically.

## Reusable pieces this film added to the engine

- **Multi-creator workstations.** `deskSeated({ z0 })` puts a desk at any depth.
- **The opening as a world.** `openingWorld(ctx, e, t, cam)` lets later scenes keep the approved opening alive under any camera.
- **Fades that work.** Fades now carry through every illustration (the website, store, app and product drawings used to reset alpha).
- **Distance-aware bulb light.** The bulb's light shrinks with distance in wide shots.
