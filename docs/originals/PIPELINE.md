# QUIET BANDS ORIGINALS · PRODUCTION PIPELINE

How a cinematic anime shot gets made here, from an idea to a finished frame, and which part becomes the course.

Status: stages 1–5 are built and proved on Test 01 (`docs/originals/test-01`). Stages 6–10 are designed but untested.

---

## The problem this pipeline exists to solve

Generative video can make a beautiful two-second clip. It cannot reliably:

- keep a character's face, costume and props identical while the camera orbits 360° around them;
- keep a space consistent, so a pillar stays where it was when the camera comes back around;
- hold a timing plan where 10 seconds of action plays across 25 seconds of film at three different speeds;
- land a hit where the weapon actually meets the target.

Those four failures are what makes AI anime look like a slideshow, a motion comic or an inconsistent montage. All three locked camera moves depend on exactly those four things. So the pipeline settles space, time and camera **before** any image is generated, and treats generation as a rendering step, not a directing step.

## The stages

| # | Stage | Output | Status |
|---|---|---|---|
| 0 | **Rights gate.** Decide whose story this is. | A written yes from the rights holder, or an original | **Open** (see `README.md`) |
| 1 | **Choreography in world time.** Every body, prop and projectile as positions over seconds of action, with real gravity. | `shots.mjs`: rootL, rootB, BELL_PATH, poses | Done for Test 01 |
| 2 | **The time remap.** One speed curve maps film time to action time. This curve *is* the bullet-time design. | `SPEED` | Done |
| 3 | **Camera rigs.** Turntable keys (target, azimuth, elevation, distance, lens) per shot. | `SHOTS[].keys` | Done |
| 4 | **Continuity tests.** Automated checks: the freeze lands on the apex, clearances, the lens never inside geometry, the 180° line. | `tools/previs.test.mjs` | Done, 8 checks |
| 5 | **Previs animatic.** Grey blocking, real geometry, temp sound, burn-ins. Lock timing here. | `previs/animatic.mp4`, storyboard, plan | Done |
| 6 | **Look development.** Final character designs, model sheets (turnaround, expressions, hands, the fork and the bell), environment paintings, 3–5 style frames on locked previs frames. | Style frames on the exact previs cameras | Next |
| 7 | **Control passes.** Export per frame from the previs: depth, normals, line art, character masks, camera matrices. | Image sequences per shot | Next |
| 8 | **Final render.** See the options below. | Shot plates | — |
| 9 | **Comp, effects, grade.** Rain, ring and debris as their own passes; grade to the colour script, signal rule enforced. | Graded shots | — |
| 10 | **Sound and delivery.** Real recordings mixed to the cue sheet. A 2.39 master plus a 9:16 cut-down. | Master, social cuts | — |

## Stage 8: the honest options

| Option | How | Strength | Weakness |
|---|---|---|---|
| **A. 3D toon render** | Rebuild the previs in Blender with final models; toon shaders and Grease Pencil lines | Total control; orbits stay perfectly consistent | Slowest; needs real modelling and rigging skill or budget |
| **B. AI video-to-video** | Feed the control passes and character references to a video model, shot by shot | Fastest route to a rich, painted look | Identity drift across long orbits; hard to art-direct frame to frame |
| **C. Hybrid** | 3D toon for the orbits (Moves 01 and 03) and anything the camera circles. AI and 2D for impact frames, effects, establishing paintings and the exterior | Consistency where it matters, speed where it doesn't | Two toolchains to keep in one look |

**Recommendation: C.** The orbits are where generative video breaks, and they are the signature. Keep them geometry-driven. Let generation handle the parts that do not need to survive a 360° turn. Before committing, run a two-day spike: one 4-second orbit from MOVE 01 through option B. If identity holds across the turn, B gets a bigger share.

## The 9:16 cut-down

Orbits keep the subject at frame centre, so a centred 9:16 column survives most of the sequence. The live previs has a "9:16 safe column" toggle that shows it. The exterior final frame does not survive, so plan a separate vertical framing for the last 4 seconds.

## What becomes the course

The teachable asset is not the 25-second clip. It is the method that makes the clip repeatable:

1. **Two clocks.** Bullet time is a speed curve, not an effect. One curve drives all three moves.
2. **Turntable rigs.** Every camera move is five numbers per key. Anyone can read them, change them and reuse them.
3. **Rain is the clock.** Streak length equals shutter times speed, so the audience reads time before any character moves.
4. **The reveal list.** Every held moment must name what each quadrant of the orbit shows. If a quadrant reveals nothing, cut the orbit.
5. **Continuity as tests.** The checks a supervisor would make, as code that fails loudly.
6. **The signal rule.** One accent colour, reserved for force.

Each of these is a lesson with a working file behind it. The previs rig in `tools/previs/` is the starter kit.

## Run it

```bash
npm test                                     # continuity checks, with the rest of the site's tests
npm i --no-save playwright three@0.186.1     # once
node tools/previs/render.mjs                 # the animatic, storyboard, plan and remap (about 11 min)
node tools/previs/render.mjs --frames=77,262  # stills to tools/previs/out/ for review
```

Open `tools/previs/test01.html` through any local server (`npm run serve`, then `/tools/previs/test01.html`) to scrub the live 3D previs.
