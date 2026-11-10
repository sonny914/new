# QB FILM 003: THE MONEY CHASE. Production report

## Output

| | |
|---|---|
| **Runtime** | **74.87 s** (2,246 frames at 30 fps). The runtime is set by the real speech; nothing was sped up |
| **Format** | 1080×1920 vertical, H.264 (CRF 19, max 9 Mb/s), AAC 192 kb/s, 48 kHz stereo |
| **Loudness** | −14.9 LUFS integrated, −1.4 dBFS peak (target −14 / −1.5 dBTP) |
| **Location** | `tools/motion/films/003-money-chase/out/` on branch `claude/peaceful-keller-zzciw4` (draft PR #35) |

The folder holds:
- `QB_FILM_003_MONEY_CHASE_FINAL.mp4` (with captions)
- `QB_FILM_003_MONEY_CHASE_CLEAN.mp4` (no captions)
- `QB_FILM_003_MONEY_CHASE_CAPTIONS.srt` (all 22 cues)
- `QB_FILM_003_MONEY_CHASE_SCRIPT.md`
- `QB_FILM_003_MONEY_CHASE_CONTACT_SHEET.png` (24 frames)
- this report
- `QB_FILM_003_MONEY_CHASE_SOURCE/`, a snapshot of the composition, the engine, the story kit, the renderer, and the narration, sound and caption scripts with the timeline

## Voice

- **Voice:** the authorized Flighty voice, a Higgsfield custom voice element (`seed_audio`, element `0888f943…`, 48 kHz). No other voice was used, and there is no substitute TTS.
- **Takes:** 17 new takes plus the series sign-off take ("Quiet Bands. Build what matters.") reused from Film 001, so the end card sounds the same across the series.
- **Clipping fix:** the engine clips the last word of a line. Each line was therefore generated with a throwaway word after it ("Alright." or "Okay, next."), and that word was cut at the silence before it.
- **Hand cuts:** four takes had no clean gap before the tail and were cut by hand at measured word gaps (05, 08, 13; 09 was retaken).
- **Retakes:** three takes had implausible timing and were regenerated (04, 09, 10).
- **Checks:** every take ends in silence and speaks at a plausible 2.0–4.3 words per second.
- **Limitation:** I can't listen to audio, so these are measured checks, not a listening check. One listening pass is the remaining QC step.

## Rendering methods

- **Engine:** the Quiet Bands deterministic canvas engine (`tools/motion/engine`), rendered frame by frame in headless Chromium via Playwright. It uses 4-sample motion blur, then ffmpeg for encoding, caption overlay and the mix. Same frame number, same pixels.
- **New in this film: `engine/world.js`**, a 3D world kit on the existing pinhole camera:
  - a **look-at camera** with shot-to-shot blending;
  - **solid boxes** that can be seen from any side (needed for the orbit) and **wireframe architecture** with floor rungs;
  - **the figure seen from any side**: a new symmetric back/front view that runs, blending into the existing profile figure as the camera moves round him;
  - **the money beacon**, long floor **shadows** cast from it, and **paths with pulses** for every exchange.
- **One continuous world:** the film is one 3D floor plan explored by a single camera, with no cuts and no crossfades between scenes.
  - The corridor and its monoliths lead into a 3 m-grid hustle maze with five named offers, two dead-end walls and a loop.
  - The maze leads to the plaza, where the activity machine is built. A network of 10 customers and 5 makers runs through the same streets.
  - The fork is drawn on the plaza floor. Distant giant structures give the world its scale.
- **Why not Three.js, Remotion or Blender?** The look depends on the engine's line weights, halo bloom and grain, and on the series' 2D figure. A true 3D camera over that 2D art is exactly what `cam3` already does, so the camera got the third dimension it needed (orbit, any-side geometry) without changing the series look. It's a deliberate choice, not a gap.

## Major creative decisions

1. **The reveal is built around one camera move.**
   - The 180° orbit goes from low behind the figure to high in front, while the radius, height and field of view widen.
   - The machine he built sinks into the floor while a network spreads outward from him: people with problems, makers, and the streets between them.
   - The money, which floated out of reach for 37 seconds, comes down to a customer. It was theirs to give.
   - Orange only ever travels a path after a solution has reached that customer.
2. **Script order:** the GET/GIVE line now comes after "attention ain't a business model". The arc then runs urgency, temptation, acceleration, exhaustion ($0), revelation, clarity. (Details in the script document.)
3. **Orange is the money, and only the money:**
   - the beacon;
   - the ≠ in ACTIVITY ≠ INCOME;
   - payments;
   - the PAYMENT step;
   - "they pay you" in the fork;
   - the final point.

   Everything else is cream, grey and black.
4. **The exchange reads without narration:**
   - a broken step in the customer's workflow, tagged "BROKEN STEP";
   - he carries the missing piece over and sets it in the gap;
   - the customer's flow runs through and the goal lights up;
   - only then does the orange arc carry the money from the customer to him.

   A PROBLEM → SOLUTION → VALUE → PAYMENT strip lights up step by step.
5. **The two questions are two paths on the floor.**
   - Path A ("How do I make $10,000?") breaks into named dead ends: app, course, dropship, agency, automation, newsletter.
   - Path B ("What problem is worth solving?") meets, in order: a costly problem, a specific customer, how they cope now, your solution, a testable offer.
   - It then closes the loop with orange: they pay you.
6. **The camera tells the psychology:**
   - **The chase:** low, close, following.
   - **The maze:** behind and above, swinging with each wrong turn.
   - **The activity trap:** overhead, turning slowly, then coming down to isolate him.
   - **The reveal:** the orbit.
   - **The exchange:** stable, level and balanced.
   - **The fork:** directly overhead.
   - **The end:** a slow descent to him, then the monumental pull-back.
7. **Captions:** 14 lines are burned in cream, with orange on "money", "give", "value" and "what makes it move". Eight lines are carried on screen instead (counters, ACTIVITY ≠ INCOME, the two questions, the fork's labels, the end card), so nothing is said twice. All 22 lines are in the SRT.
8. **Sound:** original, synthesised with numpy, and seeded.
   - **The chase:** a distant mechanical pulse that speeds up, and footsteps placed from the figure's actual route (stride changes when he runs). Each offer lights with a rising whoosh and a ping; dead ends land as thuds; bills land as paper.
   - **The trap:** assembly clicks that multiply.
   - **$0:** one sub impact and a hard cut to silence.
   - **The reveal:** a wide open-fifth pad and a gentle major chord as the money comes down.
   - **The exchanges:** a soft chime for each one.
   - **The followed exchange:** a dull buzz for the broken step, placement clicks, a "works" tone and a two-note confirmation for the payment.
   - **The end:** the series end sting.

## Quality control done

- **Picture:** inspected stills across the film after three rounds of fixes.
  - The chase camera was too tight.
  - Maze blocks near the camera blocked the view; they now fade near the lens, and tall blocks are kept off the route.
  - The orbit's end frame and the exchange were cluttered. The maze dims during the reveal, and the network got brighter, with floor rings.
  - A path in the fork drew too early (a bug).
  - The coin was hidden behind the figure in the chase.
  - The headline overlapped the beacon in the trap.
- **Export:** both exports have exactly 2,246 frames at 74.87 s. Loudness was measured on the final file. The contact sheet was made from the final MP4, not from stills.
- **Logo:** the end card uses the actual `assets/brand/mark.svg` and `wordmark.svg` paths. They are not redrawn and not typeset.

## Unresolved limitations

- **No listening pass.** As above, the narration and mix are checked by measurement only.
- **The orbit reveal is the strongest moment, but it is dense on a phone.** The network people are small at the end of the orbit. If it needs more punch, frame the end of the orbit tighter on the half of the network nearest him. That's a camera-key change, not a rebuild.
- **During "…and still be broke"** the beacon sits just beside the $0 counter in the overhead shot. It reads as intended (the money, near and out of reach), but it's close to the type.
- **Footstep sync** follows the route model; for fast sections it's approximate, not foot-contact exact.
- **The figure seen from behind is new.** It keeps the series proportions but has no profile-run pose, so side-on running is never shown; the camera is kept behind him while he runs.
