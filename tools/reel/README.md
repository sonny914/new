# Reels

Particle reels for Quiet Bands, drawn frame by frame and scored to match. **For a new reel, edit `reel.config.js` only.** The engine stays fixed unless a new visual effect is asked for.

```
tools/reel/
  reel.config.js      ← the one file to edit: copy, timing, preset, sequence, camera, colours, duration, audio
  render.mjs          preview / export / stills
  engine/
    presets.js        the three motion presets (sequence + camera + rhythm)
    logo.js           samples the QB mark (assets/brand/mark.svg) into particle targets
    particles.js      shapes, morphs, camera, drawing
    type.js           typography styles (rise, slide, end title)
    score.mjs         sound gestures and beds, timed from the sequence
    timeline.js       easing, keyframes, time references (shared by picture and sound)
    page.html         hosts the engine (headless for renders, or in a browser to scrub)
  orb-reel.html, orb-render.mjs, sound.mjs   the earlier Thinking orb reel (separate, unchanged)
```

## Commands

Run from the repo root. You need ffmpeg and Playwright (`npm i --no-save playwright`). If Playwright has no browser of its own, prefix the command with `CHROMIUM=/path/to/chrome`.

| | Command | Output | Time |
|---|---|---|---|
| Preview | `npm run reel:preview` | `tools/reel/out/preview.mp4`, 540×960, with sound | ~10 s |
| Export | `npm run reel:export` | `<output>/reel.mp4` (1080×1920) + `reel-poster.jpg` | ~45 s |
| Stills | `npm run reel:stills -- --at=1,5.5,9.9` | full-size PNGs in `tools/reel/out/` | seconds |
| Try a preset without editing | `npm run reel:preview -- --preset=pulse` | | |
| Another config file | `npm run reel:export -- --config=tools/reel/launch.config.js` | | |
| Scrub in a browser | `npm run serve`, then open `localhost:8080/tools/reel/engine/page.html` (←/→ frame, shift for a second, space plays) | | |
| Check configs | `npm test` | | |

Rendering is deterministic. Every frame is a pure function of the config and its frame number (seeded points, integrated camera), so the preview is the export drawn at half size. Measured: every preview frame is ≥35 dB PSNR against the downscaled export. Frames render in parallel (`--jobs=4`), and the output is the same at any job count.

## The config, in short

- **Times** are seconds, or tied to the morph sequence: `'s2'` (step 2 starts), `'s2.land'` (step 2 has formed), `'s3.land-0.4'`, `'end'`. Copy, camera and sound all use these, so moving a step moves everything on it.
- **Presets** each have four steps: line 1 on step 1, line 2 on step 3, end title on step 4.
  - `one-idea` (default, approved): point → sphere → ring → **the QB mark**, which turns once and holds front-on for the last 1.25 s. 120 bpm.
  - `slow-orbit`: band → sphere → ring from above → band. Calm, 100 bpm.
  - `pulse`: point → ring → spinning sphere → band. Fast, 128 bpm.
- **Sequence**: `null` uses the preset's. Shapes: `dust core sphere torus band logo`. Morphs: `converge bloom stretch scatter`.
- **Logo**: `logo.src` is the SVG the particles form (default `/assets/brand/mark.svg`). Points are sampled from its own fill mask and outline, at its true proportions. If the file can't load, the render stops with an error; it never substitutes a shape. `logo.front` sets when it faces the lens; keep at least 1 s after it, and end the camera's `pitch` and `roll` keys at 0.
- **Camera**: `intensity` (0.6 calm … 1.3 bold) scales every move. `keys` override single tracks.
- **Audio** follows the sequence automatically: each morph has a gesture and each held shape a bed. You set the key, the loudness (2.6 ≈ −14 LUFS) and the reverb.
- **End title**: `mark: 'type'` sets text. `'wordmark'` uses the brand vector, as the identity rules require.

## A new reel in four steps

1. Change `copy` and `end` in `reel.config.js`, and `output` if it shouldn't replace the current reel.
2. Optionally pick a `preset` and set `camera.intensity`.
3. Run `npm run reel:preview` and watch it. Adjust timings with `s`-references rather than raw seconds.
4. Run `npm run reel:export`.
