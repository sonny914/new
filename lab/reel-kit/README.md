# Quiet Bands reel kit

Shared by every reel from `reel-make-it-disappear` on. (`reel-ai-gold-rush` predates it and is left
exactly as it shipped.) Making the next reel:

1. **Words.** `python3 align.py transcribe <rec>` gives a draft. Correct it by meaning into
   `transcript.txt`, then `python3 align.py align <rec> transcript.txt words.json`.
2. **Composition.** `index.html` loads `kit.css` + `kit.js` and defines only `render(t)` (recording
   seconds) and its captions; `Kit.boot({render, offset, frames, face, init})`. The kit supplies
   timing helpers, mask reveals, `fit`, seeded `rng`, captions, the talking-head seek and the
   **sting** (`Kit.sting(t, hit)`; never re-time it).
3. **Layout QA, before any render.** `node stills.mjs index.html <face dir> sheet.jpg t1 t2 …`:
   a labelled contact sheet in seconds. Fix layout here, not after a full render.
4. **Sound.** `build-audio.py` is a cue sheet: `Reel(rec, out, offset, length)`, `.at(t, sound, gain)`,
   `.sting(hit)`, `.bed(gains)`, `.finish()`. Palette in `sfx.py`: impact, tick, flick, pop, whoosh,
   key, bell, riser, slash, stamp, dust. Loudness is two-pass, −14 LUFS and −2 dBTP before encoding,
   so the AAC file stays under −1.
5. **Render.** `node render.mjs index.html <face dir> <out> [--scale 0.5]` (4 parallel browsers).
   One 0.5× preview, fix, then the final. A sound-only change is a remux (`-c:v copy`), not a re-render.

Brand: black, cream `#F2EEE5`, one orange `#FF5A00` accent; captions one orange word per phrase.
