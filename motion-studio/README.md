# Quiet Bands Motion Studio

A config-driven, frame-accurate motion graphics system. One JSON file describes a video (theme, canvas, scenes, layers, motion paths, cameras, sound, export target), and the engine renders it on Remotion with QA gates before and after encoding. The presets, theme and pipeline are shared, so the next video is a new project file, not new engine code.

Two productions prove it:

| Project | Format | Length | What it shows |
|---|---|---|---|
| [`simplicity-is-a-viewpoint`](projects/simplicity-is-a-viewpoint/) | 1080×1920, 30 fps | 15 s | Lattice → overload → hard freeze → an orange point clears it → COMPLEXITY becomes SIMPLICITY letter by letter → the point lands as the full stop → it opens into the mark. Procedural sound bed. |
| [`automate-the-coordination`](projects/automate-the-coordination/) | 1080×1350, 30 fps | 11 s | A stack of chores → AUTOMATE / THE COORDINATION. → a cream edge hands over to PRESERVE / THE HUMAN. → lockup. Silent. Same presets, different text, format, sequence and transition. |

Rendered files are not committed (they go to `output/`, which is ignored). Run `npm run render -- <project>` to make them.

## Setup

```bash
cd motion-studio
npm install          # Remotion 4.0.528, React 19, zod, Hubot Sans (local font files)
npm test             # 69 unit tests: engine, config, presets, typography, audio, modes, reference
npm run typecheck
```

You also need **FFmpeg** on the PATH (verification, delivery encode, contact sheets, analysis) and a Chromium. On this machine the pre-installed headless shell at `/opt/pw-browsers` is used automatically; elsewhere set `QB_BROWSER=/path/to/chrome-headless-shell`, or leave it unset and Remotion downloads its own on first render. No GPU needed: rendering runs on the CPU through SwiftShader.

## Commands

All commands take a project id (a folder under `projects/`), a folder, or a path to a `project.json`.

| Command | What it does |
|---|---|
| `npm run validate -- [project]` | Schema, references, assets and a layout pass. No browser. Every project if none is named. |
| `npm run storyboard -- <project>` | Writes `projects/<id>/storyboard.md`: scenes, frames, presets, audio, reading-time checks. |
| `npm run still -- <project> --frames 0,90,last [--scale 0.5]` | Renders PNG stills to `output/<id>/stills/`. Fast way to judge a frame. |
| `npm run preview -- <project>` | Validate → storyboard → sound → half-size render with the layout probe → QA report + contact sheets. |
| `npm run render -- <project>` | Previews first if the project or engine changed, refuses to continue if the preview failed QA, then renders the master, encodes the delivery file and verifies it. |
| `npm run verify -- <project>` | Re-runs delivery verification on the existing render. |
| `npm run sound -- <project>` | Synthesises the project's cue sheets to `assets/generated/*.wav`. |
| `npm run new -- <id> [--from <project>] [--format portrait] [--idea "topic"]` | Starts a project: a blank three-beat draft, a copy of another project, or an idea-mode scaffold. |
| `npm run from-script -- script.txt --id <id> [--format story]` | Script mode: blank-line-separated blocks become timed scenes. |
| `npm run voice -- voice.wav --id <id> [--script lines.txt]` | Voice mode: scenes cut at the speaker's measured pauses. |
| `npm run reference -- clip.mp4` | Reference mode: measured analysis + contact sheets in `output/reference/<name>/`. |
| `npm run gallery` | Renders every preset's example into `output/gallery/`. |
| `npm run catalog` | Regenerates `docs/PRESET_CATALOG.md` and `docs/catalog.json`. |
| `npm run studio` | Remotion Studio: scrub every project and every preset example interactively. |

## Make the next reel (about ten minutes of setup)

1. **Start it.** From a script: write the lines in a text file, one block per beat, then `npm run from-script -- lines.txt --id my-reel`. Or copy a finished piece: `npm run new -- my-reel --from automate-the-coordination`.
2. **Direct it.** Edit `projects/my-reel/project.json`: choose presets per beat (see [`docs/PRESET_CATALOG.md`](docs/PRESET_CATALOG.md)), fill in each scene's purpose, add a motion path if something should travel, pin things together with anchors (`"x": "@title.inkEnd+24"`).
3. **Check it without rendering.** `npm run validate -- my-reel` then `npm run storyboard -- my-reel`. Fix anything flagged, including reading time.
4. **Look at frames.** `npm run still -- my-reel --frames 0,45,90,last --scale 0.5`.
5. **Preview.** `npm run preview -- my-reel`. Open `output/my-reel/report.md` and the three contact sheets (`preview-overview.png`, `preview-scenes.png`, `preview-transitions.png`). Fix, repeat.
6. **Render.** `npm run render -- my-reel`. The delivery file is `output/my-reel/my-reel.mp4`, with `report.md`, `manifest.json` (hashes, probe, timings) and final contact sheets beside it.
7. **Learn.** If you built something reusable, follow "After a production" in [`docs/PRODUCTION_WORKFLOW.md`](docs/PRODUCTION_WORKFLOW.md) and run `npm run catalog`.

## Layout

```
motion-studio/
  src/engine/        config schema + validation, time and position expressions, easing, keyframes,
                     layout solver, composer (camera, time remap, masks, audio, QA probe), audio synth
  src/presets/       typography/, geometry/, transitions/, brand/ — the preset library + registry
  src/themes/        quiet-bands (verified brand tokens + logo vectors), studio-paper (neutral)
  src/Root.tsx       registers every project and every preset example as a composition
  projects/<id>/     project.json (source of truth), storyboard.md (generated), assets/
  scripts/           CLI and pipeline: render, encode, verify, contact sheets, modes, reference, catalog
  tests/             node:test suites (npm test)
  docs/              ARCHITECTURE, PRESET_CATALOG (generated), PRODUCTION_WORKFLOW, TROUBLESHOOTING,
                     PROGRESS, catalog.json (component memory), benchmarks.json
  output/            renders, reports, contact sheets (ignored by git)
```

## Brand

The Quiet Bands theme takes every value from verified files in this repository: colours and the one-accent rule from `.agents/skills/qb-identity`, `assets/bulb/entry.css` and `rd.css`; Hubot Sans from the live pages; the ease-out and ease-in-out curves from `entry.css`; the logo vectors from `assets/brand/*.svg` via `npm run sync:brand` (a test fails if they drift). Nothing was invented. Projects that are not Quiet Bands use `studio-paper` or a theme of their own.

## Licences

Remotion is free for individuals and companies of up to three people; larger teams need a [Remotion company licence](https://www.remotion.dev/license). Hubot Sans is SIL Open Font License 1.1. No paid service or API is called anywhere in the pipeline.
