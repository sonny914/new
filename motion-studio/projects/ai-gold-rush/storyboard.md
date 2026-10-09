# Storyboard — The real AI gold rush

Generated from `project.json` by `npm run storyboard`. Edit the project file, not this page.

**1080×1920 (9:16 vertical (Reels, TikTok, Shorts))** · 30 fps · 849 frames (28.3s)

## 1. Hook 1 — the gold rush — 0:00.00–0:04.00 (frames 0–119)

| | |
|---|---|
| Purpose | Open on the face; name the crowd chasing AI tools. |
| Visible content | Face. GET RICH (1.23 s, on "get"), BUILDING AI TOOLS by word (2.10 s); generic AI app cards multiply around the face. |
| Composition | Face plate in the top two-thirds, fading into black; type on the fade; cards kept off the face. |
| Presets | Footage, AppSwarm, KineticHeadline, MaskedTextReveal, DirectionalWipe, Captions |
| Layers | face-a, swarm-a, getrich, tools, edge-1, edge-2, edge-3, edge-4, captions |
| Transition out | Hard interrupt on "But" (3.99 s): cards and type vanish on one frame, the frame punches in 7%, the riser cuts. |
| Audio | Thump on GET RICH, a tick per card over a rising swell, hard silence on "But". (1× thump, 24× tick, 1× riser) |
| Depends on | Footage, KineticHeadline, MaskedTextReveal, AppSwarm |

## 2. Hook 2 — the wrong thing — 0:04.00–0:06.13 (frames 120–192)

| | |
|---|---|
| Purpose | Challenge the assumption; open the curiosity gap without answering it. |
| Visible content | Face (punched in) for "But what if we're selling the"; a cream edge sweeps up to a black frame: WRONG (orange) / THING? and holds. |
| Composition | Full-frame type, WRONG at display size in the accent, THING? in cream below. |
| Presets | Footage, DirectionalWipe, KineticHeadline, Captions |
| Layers | face-a, face-b, edge-1, wrong, thing, edge-2, edge-3, edge-4, captions |
| Transition out | Edge sweeps back down to the face on "Most". |
| Audio | Low hit and tick on WRONG; air on the return. (1× thump, 1× tick, 1× air) |
| Depends on | DirectionalWipe (edge), layer wipes, KineticHeadline |

## 3. More tools vs. better understanding — 0:06.13–0:13.09 (frames 193–398)

| | |
|---|---|
| Purpose | Show tool overload, then the real need: someone to teach the tools people already have. |
| Visible content | Cards pile up and overlap; on "app" they fold into one card; the face closes into it and the card opens into a guided task: Write the client follow-up, four steps ticked as he speaks. |
| Composition | Overload around the face, then a single centred panel on black with the orange guide pointing at each step. |
| Presets | Footage, DirectionalWipe, KineticHeadline, AppSwarm, TaskDemo, Captions |
| Layers | face-b, edge-1, wrong, thing, edge-2, swarm-b, demo, edge-3, edge-4, captions |
| Transition out | Iris: face → card → demonstration. Edge sweep out to the centrepiece on "That's". |
| Audio | Ticks per card, air on the fold, a tick per completed step. (19× tick, 1× air) |
| Depends on | AppSwarm (collapse), circle masks, TaskDemo |

## 4. Training → implementation → business — 0:13.09–0:18.12 (frames 399–551)

| | |
|---|---|
| Purpose | Make the business model tangible as one continuous transformation. |
| Visible content | One word that becomes the next: TRAINING → IMPLEMENTATION → BUSINESS (letters shared between words slide, the rest roll); beneath it a rule with three nodes, drawn by the orange point as it steps from node to node on each word. |
| Composition | Centred word over a three-node line, black ground, nothing else. |
| Presets | Footage, DirectionalWipe, TaskDemo, KineticHeadline, GridAssembly, LineDraw, Accent, Captions |
| Layers | face-c, edge-1, edge-2, demo, edge-3, stage, nodes, line, step, edge-4, captions |
| Transition out | Edge sweeps down back to the face on "Maybe". |
| Audio | A rising three-note figure, one note per word. (3× tone, 1× air) |
| Depends on | KineticHeadline (swap), GridAssembly, LineDraw follow, Accent |

## 5. Payoff — 0:18.12–0:26.12 (frames 552–791)

| | |
|---|---|
| Purpose | Land the idea: the opportunity is teaching. |
| Visible content | Face, slow push. NOT JUST BUILDING. on "isn't building"; TEACHING at display size on "teaching"; the orange point lands as its full stop on "people". |
| Composition | Restrained: face above, two lines of type on the fade, captions below. |
| Presets | Footage, DirectionalWipe, KineticHeadline, GridAssembly, LineDraw, Accent, MaskedTextReveal, Captions |
| Layers | face-c, edge-1, edge-2, edge-3, stage, nodes, line, step, edge-4, notjust, teaching, point, captions |
| Transition out | The face closes into the full stop. |
| Audio | One tick as the full stop lands. (1× tick) |
| Depends on | MaskedTextReveal, KineticHeadline, Accent, circle mask |

## 6. End frame — 0:26.12–0:28.09 (frames 792–848)

| | |
|---|---|
| Purpose | Sign quietly. |
| Visible content | The mark opens from the orange point; wordmark; short hold. |
| Composition | Lockup centred. |
| Presets | Footage, DirectionalWipe, MaskedTextReveal, KineticHeadline, BrandLockup, Accent, Captions |
| Layers | face-c, edge-1, edge-2, edge-3, edge-4, notjust, teaching, lockup, point, captions |
| Transition out | Hold. |
| Audio | One soft tone. (1× tone) |
| Depends on | BrandLockup |

## Reading time

| Layer | Text | Rests | Needs | |
|---|---|---|---|---|
| getrich | GET RICH | 2.12s | 1.36s | ok |
| tools | BUILDING AI TOOLS | 0.93s | 1.64s | short |
| wrong | WRONG | 1.03s | 0.76s | ok |
| thing | THING? | 0.25s | 0.76s | short |
| stage | TRAINING | 0.45s | 0.76s | short |
| stage | IMPLEMENTATION | 1.17s | 0.76s | ok |
| stage | BUSINESS | 0.9s | 0.76s | ok |
| notjust | NOT JUST BUILDING. | 3.4s | 1.64s | ok |
| teaching | TEACHING | 1.05s | 0.76s | ok |

_Rest is measured from when the text has fully arrived to when it starts to change or leave. Approximate metrics; the render is the reference._

## Assumptions

- Word timings come from forced alignment (PocketSphinx) of the words as actually spoken, cross-checked against the recording's own burned-in captions; delivery differs from the written script ("Maybe, just maybe", "how to use them") and the recording wins.
- The source is 512×910 with captions burned in by the recording app. The plate is cropped above the caption band (top 620 px) and upscaled to 1080 wide, so the face is softer than native 1080p footage.
- No B-roll was supplied and stock/AI video services are unavailable or unapproved: the demonstration and overload sequences are original code-built animation.
- No licensed music was available; sound accents are procedural placeholders mixed under the voice.
