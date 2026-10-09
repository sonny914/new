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

## Added with the false confidence reel

- **Jump cuts.** `python3 edit.py words.json . --gap 0.2 --hold I=SEC … --end SEC` trims pauses and keeps
  every word, writing `edit.json` + `edit.js`. Pass `edit: EDIT` to `Kit.boot` and `edit='edit.json'` to
  `Reel`: cues are then on the reel's clock (`EDIT.words[i].os`), and the voice is joined from the
  segments with 12 ms fades.
- **Word-synced captions.** `Kit.phrases([...], words)` matches phrase strings to the spoken words (and
  throws if they differ); `*word*` = orange, a leading `~` hides a phrase while on-screen type says it.
  `Kit.wordCaptions(el, caps, t)` lights words as they're said. Expose `window.CAPS` and
  `node srt.mjs index.html captions.srt` writes the SRT.
- **Respell.** `align.py` aligns words the dictionary lacks (ChatGPT, AI) through `RESPELL`.
- `Kit.keys(t, [[t, v], …])` for keyframed values; `crack()` and `collapse()` in the sound palette;
  a 30 ms fade-in on the mix (AAC overshoots when a reel opens mid-signal).
