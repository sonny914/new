# QB Capture

Turns a finished Claude Code session into an evidence-backed motion-graphics recap. Requirements and design: [`docs/QB-CAPTURE-MVP.md`](../../docs/QB-CAPTURE-MVP.md). Output goes to `docs/sessions/<key>/`.

```
npm run capture -- run --transcript ~/.claude/projects/<project>/<session>.jsonl   # steps 1–6: evidence → story → storyboard → silent preview
npm run capture -- run --ccr docs/sessions/<key>/evidence/ccr-session.json --key <key>   # a cloud session exported from the session API
npm run capture -- run --events <list_events dump> --meta <session.json>   # any session the account can read, incl. Remote Control ones
npm run capture -- run ... --footage <file>   # add footage the founder supplies; accepted only if its size matches the session's record
npm run capture -- run ... --plan-only        # stop after the storyboard (fast; use while writing editorial.json)
npm run capture -- stills --key <key> [--at 3,12.5] [--formats 16x9]   # review frames, no encode
npm run capture -- script --key <key>         # narration lines and where each recording goes
npm run capture -- approve --key <key> --by "<who said yes>" --voice <higgsfield voice id>   # only after an explicit yes
npm run capture -- final --key <key>          # re-time to the recorded narration and render the final cut
npm run capture -- doc <documentary.json> --check   # documentary mode: check a hand-approved storyboard of real footage
npm run capture -- doc <documentary.json> --stills 2,14 --formats 16x9,9x16   # review frames
npm run capture -- doc <documentary.json> --formats 16x9,9x16 [--narration <dir>]   # preview (no voice), or the final cut once every line is recorded
```

Documentary mode is for creative work, where the footage is the story: see "Documentary mode" in the MVP doc. Its storyboard and media can live outside the repo (frames are cached next to the storyboard), and its measurements come from [`analysis/`](analysis/README.md).

Needs Node 20+, FFmpeg and Playwright's Chromium (preinstalled in cloud sessions; locally `npm i --no-save playwright && npx playwright install chromium`).

| File | Role |
|---|---|
| `cli.mjs` | the commands above |
| `hook.mjs` | SessionEnd hook (wired in `.claude/settings.json`), guarded against recursion |
| `lib/ingest.mjs` | transcripts, session-API exports, commits by `Claude-Session` trailer, GitHub PRs |
| `lib/events.mjs` | the cited event list and the metrics table |
| `lib/story.mjs` | goal → process → obstacle → correction → result → lesson |
| `lib/storyboard.mjs` | scene selection per format, narration-driven timing, caption cues |
| `lib/validate.mjs` | the evidence gate every render passes through |
| `lib/assets.mjs` | committed media, page walk-throughs, before/after stills |
| `lib/render.mjs` | Playwright frames → FFmpeg; score, narration and subtitle mux |
| `lib/score.mjs` | the synthesized score |
| `lib/documentary.mjs` | documentary mode: beats, narration placement, the no-talking-over-dialogue and every-number-cited checks |
| `analysis/` | measurements of footage (mouth movement against voice, mouth and eye tracks), Python + MediaPipe |
| `stage/` | the motion-graphics templates (`stage.js`), styles and vendored fonts (OFL) |

Tests: `tools/capture.test.mjs` (part of `npm test`). Changes: [`CHANGELOG.md`](CHANGELOG.md).
