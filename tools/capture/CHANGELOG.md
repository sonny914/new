# QB Capture changelog

QB Capture documents its own development here. Sessions that change `tools/capture/` are also recapped like any other work; runs of the capture itself never are (see `lib/guard.mjs`).

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
