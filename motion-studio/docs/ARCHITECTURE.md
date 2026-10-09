# Architecture

## Shape of the system

```
project.json ──► prepare (validate + resolve times) ──► layout solver ──► composer ──► frames ──► encode ──► verify
                     │                                     │                 │
                     │ zod schemas (project + each preset) │ measures type,  │ group camera, time remap,
                     │ readable errors with paths          │ resolves anchors│ masks, audio, QA probe
                     ▼                                     ▼ and paths       ▼
                storyboard.md                         anchors + data    Remotion (Chromium, CPU)
```

Everything a video needs is in its project file. The engine never contains a specific video.

## The brief's modules, and where they live

| Module | Responsibility | Code |
|---|---|---|
| Typography engine | measurement, fitting, optical alignment, glyph/word/line motion, word-to-word swaps | `src/engine/measure.browser.ts`, `src/presets/typography/textcore.ts`, `TypeSetter.tsx` |
| Shape engine | lines, lattices, rectangles, circles, drawn on and off with dash maths | `src/presets/geometry/*`, `src/presets/shared.ts` |
| Transition engine | layer `reveal`/`conceal` masks (circle iris, directional wipe), DirectionalWipe, in-frame match cuts | `src/engine/composer.tsx` (masks), `src/presets/transitions/` |
| Camera engine | per-group virtual camera (push, pull, pan, rotate) with keyed easing; per-layer `depth` for parallax | `composer.tsx` (`LayerHost`) |
| Scene composer | mounts layers in their windows, in z order, inside their group chain | `composer.tsx` |
| Timeline controller | time expressions (`"s3+8"`, `"end-1s"`), keyframe tracks, staggers, group freeze/resume | `src/engine/time.ts`, `keyframes.ts`, `remap.ts` |
| Audio controller | file tracks with fades and trims; procedural cue sheets synced to layer events | `composer.tsx` (`AudioTracks`), `src/engine/audio/synth.ts`, `scripts/lib/sound.ts` |
| Render pipeline | bundle, stills, preview, master, delivery encode, verification, packaging, benchmarks | `scripts/lib/render.ts`, `encode.ts`, `verify.ts`, `pipeline.ts` |

## Key decisions

**Remotion over a hand-rolled renderer.** React components render each frame in headless Chromium, so SVG, CSS, variable fonts and masks behave exactly as in a browser, and every frame is a pure function of its number (deterministic, parallel, resumable). The cost is a Chromium dependency and Remotion's licence terms (free up to three people). Three.js was not installed: nothing in these pieces needs real 3D, and depth is simulated with group cameras and parallax.

**Global frames, not nested timelines.** Every time in a project resolves to an absolute frame. Presets get the absolute frame and their group's remapped frame. This is what lets one accent drive other layers: the rule it draws, the clutter it clears and the iris it opens all sample the same path on the same clock.

**A layout pass before any frame.** Type is measured once (real glyph advances and kerning from SVG layout, ink bounds from canvas), and layers publish anchors (`@viewpoint.inkEnd`). Paths and other layers can pin to those anchors, so "the point lands as the full stop" is exact for any word and font size. The solver orders work by dependency and reports cycles. Presets declare what they reference (`refs.paths`, `refs.renderPaths`, `refs.layers`); references needed only when drawing are sampled at render, which breaks the natural cycle "path → lockup anchor → lockup iris → path".

**SVG text, one element per glyph.** Positions come from measuring the whole string, so kerning survives when glyphs move independently. Masks are clip rectangles at the type's own slot, so text rises through its baseline rather than fading.

**Validation in two places.** The same `prepareProject` runs in Node (CLI, tests) and in the browser. Node adds file checks and a layout pass with approximate metrics, so reference errors fail before a browser starts; the browser repeats it with real metrics.

**Preview-first, enforced.** `render` refuses to start until a preview of the same project file *and the same engine code* has passed QA (hashes in `output/<id>/preview.json`).

**QA reads output, not intentions.** The layout probe reports element bounds at rest from inside the real render. Media checks decode the delivered file with FFmpeg: dimensions, frame count, duration, codecs, colour tags, fast start, size, blank-frame runs, still stretches, loudness and true peak, full decode, and brand colours sampled from decoded pixels.

**CPU path by default.** `gl: swangle` (SwiftShader). Measured on a 4-core VM with no GPU: preview about 15 fps at half size, master about 6 fps for the busy showcase (`docs/benchmarks.json`).

**Adaptive delivery bitrate.** `video kb/s = min(quality ceiling, size ceiling)`. The quality ceiling is width × height × fps × 0.12 bits per pixel; the size ceiling is (target MB × 8 × 0.95 ÷ seconds) − audio. Encoding is CRF 16 capped at that rate; if the file still lands over target, it is re-encoded in two passes at 90%.

## Motion grammar

A small set of behaviours, used everywhere, so pieces feel related without sharing shots.

| Behaviour | Rule | Default |
|---|---|---|
| **Entrance** | Things arrive by being set or drawn into the layout: type rises through its own baseline; lines draw from an end or the centre; marks turn in a quarter turn. Never fly in from off-screen. | ease-out `(.23,1,.32,1)`, `base` 16f, stagger `tight` 1.5f |
| **Exit** | The reverse of the entrance, faster: type drops through its baseline, lines retract, marks scale down. | ease-in (ease-out reversed in time), `short` 10f |
| **Transformation** | An object changes state in place rather than being replaced: letters roll through their slots, shared letters slide, a rule moves to its new line. | ease-in-out `(.77,0,.175,1)`, `long` 24f |
| **Continuity** | One object persists across scenes (a headline, a rule, the accent) and the next scene grows out of it. No disconnected title cards. | Layers span scenes; anchors pin the next element to the last. |
| **Emphasis** | The accent colour, on one live element only. Emphasis is position and timing (what moves while everything else holds), not glow, bounce or scale pulses. | `accent`, one per frame |
| **Rest** | Text holds long enough to read before it changes: 0.8 s + 0.28 s per word (checked in the storyboard). Deliberate full stops (a freeze, an end card) are named in QA. | `hold` 18f minimum |

Durations are authored at 30 fps and scale with the project's fps.

## Data model, briefly

- **Scenes** are named time spans with storyboard notes. They do not own layers; they give times names (`"s3+8"`).
- **Layers** are preset instances: `preset`, `params` (validated by that preset's schema), a mount window (`from`/`to`), `group`, `z`, `depth`, `reveal`/`conceal`.
- **Paths** are keyed positions (with optional `via` control points) that any layer can ride or react to.
- **Groups** carry a camera and an optional freeze, and nest.
- **Audio** tracks are files or synthesised cue sheets; cues can sync to a layer's own events.

## Adding a preset

1. Create `src/presets/<category>/<Name>.tsx` exporting a `PresetDef`: a strict zod schema with defaults, `doc`, optional `layout` (measure and precompute; publish anchors), a `component` that is a pure function of the frame, `refs` for anything it names, and an `example`.
2. Register it in `src/presets/index.ts`.
3. `npm test` (the preset suite checks docs, the example's validation and layout, and declared anchors), `npm run gallery -- <Name>`, `npm run catalog`.

Keep per-frame work to arithmetic: generate, measure and schedule in `layout`.
