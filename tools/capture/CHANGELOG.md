# QB Capture changelog

QB Capture documents its own development here. Sessions that change `tools/capture/` are also recapped like any other work; runs of the capture itself never are (see `lib/guard.mjs`).

## 0.4.0 — 4 Nov 2026

HARLEM '88: Production Notes, a build-in-public series of short vertical episodes. Each one shows a real problem in the series' AI-generated footage, explains it, and shows the real fix. It is built on documentary mode, not as a new app.

- **Overlay library (`stage/overlays.js`):** ten components that read the measurements of the exact source frame on screen:
  - `headline`, a kinetic headline;
  - `id`, a character label that picks a side with room inside the 9:16 safe area, once;
  - `track`, brackets or a ring on the mouth or face, orange on silent frames;
  - `freeze`, a flash and a punch-in on the face;
  - `compare`, before/after labels, with a side-by-side 9:16 pair layout;
  - `timeline`, the take as a ruler: voice, silent movement, playhead, the cut and the trimmed part, hum marks;
  - `arrow`, a note beside the face that draws onto the near mouth corner;
  - `chapter`, number and title under a drawn rule;
  - word-timed subtitles with `*emphasis*`;
  - the bottom watermark, the approved logo file only.

  Type goes in the band the face isn't in, measured per frame.
- **Notes theme:** sentence-case chrome and running source timecode. A reveal wipe with a cream edge replaces the fade-and-slide between scenes. There is an `endcard` template.
- **Checks:**
  - burned-in subtitles count as on screen, so their numbers need facts;
  - overlay text is checked like labels;
  - a narrated beat waits for the line before it (0.3 s breath) instead of overlapping it;
  - a missing watermark file is a preview warning and a final-render failure.
- **Face boxes:** read from the measurement and placed in the frame size they were measured on. `mouth_sync.py` now records `width`/`height`; boxes from a different-sized copy are refused rather than mis-placed.
- **`notes` command (`lib/notes.mjs`):**
  - `intake` unpacks a creative review ZIP safely (no entries outside the folder, no symlinks, nothing executed), inventories and hashes it, parses `creative-review.md`, and ranks topics by evidence. Footage is required; a finding with only stills is reported, not made.
  - `draft` writes an evidence-linked storyboard and `script.md` in Episode 01's shape. Lines are quoted from the review and numbers are cited.
  - `package` writes captions, post copy, production notes and `approval.json`, every item pending.
- **Skill:** `.agents/skills/harlem88-production-notes`, covering the workflow, the overlay reference, the QA checklist and the Episode 01 reference.
- **Render stages:** a silent preview (`-preview`), a narrated draft (`--narration`, `-narrated`, tagged), and `--final`, which alone needs the approved logo and is named without a suffix. `notes package` reports approvals and the logged spend from the storyboard (`approvals`, `spend`).
- **Lesson from the first recording:** digits break the flighty voice. "1.4" gave one silent take and one truncated take, and a spelled-out retake of the same line came back garbled at the same 2.9 s length.
  - Spoken text now spells numbers out.
  - `analysis/narration_check.py` checks every take before use: level, syllable pace against the line, dead air, and a pocketsphinx transcript. It FAILs all three bad Episode 01 takes, flags the stray sound before n3, and passes the good ones.
  - `doc --partial` renders a narrated draft while a line is re-recorded; `--final` never accepts one.
- **Tests:** 11 new ones (91 total), including a browser render of every overlay and the Notes chrome, with and without face measurements.

## 0.3.0 — 29 Oct 2026

Documentary mode, after the founder's creative-intelligence correction: the THE BLOCK recap documented the computer work, not the film. The engine is extended, not rebuilt.

- **`doc` command:** renders a hand-approved storyboard of real footage (`qb-capture/documentary@1`), 16:9 and 9:16. Without recordings it renders a preview, with the script shown as tagged placeholder captions. With `--narration`, every line must be recorded. Burned-in captions are off by default, per the founder's rule; the soft subtitle track stays.
- **Clip scenes:** a scene is a run of beats, each either a stretch of a take playing with its own sound or a held frame.
  - **Holds:** a held frame is marked "Frozen" with its source time, and the narration speaks over it.
  - **Second panel:** an optional one shows a before/after side by side.
  - **Mouth ring:** follows the tracked mouth, and turns orange on frames measured as moving with no voice.
  - **Voice strip:** draws the take's real audio level with a playhead; room tone is kept flat so "no voice" reads as flat.
  - **Data labels:** can count up from the measurement.
- **Two checks run before anything renders:**
  - **No narration over dialogue:** narration may not overlap any stretch of footage that has dialogue or is meant to be heard. A loud stretch that comes up while a line is still running waits on its previous frame, so a longer recording re-times the cut instead of breaking the rule.
  - **Every number cited:** every number on screen must match a cited fact. Measurement facts (`clip:summary.key`, `clip:speech.i.length`, `clip:gap.i`) are recomputed from the analysis files. Record and by-eye facts are cited.
- **Mixing:** each stretch of footage sound is cut sample-accurately from its source and levelled to −18 LUFS speech before the final −16 LUFS mix. The bed ducks under footage sound as under narration, and goes silent across `bed: false` scenes.
- **Loudness with footage sound:** the mix is rendered first, measured, then brought to −16 LUFS with one fixed gain and a peak limiter. Single-pass loudnorm rides the gain, and lifted the hook's held silence from room tone to −22.5 dBFS in the first render; the post-render check caught it.
- **Plumbing:** `serveDir` takes mounts, so private media is served from outside the repo. `framesFor` takes a cache folder.
- **`analysis/`:** `mouth_sync.py` (mouth opening against voice, the "mouth moving, no voice" measure) and `track.py` (per-frame mouth and eye positions), from the THE BLOCK creative review.
- **Tests:** 4 new ones (80 total):
  - silent movement is rebuilt exactly as measured;
  - a loud stretch waits for the line;
  - narration over dialogue is refused;
  - an uncited or wrong number is refused;
  - the bed mutes.

## 0.2.2 — 29 Oct 2026

First narrated final (THE BLOCK, 84 s, the founder's `flighty` voice).

- **Pause capping:** pauses longer than 0.55 s are now held to 0.45 s in our own code (`capPauses`), on raw samples, with no change of speed or pitch. This ffmpeg's `silenceremove` stop mode barely trimmed (21.88 → 21.75 s) and hung on a clean tone, so it isn't used.
- **Levels:** each line is normalized to speech level (−16 LUFS), the bed sits at about −10 dB under the voice before ducking, and the mix lands at −15.9 LUFS with a −1.5 dBFS peak.
- **Checked:** speech starts in the final mix fall within 0.05 s of where each scene schedules them.

## 0.2.1 — 29 Oct 2026

- **Narration:** `fetch-narration` downloads recorded lines from `narration/jobs.json`. `final` trims dead air from each line before timing its scene, so speech starts with its caption.
- First paid narration (THE BLOCK, 8 lines, 5.9 credits) was generated but couldn't be downloaded: this environment's network access denies Higgsfield's file host. The skill now says to check that first.

## 0.2.0 — 29 Oct 2026

Built to recap "THE BLOCK Part 1 review export", a Remote Control session on the founder's PC with no git.

- **Ingest:** `--events` reads a saved `list_events` dump directly, so evidence is never re-typed. Injected system text is dropped and pasted content unwrapped.
- **Evidence from tools:** single-probe ffprobe readouts (Windows line endings handled), ffmpeg renders (last call, pass count), `SendUserFile` deliveries, and questions Claude put to the founder.
- **Story:** a guess Claude flags or asks about, then the founder confirms, is an obstacle and its correction, with the lesson "Flag the guess. Then get the yes."
  - "Yes, that's it" now counts as a confirmation.
  - "Not verified" detection needs real phrasing: the project name THE BLOCK had matched `\bblock\b`.
- **Stage:** five new templates: brief, console, transform, exchange, compare. A scene can now switch the spine's stage partway through.
  - Console lines used `visibility`, which showed through hidden scenes; they now use `display`.
- **Validator:** a date or time token that matches no cited event (a ratio such as 9:16) is checked as plain numbers instead of rejected. Comma-grouped numbers parse whole.
- **Privacy:** home folders become `~`, `ls` owner and group columns are scrubbed, and archived tool output is kept only where it is evidence. The intro names a repo only if the session committed to it.
- **Footage check:** `--footage` accepts a founder-supplied file only if its size matches the session's own record.

## 0.1.0 — 29 Oct 2026

First version, built and accepted against the "Orbs in repo" session (`docs/sessions/2026-10-12-orbs-in-repo/`).

- **Ingest:** native transcripts (`.jsonl`), session-API exports, commits by `Claude-Session` trailer (local and remote ids), PRs through the public GitHub API with an offline cache.
- **Events and metrics:** one cited event list; the metrics table is the only source of on-screen numbers.
- **Story:** goal → process → obstacle → correction → result → lesson. Rule-based, stages omitted without evidence, "not verified" items carried through.
- **Validator:** citations, numbers (digits and words), dates and times as tokens, derived counts, asset provenance.
  - Found during acceptance: a size string and a "+6 more" count computed on the page with no source.
  - Also found: an "8 days as a draft" claim the record doesn't support (now "8 days unmerged").
  - Also found: bare numbers passing because they matched a timestamp's day (now dates and times are checked as tokens).
- **Assets:** committed media, page walk-throughs on a frozen clock, before/after framed on the largest changed hunk.
- **Stage:** 12 templates (intro, hook, quote, stats, device, browser, timeline, merge, beforeafter, checklist, lesson, outro), a story spine, an evidence clock and source line, captions; 16:9 and 9:16 layouts.
- **Render:** parallel Playwright pages → H.264 segments → concat; synthesized score with ducking; loudness normalization; SRT and `mov_text`.
- **Automation:** `run`, `stills`, `script`, `approve`, `final`; a SessionEnd hook; the `qb-capture` skill; the recursion guard and ledger.
- **Found by the first self-documentation dry run** (QB Capture on the session that built it):
  - Commits were matched by the session id anywhere in a message, so a recap commit that names the session it documents became that session's evidence. Now only the `Claude-Session:` trailer counts.
  - A session with commits and passing tests but no merged PR lost its Result stage. Commits and the last passing test run now stand in.
  - A recap's own media (a commit that only writes `docs/sessions/`) is tagged capture output, so it never becomes B-roll for the next recap.
