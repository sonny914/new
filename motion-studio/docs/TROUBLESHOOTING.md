# Troubleshooting

## Environment

| Symptom | Fix |
|---|---|
| `Could not find a browser` / Remotion starts downloading Chrome | Set `QB_BROWSER` to a Chrome or chrome-headless-shell binary. On machines with Playwright's browsers at `/opt/pw-browsers`, it is found automatically. |
| `ffmpeg: not found` | Install FFmpeg (≥ 6) or set `QB_FFMPEG` / `QB_FFPROBE`. Rendering itself uses Remotion's bundled encoder; verification, delivery encoding, contact sheets and analysis need the system FFmpeg. |
| Logs full of "Detected differing memory amounts … docker run" | Harmless: Remotion compares cgroup and system memory inside containers. |
| Render is slow | Expected on CPU: ~6 fps for a busy 1080×1920 master on 4 cores. Use `npm run still` and `npm run preview` while iterating; only `render` at the end. |
| Text renders in a fallback font | The family is not registered in `src/engine/fonts.ts`. Add its local files there. |
| `npm run studio` shows a project as an error card | Its `project.json` does not validate: run `npm run validate -- <id>` for the full list. |

## Validation messages

| Message | Meaning |
|---|---|
| `Unknown preset "X". Did you mean "Y"?` | Typo in `preset`. The list of presets follows. |
| `Unrecognized key(s) in object: 'colour'` | Schemas are strict: misspelt params fail rather than being ignored. |
| `Time "s9+2" does not start with a known scene …` | Times refer to scenes by id. `s3+8`, `s3.end-0.5s`, `start-8`, `end-1s`. |
| `Anchor "@title.start" does not exist. "title" publishes: …` | Use one of the anchors listed (the preset catalog lists them too). |
| `Circular references between …` | A layer and a path (or two layers) each wait for the other's anchors. Pin one of them to a fixed position, or, in a preset, move the reference to `refs.renderPaths`. |
| `BrandLockup draws the brand logo, but theme "…" has no logo` | Brand presets need the `quiet-bands` theme. |
| `Missing audio file "assets/…"` | Paths are relative to the project folder. |

## QA failures

| Check | What to do |
|---|---|
| `text overflow` | Text at rest leaves the canvas. Reduce `size`, use `"size": "fit"` with `fitWidth`, or split the line. |
| `safe margins` | Text at rest crosses platform UI zones. Move it, or, if a camera move is meant to push it out, declare it under `qa.allowUnsafe` with a reason. |
| `blank frames` | A run of single-colour frames longer than `qa.maxBlankRun`. If intended (a cut to black), add the range to `qa.allowBlank`. |
| `holds` (informational) | Still stretches ≥0.5 s. Keep only the ones you can name. |
| `frame count` / `duration` | A layer or audio track extends the render, or `duration` disagrees with the scenes. |
| `file size` | Over `export.targetMB` even after the two-pass retry: shorten, lower `export.bitsPerPixel`, or raise the target. |
| `true peak` | The audio bed or a track is too hot; lower track `volume` or cue gains. |
| `colour: …` | A decoded brand colour drifted. Check the theme tokens and that nothing is semi-transparent where it is sampled. |
| The render refuses: "The preview failed QA" | Read `output/<id>/report.md`. `--force` exists for emergencies; the report will still show the failure. |

## Visual problems seen in production

See "Common fixes" in [`PRESET_CATALOG.md`](PRESET_CATALOG.md): each entry is a real problem met while making the first two pieces, with its cause and fix.
