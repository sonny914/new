# Progress record

## v0.1 (2026-10-09)

**Audit.** Static Netlify site, no build step, no existing motion tooling, no reference footage. Verified brand sources: `assets/brand/*.svg`, the `qb-identity` skill, `assets/bulb/entry.css` and `rd.css` (colours and easing), Hubot Sans on the live pages. Machine: 4 CPUs, 15 GB RAM, no GPU, Node 22, FFmpeg 6.1, Playwright's Chromium 141 headless shell. Remotion rendered with the local browser on the first try, so the stack was settled before any engine code.

**Built.**
- Engine: project schema and validation, time and position expressions, cubic-bezier easing from theme tokens, keyframe tracks and paths, layout solver with anchors, composer (group camera, freeze, masks, audio, QA probe), procedural sound.
- Nine presets: KineticHeadline, MaskedTextReveal, WordStack, LineDraw, GridAssembly, Accumulation, Accent, DirectionalWipe, BrandLockup. Each has a typed schema, defaults, docs, a rendered example and tests.
- Pipeline: preview-first gating on project and engine hashes, CPU master render, adaptive-bitrate delivery, decode-based verification (including brand colours), contact sheets, packaging, benchmarks.
- Modes: idea, script, voice, reference; plus `new --from` for copying a finished piece.
- Catalog (component memory), generated from the code.

**Produced.** `simplicity-is-a-viewpoint` (15 s, 9:16) and `automate-the-coordination` (11 s, 4:5). Both passed preview and delivery QA with 0 errors and 0 warnings, and were inspected frame by frame from their contact sheets.

**Fixed along the way** (all recorded in the catalog's Common fixes): leftovers after a sweep, glyph overlap mid-swap, rule over rising text, empty opening frames, unplanned holds, WordStack exit, odd preview sizes, stale previews after engine changes, a path/layout cycle, hyphenated scene ids versus minus signs, scientific notation in FFmpeg metrics.

**Not done / next.**
- Real music or voice: none was supplied; the showcase uses a procedural placeholder bed.
- Word-level voice sync would need a forced aligner (local, e.g. a Whisper build); voice mode stops at phrase level on purpose.
- More presets from the brief's list that these pieces did not need (ShapeMorph between arbitrary paths, ContinuousZoom through a letterform, FocusTransition as a blur-free depth change). Add them when a production calls for them, through the after-a-production steps.
- A JSON Schema export of the project format for editor autocomplete.
