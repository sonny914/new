# QB Capture changelog

QB Capture documents its own development here. Sessions that change `tools/capture/` are also recapped like any other work; runs of the capture itself never are (see `lib/guard.mjs`).

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
