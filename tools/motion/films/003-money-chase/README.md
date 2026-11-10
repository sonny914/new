# Film 003: THE MONEY CHASE

A vertical narrated editorial film: 1080×1920, 30 fps, H.264 + AAC, 74.9 s. The source composition is `tools/motion/comps/money-chase/film003.js`. The world kit it introduces is `tools/motion/engine/world.js`.

## Deliverables (`out/`)

| File | |
|---|---|
| `QB_FILM_003_MONEY_CHASE_FINAL.mp4` | With burned editorial captions |
| `QB_FILM_003_MONEY_CHASE_CLEAN.mp4` | No captions |
| `QB_FILM_003_MONEY_CHASE_CAPTIONS.srt` | Every narration line, synced to the real audio |
| `QB_FILM_003_MONEY_CHASE_SCRIPT.md` | Final narration, direction, and what is on screen per line |
| `QB_FILM_003_MONEY_CHASE_CONTACT_SHEET.png` | 24 frames across the film |
| `QB_FILM_003_MONEY_CHASE_PRODUCTION_REPORT.md` | Runtime, methods, voice, decisions, limitations |
| `QB_FILM_003_MONEY_CHASE_SOURCE/` | A snapshot of every source file for this film |

## Pipeline

Run these from this folder, in order:

1. **Narration.** `python3 fetch_vo.py` fetches each "<line> Alright." take and cuts the throwaway word. `python3 build_vo.py` trims, caps the pauses, gain-matches and sequences the takes. It writes `narration.wav` and `timeline.json`.
2. **Sound and captions.** Run `python3 sfx.py`, then `python3 captions.py`, then `node captions-render.mjs`.
3. **Picture.** `node ../../render.mjs money-chase/film003 --out=<picture.mp4>`
4. **Assemble.** `./assemble.sh <picture.mp4>` mixes to −14 LUFS / −1.5 dBTP and writes the clean and captioned exports.

Every beat (picture, captions and sound) is found in `timeline.json` by word position (`brk`). A re-recorded take therefore keeps everything in sync.

## The world (one set, explored by the camera)

The film is a single 3D floor plan. The camera moves through it; nothing is cut together.

- **The corridor (z −1…9):** wireframe monoliths that rise out of the dark as he passes.
- **The giants (|x| 14–32):** far-off architecture that gives the world its scale.
- **The hustle maze (z 9–39):** a 3 m street grid of small businesses. Each of the five named offers lights a shortcut toward the money. Two shortcuts end in walls that rise. One loops back to where he started.
- **The plaza (0, 30):** where he ends up and builds the machine: 10 apps, 5 businesses, conveyor loops and gears.
- **The network:** ten customers with a problem each, and five makers. They're joined through the same streets, and the orbit reveals them. Orange travels a path only after the maker's solution has reached the customer.
- **The exchange:** his customer, a three-step workflow with one broken link, and the piece he builds to fix it.
- **The fork:** two paths drawn on the plaza floor, seen from directly above.
