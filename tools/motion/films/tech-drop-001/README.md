# QUIET BANDS · TECH DROP 001: CLAUDE CODE JUST LEVELED UP

A narrated 9:16 news reel in the Films 001–003 language: 1080×1920, 30 fps. The editable source composition is `tools/motion/comps/tech-drop/td001.js`. It uses the shared engine (`tools/motion/engine`, including `world.js` from Film 003) and the story kit (`comps/shared/story.js`).

## Status: picture, captions and sound are done; the narration is blocked

- **What's blocked:** the voice service (Higgsfield, the authorized Flighty voice) ran out of credits mid-batch. The balance is **0.01 credits** on the Max plan. Three takes were generated before it stopped: lines 01, 04 and 05.
- **What I didn't do:** no other voice was substituted, and no credits were bought. Both need your approval.
- **What `timeline.json` contains:** the three real takes, plus the sign-off take reused from Film 001. Lines 02, 03 and 06–14 are **provisional**, sized from their word count at Jay's measured rate.
- **What you can watch now:** `out/QB_TECH_DROP_001_PREVIEW_NO_VO.mp4`, with picture, sound design and burned captions, but no voice.
- **What's held back:** `assemble.sh` refuses to write the FINAL and CLEAN files while any line is provisional.

## Finishing it once credits are available (about 15 minutes)

1. Generate lines 02, 03 and 06–14 with the Flighty voice. Use the `PROMPT` text in `lines.py` with " Alright." appended (the throwaway word that stops the last word being clipped). Add each result URL to `vo_ids.json`.
2. `python3 fetch_vo.py`: downloads each take, cuts the throwaway word and checks each line.
3. `python3 build_vo.py && python3 sfx.py && python3 captions.py && node captions-render.mjs`: real timing for everything.
4. `node ../../render.mjs tech-drop/td001 --out=<picture.mp4>`, then `./assemble.sh <picture.mp4>`. This writes `QB_TECH_DROP_001_FINAL.mp4` and `_CLEAN.mp4` at −14 LUFS.

Every beat is found by word position (`brk`), so the real takes re-time the picture, captions and sound without any hand edits.
