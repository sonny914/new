# Storyboard — Automate the coordination

Generated from `project.json` by `npm run storyboard`. Edit the project file, not this page.

**1080×1350 (4:5 feed)** · 30 fps · 330 frames (11s)

## 1. What fills the day — 0:00.00–0:03.00 (frames 0–89)

| | |
|---|---|
| Purpose | Make the coordination overhead concrete before naming it. |
| Visible content | Caption WHAT FILLS THE DAY; a stack of chores rising one by one: EMAIL, CALENDAR, FOLLOW-UP, STATUS UPDATE, REMINDER, HANDOFF, RE: RE: FWD, WHO OWNS THIS? |
| Composition | Left-aligned stack in the lower two thirds; caption at the top; slow upward camera drift with the caption on a shallower plane (parallax). |
| Presets | MaskedTextReveal, WordStack, DirectionalWipe, Accent |
| Layers | caption, chores, wipe, dot |
| Transition out | The stack drops away newest-first as the verb arrives. |
| Audio | None (silent cut; music added at publish). |
| Depends on | WordStack, MaskedTextReveal, camera parallax |

## 2. Name it — 0:03.00–0:05.15 (frames 90–164)

| | |
|---|---|
| Purpose | Call the pile what it is: coordination, which software can carry. |
| Visible content | AUTOMATE converges from wide tracking; THE COORDINATION. rises word by word under a rule drawn from the centre. |
| Composition | Verb at full content width above centre, object line small and tracked, rule between them. |
| Presets | WordStack, KineticHeadline, LineDraw, MaskedTextReveal, DirectionalWipe, Accent |
| Layers | chores, automate, rule, coordination, wipe, dot |
| Transition out | A cream edge sweeps up the frame: everything below it is already the next scene. |
| Audio | None. |
| Depends on | KineticHeadline (track), MaskedTextReveal, LineDraw |

## 3. Keep the human — 0:05.15–0:08.00 (frames 165–239)

| | |
|---|---|
| Purpose | The counterweight: what must not be automated. |
| Visible content | PRESERVE / THE HUMAN with an orange full stop that arrives last. |
| Composition | Two lines at display size, flush left, the stop just after HUMAN. |
| Presets | KineticHeadline, LineDraw, MaskedTextReveal, DirectionalWipe, Accent |
| Layers | automate, rule, coordination, wipe, human, preserve, dot |
| Transition out | The words leave; the stop stays. |
| Audio | None. |
| Depends on | DirectionalWipe (edge), layer reveal/conceal wipes, KineticHeadline, Accent |

## 4. Sign-off — 0:08.00–0:11.00 (frames 240–329)

| | |
|---|---|
| Purpose | Resolve to Quiet Bands. |
| Visible content | The stop travels to centre and opens into the mark; wordmark; quietbands.com. |
| Composition | Lockup centred in the safe area. |
| Presets | KineticHeadline, LineDraw, MaskedTextReveal, DirectionalWipe, BrandLockup, Accent |
| Layers | automate, rule, coordination, wipe, human, preserve, lockup, url, dot |
| Transition out | Final hold. |
| Audio | None. |
| Depends on | BrandLockup (iris from the accent path), MaskedTextReveal |

## Reading time

| Layer | Text | Rests | Needs | |
|---|---|---|---|---|
| caption | WHAT FILLS THE DAY | 2.07s | 1.92s | ok |
| automate | AUTOMATE | 6.65s | 0.76s | ok |
| coordination | THE COORDINATION. | 6.75s | 1.36s | ok |
| human | THE HUMAN | 2.17s | 1.36s | ok |
| preserve | PRESERVE | 2.15s | 0.76s | ok |
| url | quietbands.com | 1.13s | 0.76s | ok |

_Rest is measured from when the text has fully arrived to when it starts to change or leave. Approximate metrics; the render is the reference._

## Assumptions

- Silent by design: feed posts usually get music at publish. Add an audio track with a src to include one.
