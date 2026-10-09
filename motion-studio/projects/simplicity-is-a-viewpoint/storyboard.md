# Storyboard — Simplicity is a viewpoint

Generated from `project.json` by `npm run storyboard`. Edit the project file, not this page.

**1080×1920 (9:16 vertical (Reels, TikTok, Shorts))** · 30 fps · 450 frames (15s)

## 1. Structure — 0:00.00–0:03.00 (frames 0–89)

| | |
|---|---|
| Purpose | Open restrained: a system exists before anything goes wrong with it. |
| Visible content | A lattice of small crosses; COMPLEXITY rises through its baseline. |
| Composition | Black ground, 6 × 10 lattice filling the safe area, headline set flush left at full content width above centre. |
| Presets | GridAssembly, KineticHeadline, Accumulation, Accent |
| Layers | lattice, headline, clutter, point |
| Transition out | The first clutter arrives before the scene ends, so the title never sits alone as a card. |
| Audio | Soft ticks as the lattice assembles; a low thump as the word lands. (8× tick, 1× thump, 1× riser) |
| Depends on | GridAssembly, KineticHeadline |

## 2. Overload — 0:03.00–0:06.00 (frames 90–179)

| | |
|---|---|
| Purpose | Show coordination overhead piling up until it is unbearable, then stop it dead. |
| Visible content | Lines, boxes, circles, chores (FOLLOW-UP, RE: RE: FWD, STATUS?) and outlined echoes of COMPLEXITY, arriving faster and faster. |
| Composition | Everything snaps to the lattice; the camera pushes in 7% with accelerating ease. |
| Presets | GridAssembly, KineticHeadline, Accumulation, Accent |
| Layers | lattice, headline, clutter, point |
| Transition out | Hard freeze at 5.6s: build, camera and sound stop on the same frame. |
| Audio | A tick per arrival over a rising swell; digital silence at the freeze. (43× tick) |
| Depends on | Accumulation, group freeze, camera push |

## 3. Clearing — 0:06.00–0:09.00 (frames 180–269)

| | |
|---|---|
| Purpose | One point of view moves through the mess and removes what is not needed. |
| Visible content | An orange point crosses the frame on the headline's rule; everything it passes un-draws in a ripple; the rule stays behind it. |
| Composition | Camera eases back to rest. What remains: the word, one rule, four registration corners and the point. |
| Presets | GridAssembly, KineticHeadline, Accumulation, LineDraw, Accent |
| Layers | lattice, headline, clutter, rule, point |
| Transition out | Continuous: the resolved layout is the first frame of the reveal. |
| Audio | A soft air move with the point; nothing else. (1× air) |
| Depends on | Accent, LineDraw follow, ObjectDisassembly, camera pull |

## 4. The viewpoint — 0:09.00–0:12.00 (frames 270–359)

| | |
|---|---|
| Purpose | Deliver the line by changing the word, not replacing it. |
| Visible content | COMPLEXITY becomes SIMPLICITY (M P L I T Y hold, C O E X roll through), then IS A, then VIEWPOINT; the orange point lands as its full stop. |
| Composition | Three-line block centred in the safe area; heavy condensed display against a small medium-weight connective line; generous black above and below. |
| Presets | GridAssembly, KineticHeadline, Accumulation, LineDraw, MaskedTextReveal, Accent |
| Layers | lattice, headline, clutter, rule, is-a, viewpoint, point |
| Transition out | The full stop stays when the words leave. |
| Audio | A low tone under the swap; one crisp tick when the full stop lands. (1× tone, 1× tick) |
| Depends on | KineticHeadline (swap), MaskedTextReveal, Accent anchor @viewpoint.inkEnd |

## 5. Identity — 0:12.00–0:15.00 (frames 360–449)

| | |
|---|---|
| Purpose | Resolve to Quiet Bands and hold. |
| Visible content | The words drop away; the point travels to centre and opens into the mark; the wordmark rises; quietbands.com. |
| Composition | Lockup centred in the safe area, URL beneath in dim cream. |
| Presets | GridAssembly, KineticHeadline, Accumulation, LineDraw, MaskedTextReveal, BrandLockup, Accent |
| Layers | lattice, headline, clutter, rule, is-a, viewpoint, lockup, url, point |
| Transition out | Final hold of just over a second, nothing moving. |
| Audio | One warm tone as the mark opens, decaying into the hold. (1× tone) |
| Depends on | BrandLockup (iris from the accent path), MaskedTextReveal |

## Reading time

| Layer | Text | Rests | Needs | |
|---|---|---|---|---|
| headline | COMPLEXITY | 7.88s | 0.76s | ok |
| headline | SIMPLICITY | 2.17s | 0.76s | ok |
| is-a | IS A | 1.95s | 1.36s | ok |
| viewpoint | VIEWPOINT | 1.47s | 0.76s | ok |
| url | quietbands.com | 1s | 0.76s | ok |

_Rest is measured from when the text has fully arrived to when it starts to change or leave. Approximate metrics; the render is the reference._

## Assumptions

- No voice or music was supplied: timing is designed to the brief's scene boundaries, and the soundtrack is a procedural placeholder.
- quietbands.com is taken from the site's canonical URL (index.html).
