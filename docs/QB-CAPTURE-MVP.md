# QB Capture — MVP requirements (v2: the recap is a film)

**Changed 29 Oct 2026.** A written session report is no longer the primary output. Every captured Claude Code session produces an automatically assembled, evidence-backed motion-graphics recap. The report is the evidence behind the film, not the deliverable.

**Success criterion:** the founder finishes working, watches the generated recap, and can understand and share what was done without reconstructing the session by hand.

---

## 1. Deliverables per session

All outputs live in one archive folder per session, `docs/sessions/<yyyy-mm-dd>-<slug>/` (the folder name is the *recap key*). Every JSON file carries the full `session_id`; the MP4s carry it in their `comment` metadata.

| File | What it is |
|---|---|
| `session-recap-16x9.mp4` | **Primary deliverable.** 1920×1080, 30 fps, H.264 + AAC, captions burned in and as a soft subtitle track. |
| `session-recap-9x16.mp4` | Vertical social cut (1080×1920), made only when the session has real footage *and* an obstacle or result to tell. Otherwise the storyboard records why it was skipped. |
| `session-report.md` | The written narrative. Every statement cites the events it rests on (`[E07]`). |
| `session-events.json` | The normalized, time-ordered event record with source refs, plus the metrics table (the only numbers a recap may state). |
| `session-storyboard.json` | Story stages, omitted stages and why, scenes per format, timing, narration, caption cues, validation result, approval record. |
| `session-captions.srt` | Captions for the 16:9 cut. |
| `session-assets.json` | Every asset used, with provenance: commit, capture method, viewport, sha256. |
| `production-log.md` | How the recap was made: each run, its decisions, validation, credits spent, approvals. |
| `editorial.json` *(optional)* | The editorial pass: re-worded narration and on-screen text in the founder's voice. It is validated like everything else. |
| `evidence/`, `assets/`, `narration/` | Raw exports and API responses, captured footage and stills, recorded voice lines. Together these make the archive reusable. |

## 2. Architecture decision

**Chosen: deterministic HTML/CSS scene templates, rendered frame by frame in headless Chromium (Playwright), encoded and mixed with FFmpeg.** Code is in `tools/capture/`.

| Option | Verdict |
|---|---|
| **Remotion** (React + its own bundler and renderer) | Rejected for the MVP. It is capable (compositions, captions, audio sync, aspect ratios), but it adds a React/TypeScript build, about 200 MB of dependencies and a separately downloaded browser to a repo that ships a zero-dependency static site. Its license needs checking if the company grows past three people. The open `motion-studio/` PR (#18) shows the cost: a separate package that never merged. It stays the upgrade path if the template library outgrows hand-timed scenes. |
| **React-based motion graphics without Remotion** | No gain over plain DOM here. Every frame is set from a pure function of time, so no reconciliation is needed. It would only add a build step. |
| **FFmpeg alone** (drawtext, overlay filtergraphs) | Rejected. Kinetic type, a story spine and semantic timelines in filtergraphs are unmaintainable and can't reach a studio finish. FFmpeg does what it does best: encode, concatenate, mix, loudness, subtitle tracks. |
| **HTML/CSS + Playwright + FFmpeg** | **Chosen.** It is the stack the repo already uses for reels (`tools/reel/render.mjs`), and Playwright and FFmpeg are already installed. It uses the site's real typeface and brand files, adds no dependencies, and renders identically every run: `stage.seek(frame)` is a pure function, with no CSS animation and no clocks. Real footage is stepped frame by frame from decoded JPEG sequences. |

Measured on the acceptance run (4-core container): about 10 frames per second with 3 parallel workers. The 87 s landscape cut took 4.7 min and the 37 s vertical 1.9 min.

**Capabilities and where they live**

| Requirement | Implementation |
|---|---|
| Animated typography | Word-masked rises, accent phrases, counters (`stage.js`: `words`, `rise`) |
| Dynamic timelines | `timeline` template: semantic zoom with an anchored camera (burst → wait → ending); labels fade when crowded |
| Project milestones | `merge` template: branch/main lanes, commits and PR merges as drawn nodes |
| Before/after comparisons | `beforeafter`: the page one commit before the session vs its last commit, framed on the largest changed hunk, with a wipe |
| Screenshots and screen recordings | `browser`: a page walk-through recorded with a frozen, stepped clock (deterministic orb animation included) |
| Real production B-roll | `device`: media the session committed, decoded to frames and played in a device frame |
| Callouts and diagrams | Note lists with drawn ticks, the git-lane diagram, the strike-through on removed files |
| Sessions without git | `brief` (a written spec as a sheet), `console` (the logged commands typed out with their readouts), `transform` (bytes in → bytes out, with what must not change), `exchange` (question and answer; the spine moves from Obstacle to Correction on the answer), `compare` (the session's own "asked for / got" table) |
| Camera-style transitions | Every cut is a push with scale and parallax; the timeline is a three-move camera |
| Branded intro and ending | `intro` / `outro`: the supplied mark and wordmark SVGs (never typeset) |
| Narration sync | Scene length = lead + spoken length + tail. Estimated for previews, measured from `narration/<format>/<scene>.mp3` once recorded |
| Captions | Phrase cues timed across each scene's speech span; drawn in the picture and written as SRT and `mov_text` |
| Multiple aspect ratios | One storyboard, two layouts (`.f16x9`, `.f9x16`); the vertical keeps social UI safe zones clear |
| Score | Synthesized (`score.mjs`): a drone, one chord per stage, a riser and thump on every cut, ducking under speech. No licensed music. |

**Visual identity** (from `qb-identity`): black `#000` ground, cream `#F2EEE5` type and hairlines, orange `#FF5A00` for the one live item in a shot (the wait, the removed file, the open checks, the key word). Hubot Sans, the site's typeface, plus JetBrains Mono for evidence labels; both OFL and vendored. No glow, bloom, glassmorphism or HUD decoration. A quiet story spine and an evidence clock with the source of each shot are the only chrome.

## 3. Story construction

Verified events become **GOAL → PROCESS → OBSTACLE → CORRECTION → RESULT → LESSON**. A stage without evidence is **omitted**, and `session-storyboard.json` records why.

- **Goal:** the founder prompt whose turn produced a commit or PR, quoted verbatim.
- **Process:** what that turn produced (commits, pages, media, PRs), with its duration and agent steps.
- **Obstacle:** only what the record shows: a founder complaint ("why isn't…", "not working"), a mistake Claude admitted, a failing test or tool, a file the session added and later had to remove, or a PR that sat for over a day.
- **Correction:** what happened after the obstacle: merges, fix commits, removals, passing tests.
- **Result:** the end state, plus anything the session said it **could not verify**. Those are shown as *Not verified*, never dropped.
- **Lesson:** drawn by rule from an obstacle and its correction pair (an unmerged PR, a self-reverted file, a failure then a fix). No pair, no lesson.

**Evidence levels:** `none` (nothing but capture activity) makes no recap. `thin` (talk only, no commits or artifacts) makes a short factual recap with no vertical cut. `full` makes the whole arc.

**The validator** (`lib/validate.mjs`) runs before every render and blocks it on any error:
1. Every scene cites events, and every cited event exists.
2. Every number on screen or in the script comes from the metrics table, or appears in the text or data of an event that scene cites. Spelled-out numbers count. Digits inside identifiers (SHAs, branch names) don't.
3. Dates and times are matched as whole tokens against the cited events' own timestamps. A bare "12" can't pass because something happened on the 12th.
4. Derived counts ("four platforms") list their items, and each item must appear verbatim in the cited text.
5. Every asset a scene uses is registered with provenance.

The editorial pass may re-word anything. It can't add a fact the validator can't trace.

## 4. Voiceover

- The script is written per scene in the founder's voice: first person, short, blunt, no hype. The automatic draft uses templates; the editorial pass (Claude in-session, or the founder) rewrites it.
- **Voice:** only the founder's own Higgsfield voice, **`flighty`** (`voice_type: element`, `0888f943-90ae-47cf-8152-962889806dc5`), confirmed with `list_voices` before use. No stand-in voice, ever.
- **Paid generation needs an explicit yes,** recorded with `cli.mjs approve --by <who> --voice <id>`. `final` refuses to run without that record. Higgsfield doesn't price text-to-speech in advance, so the flow generates one line, reports its charge, then does the rest.
- **Fallback:** the silent preview (score plus burned-in captions) is always available and is what step 6 produces. A local voice is not used as a placeholder, so no other voice can be mistaken for the founder's.

## 5. Automation

| Step | Command | Who |
|---|---|---|
| 1. Finalize the captured activity | `cli.mjs run`: transcript (`--transcript`), a saved `list_events` dump (`--events`, plus `--meta`), or an archived record (`--ccr`) → `session-events.json` | automatic |
| 2. Collect media and file references | commits found by the `Claude-Session` trailer (local and remote ids), PRs via the public GitHub API (cached), committed media, page walk-throughs, before/after stills; for sessions without git, the session's own probes, renders and delivered files | automatic |
| 3. Factual narrative | `story.mjs` → `session-report.md` | automatic |
| 4. Select scenes | `storyboard.mjs` | automatic |
| 5. Build the storyboard | `session-storyboard.json` (+ `editorial.json` if present) → validator | automatic + editorial |
| 6. Silent preview render | both formats | automatic |
| 7. Present for review | send the MP4s and open items | Claude, via the `qb-capture` skill |
| 8. Paid narration | `approve`, `script`, Higgsfield `generate_audio` per line | **founder's yes required** |
| 9. Final render | `final` re-times scenes to the recorded audio | automatic after 8 |
| 10. Archive | the session folder, committed on a branch, draft PR | Claude; no publishing or deploys |

**Triggers.**
- The `SessionEnd` hook (`.claude/settings.json` → `tools/capture/hook.mjs`) starts steps 1–6, detached, when a session ends. Opt out with `QB_CAPTURE_AUTO=off`.
- The `qb-capture` skill ("/qb-capture", "wrap up") runs the whole flow inside the session, including the editorial pass and the review.
- In cloud sessions the container can be reclaimed after the session ends, so the skill is the dependable path there.

**Never without approval:** spending credits, publishing, deploying.

## 6. Self-documentation and recursion

- QB Capture documents its own development: `tools/capture/CHANGELOG.md` records each improvement. Sessions that change `tools/capture/` are ordinary work and get recapped like any other session (their commits are tagged `self-dev`).
- **No recap chains.** There are three layers:
  1. **Environment.** Capture processes run with `QB_CAPTURE_ACTIVE=1`, and the hook exits when it sees it.
  2. **Content.** Turns that only run the capture (its CLI, its archive, its narration calls) are `capture-run`. Commits that only write `docs/sessions/` are `capture-output`, and so is the media inside them. A session made only of these has evidence level `none` and gets no recap.
  3. **Ledger and lock.** `docs/sessions/index.json` records each captured session and its transcript hash, and a lock prevents concurrent captures.

  The tests cover each layer (`tools/capture.test.mjs`).

## 7. First acceptance test: the result

**Session:** `session_01E33KRahnfgaMJD2zhcyZuQ`, "Orbs in repo", 12 → 20 Oct 2026. Completed. Five prompts, PR #20 and PR #23, both merged.

**Archive:** `docs/sessions/2026-10-12-orbs-in-repo/`.

**Evidence:** five verbatim prompt/reply pairs exported from the session API, two commits found by trailer, two merges, two PRs, the committed 15 s reel, a recorded walk-through of `/experiments/thinking-orb/`, and a before/after of `/rd/#experiments` (2afcbb8 vs 20c1a03). That makes 23 events and 21 metrics.

**Story found automatically:**
- **Goal:** port the orb, make a reel.
- **Process:** about 10 minutes and 53 steps; 14 files.
- **Obstacle:** PR #20 sat unmerged for 8 days, and the founder asked why the page wasn't on the site. A 2.6 MB stray file was admitted.
- **Correction:** both PRs merged; the file was removed.
- **Result:** includes two *not verified* items: the live site (blocked from the environment) and a real phone.
- **Lesson:** "Finished isn't shipped until it's merged."

**The validator caught**, during development, computed numbers with no source ("+6 more", a size string) and the claim "8 days as a draft". The record proves the PR was *opened* as a draft and stayed unmerged for 8 days, not that it stayed a draft, so the label became "8 days unmerged".

**Output:** an 87 s 16:9 preview and a 37 s 9:16 preview, silent (score plus burned-in captions). The founder's Higgsfield voice is available; paid narration awaits approval.

Reproduce:
```
node tools/capture/cli.mjs run --ccr docs/sessions/2026-10-12-orbs-in-repo/evidence/ccr-session.json --key 2026-10-12-orbs-in-repo
```

### Second session: THE BLOCK, Part 1 review export (no git, on the founder's PC)

**Session:** `session_01PegcJMwMrAZEXGSqkcgcwC`, 28 Oct 2026. It ran through Remote Control on the founder's Windows PC, with no repository, so there are no commits or PRs.

**How it was captured:** the evidence is the session's own tool calls.
- Each single-probe ffprobe readout becomes measurements.
- The ffmpeg run becomes a render event (two passes).
- `SendUserFile` becomes the delivered artifact.
- Claude's question to the founder becomes its own event.

**Story found automatically:**
- **Goal:** the pasted spec, shown as a spec sheet.
- **Process:** measured the master (1,104,772,890 bytes, qtrle 1080×1934), two-pass encode, measured the result (1,078,106 bytes, H.264 540×960, 233 frames, 7.778 s).
- **Obstacle:** no file was called "Part 1 rough v3", so Claude exported the only cut, said so, and asked.
- **Correction:** "Yes, that's it".
- **Result:** includes one *not verified* item: no captions were seen, and only one frame was checked.
- **Lesson:** "Flag the guess. Then get the yes."

**Output:** a 74 s 16:9 preview. The vertical cut was skipped because the session's footage lives on the founder's PC. `run … --footage THE_BLOCK_PART1_REVIEW.mp4` adds it, but only if the file is exactly the 1,078,106 bytes the session recorded.

**Privacy:** raw session dumps are never archived. The archive keeps a redacted record:
- home folders become `~`;
- injected system text is dropped;
- `ls` owner and group columns are scrubbed;
- tool output is kept only where it became evidence (for probes, only the key=value readout).

The first scan of this archive caught a username in an `ls` listing and a folder path in a tool input. Both rules exist because of it.

## 8. Documentary mode (creative work)

**Why it exists:** the automatic recap tells the story of what the computer did. For creative work, the founder's correction was that the story is the work itself:
- what was being made;
- what went wrong on screen and why;
- what changed;
- whether it worked.

**Two outputs, never merged:**
- **The creative review:** findings labelled verified, suspected, subjective or not established, with frame evidence.
- **The technical report:** sources, the take map, the measurement method.

The documentary script is written in plain language from the review, never from the technical report.

**How it is built** (`node tools/capture/cli.mjs doc <documentary.json>`):
- **Footage:** real takes only, each with its own sound. Nothing is generated for the documentary, and no fix is shown that wasn't made. Footage that isn't available marks its scene incomplete; it is never filled with other material.
- **Narration:** it never talks over dialogue. It speaks over held frames or quiet stretches, and the checker refuses any overlap. If a recording runs long, the next loud stretch waits.
- **Numbers on screen:** each one is a cited fact. A measurement fact is recomputed from the analysis files and must match to the digit shown.
- **Freezes and zooms are editorial devices:** every held frame is labelled "Frozen" with its source time, and the take is named on every panel.
- **Approval gates:** findings, B-roll selections and the script are approved before the final render. Paid narration needs its own yes.

**Measurements** (`tools/capture/analysis/`, see its README):
- **Mouth opening:** per frame from face landmarks.
- **Voice:** from band-passed audio.
- **"Mouth moving, no voice":** mouth movement outside a 0.2 s guard around voice. It is an upper bound, since a smile forming also counts, so long cases are confirmed by eye.

**First use:** THE BLOCK, about 75 s, 16:9 and 9:16. Its storyboard, footage, review and report are private and kept outside this repo.

## 9. Known limits

- Caption timing inside a scene is proportional to characters, not force-aligned to the recorded voice. Scene boundaries are exact.
- Obstacle detection is rule-based (phrases, PR latency, self-reverts, failures). It misses obstacles the record doesn't state, by design.
- A cloud session whose container is gone needs its turns exported through the session API first (the skill does this).
- The SessionEnd hook may not get to finish in a cloud container that is reclaimed right away; use the skill there.
- 30 fps only; no motion blur.
