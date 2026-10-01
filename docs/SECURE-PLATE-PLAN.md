# QUIET BANDS — SECURE PLATE · BRAND INTERACTION PROTOTYPE v1

Route: `/lab/secure-plate/` (isolated, `noindex`). Nothing on production is touched.
Preview: `https://deploy-preview-3--quietbands.netlify.app/lab/secure-plate/` (add `?holo=1` to exaggerate the optical material).

The previous prototype at `/lab/spatial-dossier/` is left in place as the rejected reference. It shares no visual code with this one.

## Direction

FEDERAL × FUTURISTIC × LUXURY TECHNOLOGY × QUIET STREET ATTITUDE. 95% clean, 5% street.
PLATE = INFORMATION · DEPTH = CONTEXT · MOTION = INVESTIGATION · PURPLE = ACTIVE INTELLIGENCE.

## Step 1–2 · what was preserved, what was replaced

**Preserved, moved into `assets/lab/spatial-engine.js`** (the input side, no visual code):

- One controller, one frame loop, one state: `view.x/.y`, `inspection`, `scroll`, `press`, `mode` (REST · EXPLORE · INSPECT · SCROLLING · ASSEMBLED).
- Pointer handling: multi-touch guard, 8 px move threshold, horizontal drag = explore with pointer capture, vertical drag = the page scrolls, hold arms at 320 ms, feedback on `pointerdown`, velocity handoff on release.
- Critically damped, substepped spring per axis (0.2 s under the finger, 0.42 s free); rubber-band past the edge.
- Device orientation: base calibration at start, slow recentre, ±18° maps to the full range, iOS `requestPermission` only behind a real gesture, touch stays fully functional when denied or unsupported.
- Scroll read from the sticky track with a 90 ms lag; hold tween open 900 ms / release 380 ms / cancel 640 ms, expo-out, no overshoot.
- Keyboard hold (Enter/Space), reduced-motion and no-JS gate, light values written to the light elements only.

**Replaced entirely** (`assets/lab/plate.js`, `assets/lab/plate.css`, `lab/secure-plate/index.html`):

- Ten collage layers → four optical planes with a configurable schema: `id, depth, parallaxX, parallaxY, rotationX, rotationY, holdDistance, holdX, holdY, material, lightingResponse`.
- Every texture, photo plate, grain and scratch → none. No images are loaded.
- The purple environment → near-black; purple is an energy value `--e` that rises with angle, inspection, velocity and the timeline.
- Mono-everything → two voices: Inter Tight (editorial, authority) and Geist Mono (IDs, status, labels only).
- The lens image swap → the hidden path is real content on the rear plane, woken by angle node by node from the side the viewer leans to, fully under inspection, and passed through by the camera on scroll.

## Step 3–4 · the Secure Plate and the first viewport

One object, five interface marks: wordmark, `SECURE / 001`, the plate, `FIELD INTELLIGENCE / STATUS / ACTIVE`, the hint.

| Plane | Depth | Material | Carries |
| --- | --- | --- | --- |
| 01 intelligence | −240 | black ceramic | crosshair + circle geometry; the eight-step path, dark until the system is active |
| 02 evidence | −120 | smoked optical glass | `PROCESS / AS DOCUMENTED` · REQUEST → SYSTEM → COMPLETE; clears when lit from behind |
| 03 analysis | −36 | optical film | a bracket around SYSTEM, a dotted lead to `FRICTION / DETECTED`, `03 SHOWN / 08 OBSERVED` |
| 04 security | +64 | laminate | etched QB mark, `001`, four registration ticks, the optical material |

Each plane is scaled by `(P − depth) / P` so that from the front all four project to exactly the same rectangle: the object reads as one flat plate until the angle changes (tested). Plate geometry is in `em` with `1em = 1% of plate width`, so every mark scales with the object. The plate is 120vw wide on mobile: its edges are outside the viewport; content that must read at rest stays inside a `--safe` inset.

## Step 5 · device tilt

Parallax is a function of depth, pivoting at z = −170: security ×1.0, analysis ×0.57, evidence ×0.21, intelligence ×−0.30. At full tilt the front and rear planes separate by ~83 px on a phone; the whole volume rotates only 3.5° (5° while open). Strong parallax, restrained rotation. The same `view` drives touch, tilt and the reflection.

## Step 6 · optical material

On the security laminate only: a narrow band (indigo → electric violet → a sliver of cyan → a sliver of magenta → indigo) positioned at `--lx/--ly` from the viewing angle, masked to a wide radial so it travels across the visible plate. Intensity = angle × 0.42 + velocity × 0.18 + inspection × 0.1, near zero at the neutral angle. A thin white specular band rides with it. `HOLO_DEBUG` (`?holo=1`) pins the intensity at 0.9 for verification.

## Step 7–8 · touch and hold

A horizontal drag changes the viewing angle on the same model as tilt. Hold: the planes move apart in depth (−100 / −30 / +40 / +110) with a small vertical stagger so the gaps are visible; the camera eases 60 px in; the glass clears and the rear plane wakes. Tilt or drag while held to look between the planes. Release: 380 ms expo-out reassembly, no bounce.

## Step 9 · scroll

560vh track. SEALED (headline) → SEPARATION (0.10–0.28) → ENTRY (camera to +700, `LOOK DEEPER.`) → INTELLIGENCE (0.48–0.74, the evidence plane passes the camera and fades, the eight steps are lit, `FRICTION / DETECTED`) → REASSEMBLY (0.70–0.88) → RESOLUTION (`FIND OUT FIRST.` / `ACCESS THE WORK →`).

## Step 10–11 · measured and Safari

Headless Chromium, software rendering, 393×852, full scrub with tilt: **p50 16.7 ms · p90 16.8 ms · worst 50 ms** with 4 composited planes (the rejected prototype ran at p50 33 ms). 30 unit tests. Reduced motion and no-JS render the four planes as a still, labelled, editorial stack with the hidden path fully visible.

Safari: `100svh` stage; `viewport-fit=cover` with safe-area insets; `-webkit-mask-image` prefixed; `touch-action: pan-y` on the object so vertical drags scroll; `-webkit-touch-callout: none`; `overscroll-behavior: none`; pointer capture guarded in try/catch; orientation permission behind a click; no `backdrop-filter`, no blend modes, no filters.

## Step 12 · what still feels weak (honest)

- The reflection at production intensity is quiet by design; whether it reads as material or as nothing is a device call. `?holo=1` proves the geometry.
- The rear plane's geometry (crosshair + circle) is a placeholder for a real technical diagram.
- The hidden path is two rows of four; a true serpentine with drawn connectors would be more "system".
- The desktop composition is a single layout (headline left, plate right); it has not been art-directed beyond that.
- The device-tilt feel (range, spring) has been tuned by reasoning, not on a phone.

---

## v2 · REBUILD ON THE CRITIQUE (frontend-design skill process: plan → review → build → critique)

### Design plan

- **Subject.** Quiet Bands examines operations: the documented process against what actually happens. The plate's content is exactly that. Its job: make one person tilt the phone, feel "these people look deeper", and tap through.
- **Color.** Room `#000000` (true black: the room is off, the object is the only light). Ceramic `#0E0C13`. Smoke `rgba(20,17,28,.92)`. Bone `#E9E6EE`, Ash `#8A8794`. Violet `#8B5CFF`, the single chroma, meaning "what the system is actually doing". Indigo `#4338A8` only inside the laminate's reflection.
- **Type.** Jost (the open Futura) for everything editorial, sentence case, 500/600. Futura is the Apollo plaque and the Supreme box logo: federal aerospace and street in one family. DM Mono, uppercase, for two identifiers per view.
- **Layout.** Left-aligned HUD; centered plate at 92vw, 4:3, silhouette visible, about a third of the viewport at rest; nothing else at rest. Desktop: plate right of centre, sentences left.
- **Principles.** The room is off. One chroma, one meaning. Substitution, not addition. Motion only answers the hand, plus one orchestrated moment (a single light sweep across the laminate on load).

### Review against the generic tells

Cut: the eyebrow label above the path, the middle-dot hint, numbered nodes, plate corner ticks, the duplicate ID on the plate, the rear-plane crosshair, the ambient glow behind the plate, Inter Tight. Kept because the brief pins them: uppercase mono identifiers (capped at two per view) and the arrow on the call to action.

### What changed from v1

| v1 | v2 | Why |
| --- | --- | --- |
| 120vw plate cropped on both sides | 92vw plate, silhouette visible | A cropped landscape plate on a portrait phone reads as a band, not an object |
| Headline in the first viewport | Rest is wordmark, plate, status. Headline is the first scroll beat | "Start with almost nothing" |
| Six scroll states, three captions | Four beats, two sentences | Captions were explaining what the camera shows |
| Real path added on top of the documented one | Documented path recedes to 38% as the real one lights | One story at a time |
| Purple: env glow + bracket + label + nodes + holo | Purple: the real path and the ceramic plane's edge light. Laminate reflection is indigo | One chroma, one meaning |
| Rear plane: crosshair + circle | Rear plane: the real path only | HUD geometry is decoration |
| Three friction marks | One bracket; one sentence that appears only when opened or entered | Structure is information |
| Uppercase Inter Tight | Sentence-case Jost | Two voices actually separate; the caps grotesk was the template look |
| Shadows: none | Contact shadow only while the planes are apart | Depth from motion and occlusion; shadow as a secondary cue when it is physically true |
| Hint "Tilt · Hold · Scroll" always | No hint. The button exists only for the iOS sensor grant: "Enter spatial view →" | The user learns by doing |

Measured: p50 16.7 ms, p90 16.7 ms, worst 50 ms (software rendering, full scrub with tilt). 30 tests.

### Self-critique, honest

- The insignia is two hairlines. It reads as a placeholder because it is one; the brief said not to design the mark yet.
- With the camera inside (beat 3) the real path is large and cropped; that is cinematic on purpose but the count sentence sits on the plate's bottom edge on some heights.
- The laminate reflection at production intensity is still a device call.
- Jost's italic-less geometry means the quotation marks in the annotation look slightly formal; consider dropping the quotes.

---

## v2.1 · THE SCREEN IS A WINDOW, NOT A CANVAS

Principle from the client: the screen is not a canvas containing interface elements; it is a window into an information volume.

What that changed: nothing is painted on the glass any more. One `perspective` on the whole viewport (origin where the plate sits, so the plate projects exactly as before). The wordmark, the identifier, the status line, the headline, the count and the call to action are `.world` objects with a `data-depth`:

| Object | Depth | Behaviour |
| --- | --- | --- |
| Top and bottom HUD | −240 | Parallax against the plate (the laminate is at +64); fade out as the camera enters the plate, return on reassembly |
| Headline | −200 | Same; appears on the first scroll beat behind the plate's depth |
| Count | −960 | Sits where the camera arrives at beat three (700 in), so it reads at scale 1 there |
| Resolution | −120 | In front of the sentences, behind the laminate |

Each world object is scaled by `(P − depth) / P` and offset from the perspective origin by the same factor so that at rest it projects exactly where it lays out (verified: the wordmark lands at 22 × 22 px). Containers between the volume and its objects carry `transform-style: preserve-3d`; a flat container would discard the depth, which was the first bug of this pass.

Measured after the change: p50 16.7 ms, worst 33 ms. 30 tests.
