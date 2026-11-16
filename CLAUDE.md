# Quiet Bands: notes for Claude

This repo holds the Quiet Bands site (static, deployed from the root by Netlify) and the tools behind the founder's build-in-public work. Read this before working here. Brand and lighting rules are in the `qb-identity` skill.

## Hard rules

- **Real footage only.** No stock footage. Never use generated footage in place of something that really happened. If a shot is missing, report it; don't substitute.
- **Never invent a fix or fake a before/after.** Both panels of a comparison are real frames: "before" is the take as generated, "after" is the edit as it was actually made.
- **Every number on screen needs a source.** QB Capture's fact check enforces this. Add a cited fact rather than working around the check.
- **Don't publish, post or deploy** anything without the founder's explicit yes for that item.
- **Don't spend generation credits** (Higgsfield) without approval, unless the founder has set a budget for the job.
- **Never typeset a stand-in HARLEM ’88 logo.** Watermarked finals need the approved logo file. Without it, render previews only.
- **SPIRITED Visual Library images are other artists' reference art.** They never appear in a video or post.
- **Credit what we use:**
  - SPIRITED is created by Myles. Say so.
  - Its prototype runs on Quiver's "Downtown Beatdown" beat-'em-up template (art CC BY 4.0, code MIT). Any video that shows it credits Quiver on the end card and in the description.

## Privacy (this repo is public)

- Never commit:
  - the founder's email;
  - tokens or signed upload links;
  - raw session dumps.
- Footage and renders of unreleased projects (HARLEM ’88, SPIRITED) stay out of the repo unless the founder says otherwise.
- No model names or IDs in commits, PRs or code comments.

## QB Capture (`tools/capture`)

QB Capture turns a session, or a storyboard of real footage, into 16:9 and 9:16 videos.

- **Docs:** `tools/capture/README.md` and `CHANGELOG.md`.
- **Skills:**
  - `qb-capture`: session recaps;
  - `harlem88-production-notes`: Production Notes episodes and the overlay reference.
- **Rendering a storyboard:** `node tools/capture/cli.mjs doc <storyboard.json> --out <dir> --formats 16x9,9x16`.
  - `--narration <dir>`: a narrated draft. Add `--final` for the release render.
  - `--stills 2,43`: single frames. Check stills before a full render, which takes 7–20 minutes per format.
- **Gameplay and screen recordings:** set `"wide": true` on the storyboard and `"dialogue": false` on clips with no speech.
- **Analysis scripts:** they need a Python venv and MediaPipe models (`tools/capture/analysis/README.md`). Run them with `python -I`.
- **Before sending a render,** review it frame by frame and check its duration and loudness.

## Narration (the founder's cloned voice, on Higgsfield)

- Spell numbers out in the script ("thirty-day", "one air hit"). Digits make the voice skip, garble or cut off.
- Check every take with `tools/capture/analysis/narration_check.py` before it goes into a cut, and listen to anything it marks REVIEW.
- Higgsfield's direct result links can be blocked by the network. If so, import the result as media and download it from the media library instead.

## SPIRITED capture

- **Game repo:** `sonny914/Spirited-prototype-` (Godot 4.7.2). Its art is in Git LFS, so run `git lfs pull` after cloning.
- **Recording:** use Movie Maker under a virtual display:
  `xvfb-run -a -s "-screen 0 1920x1080x24" godot --path . --rendering-method gl_compatibility --rendering-driver opengl3 --write-movie out.avi --fixed-fps 30 <scene>`
- **Bot playthroughs:** `debug_tools/smoke_tests/playthrough_test.tscn` plays a stage with the game's own bot.
  - Its time limit counts real seconds, and the project forces a 720p window.
  - For Movie Maker runs, raise both in a scratch copy. Never commit capture-only changes to the game.
- **Later work:** the vertical slice, courtyard and Windows build live on the founder's PC. Ask them to share the folder through Remote Control rather than recreating anything.

## Before you push

- `npm test` must pass.
- Pull requests are merged with a merge commit.
