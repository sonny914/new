---
name: qb-capture
description: Turn the Claude Code session that just finished into a cinematic, evidence-backed motion-graphics recap (16:9 + 9:16 video, captions, report, archive). Use when the founder says /qb-capture, "wrap up", "recap this session", "make the session video", or at the end of a working session in this repo. Never spends credits, publishes or deploys without an explicit yes.
---

# QB Capture: the end-of-session recap

The deliverable is the **video**. The report is the evidence behind it. Requirements: `docs/QB-CAPTURE-MVP.md`. Code: `tools/capture/`.

## Rules that do not bend

- **Evidence only.** Every scene cites session events; every number must trace to a metric or a cited event. The validator enforces it and refuses to render otherwise. Never work around a validation error by inventing a source: change the words.
- **No filler.** If a stage (obstacle, correction, lesson…) has no evidence, it is left out. A thin session gets a short factual recap.
- **Voice.** Narration uses only the founder's own Higgsfield voice (`flighty`, voice_type `element`, id `0888f943-90ae-47cf-8152-962889806dc5`), confirmed with `mcp__Higgsfield__list_voices` first. Never a stand-in voice. No voice available or no approval → silent preview.
- **Money and publishing.** Paid narration, publishing and deploys each need the founder's explicit yes in this conversation. Record it with `approve` before spending anything.
- **No recursion.** Running this skill must not create a recap of itself. The CLI marks its own work as `capture-run`; don't override that.

## Steps

1. **Find the transcript.** `~/.claude/projects/<cwd with / replaced by ->/<CLAUDE_CODE_SESSION_ID>.jsonl`. For an older cloud session whose container is gone, export its turns with the claude-code-remote tools (`get_session`, `list_events kinds=[result]`, `get_event` for each `user_message_uuid`) into `docs/sessions/<key>/evidence/ccr-session.json` (format `qb-capture/ccr-export@1`, see the orbs example) and use `--ccr`.
2. **Plan.** `node tools/capture/cli.mjs run --transcript <file> --plan-only` (add `--key <yyyy-mm-dd-slug>` to name it). Read `session-storyboard.json` and `session-report.md`.
3. **Editorial pass.** Write `docs/sessions/<key>/editorial.json` in the founder's voice: first person, short sentences, blunt, no hype, digits for numbers. You may re-word narration and on-screen text, drop a scene, and add `derived` counts (each item must appear verbatim in the cited event). Re-run step 2 until validation passes.
4. **Preview.** `node tools/capture/cli.mjs run --transcript <file>` renders a silent preview (score plus burned-in captions) of both formats. Check `stills --key <key>` frames for collisions before you show anything.
5. **Present.** Send `session-recap-16x9.mp4` (and `-9x16` if made) with SendUserFile, plus a three-line summary and the open "not verified" items.
6. **Ask about narration.** Offer paid narration in the `flighty` voice. Higgsfield shows no price up front: propose generating one line, reporting its exact charge (`mcp__Higgsfield__transactions`), then the rest.
7. **On yes.** `approve --key <key> --by "<founder>" --voice 0888f943-90ae-47cf-8152-962889806dc5`, then `script --key <key>` lists each line and the file it must be saved to (`narration/<format>/<scene>.mp3`). Generate each with `mcp__Higgsfield__generate_audio` (text2speech_v2, voice_type `element`), download into place, then `final --key <key>`. Scenes re-time to the recorded audio.
8. **Archive.** Commit `docs/sessions/<key>/` on a branch and open a draft PR. Do not publish the video anywhere.
