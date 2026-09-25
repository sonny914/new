# QB SPATIAL HERO · v1

Internal name only. Route: `/lab/spatial-hero/` (isolated, `noindex`). Nothing on production is touched.
Preview: `https://deploy-preview-3--quietbands.netlify.app/lab/spatial-hero/`

The screen is a window into an information volume. Nothing is painted on the glass: every object has a depth, and the person perceives the depths through differential motion, occlusion, scale and perspective. No surfaces, no cards, no HUD, no permanent purple.

## The idea (approved storyboard, concept C with two borrowings)

- **The line is the reference.** REQUEST, a rule, COMPLETE at depth 0. It never moves under a change of angle.
- **Six words stand edge-on in it.** EMAIL, SPREADSHEET, HANDOFF, WAIT, EXCEPTION, REWORK at depths −70 to −420, each turned 90° so that from the front it has zero width and the line reads as two steps. Change the viewing angle and each slat turns open and is displaced by its depth, so they fan out of the line into a receding staircase. Return to the front and they close to nothing. The collapse is exact by construction.
- **From A:** QUIET (depth +180, Archivo 900 at width 125, 36vw, cut on both sides) and BANDS (depth +80, weight 300, 26vw, cut on the right). Two depths, one wordmark, extending past the window.
- **From B:** depth expressed through contrast, weight and scale, never blur. BANDS at 70%, the Houston line at 45%, the resolution invisible until the camera is well inside.
- **Purple is a state:** a slat becomes violet as it becomes legible (from 28° open, full at 40°). Nothing else is ever purple.
- **Scroll is a dolly.** The camera travels 1100 units forward and pans to aim at the line. QUIET and BANDS pass around the viewer, the line comes up and passes, the six words pass one by one, and the camera arrives on SOFTWARE BUILT / AROUND THE WORK. with one link: Start with a Pressure Test.
- **Approach opens the slats too.** As the camera closes on an off-axis slat the angle it is seen at increases, and the viewer drifts slightly aside on the way in, so scrolling alone tells the story; the tilt is the better version of it, not the only one.

## Depth model

| Object | Depth | Parallax at full tilt | Contrast |
| --- | --- | --- | --- |
| Optical coating (the glass) | +300 | 70 px | 2.5–7%, specular travels with the angle |
| QUIET | +180 | 42 px with | 100% |
| BANDS | +80 | 19 px with | 70% |
| REQUEST, rule, COMPLETE | 0 | 0 | 85% |
| Six slats | −70 … −420 | 16 … 98 px against | 55% closed → violet open |
| Custom software, Houston, Texas. | −40 | 9 px against | 45% |
| Resolution | −1100, arrives at 0 | still once the camera is on it | 0 until 250 in, 100% on arrival |

Parallax is by depth relative to the camera (`(depth + camZ) / 300 × 70 px`), so the plane the camera is on is always the still one. Each object is scaled by `(P − depth − arrive) / P` and offset from the perspective origin by the same factor, so it projects exactly at its layout size and place when the camera is where it is meant to be seen (from the front for everything; at arrival for the resolution).

## Interaction

- **Tilt:** ±18° of phone maps to the full viewing range; 18° opens the slats to 58°. Restrained rotation: none of the volume rotates; translation does the work.
- **Thumb:** a horizontal drag across 60% of the width is the full range, relative to where the view was, rubber-band beyond. A vertical drag scrolls. Release springs back to the sensors (or to front).
- **iOS sensor grant:** no button. The first touch anywhere is the gesture that asks (`touchend` or `click`). Denied or unsupported, the thumb is the whole instrument. To be verified on a device.
- **Hold:** none. The tilt is the inspection.

## Engine

`assets/lab/spatial-engine.js`, unchanged in behaviour, with three options added for this composition: `hold: false`, `drag: 'relative'`, `permission: 'gesture'`. The Secure Plate route still uses the defaults.

## Measured

Headless Chromium, software rendering, 393×852, a 240-frame scrub with tilt: **p50 16.7 ms · p90 16.7 ms · worst 16.8 ms**, 12 composited objects, no images. 37 unit tests across the lab. Reduced motion and no-JS render the wordmark, the line, the six words in violet, the Houston line and the resolution as a still.

## Still weak, honestly

- The tilt gain, the approach gain and the drift are tuned by reasoning and headless capture, not on a phone. The first device pass decides whether 58° is right.
- The slat text is 14 px. On a real phone at arm's length it is legible; whether the staircase reads as a path or as scatter is a device call.
- The specular coating is set at 2.5% to 7%; it may read as nothing on an OLED at low brightness.
- The wordmark on desktop is one layout, not art-directed. Desktop is not the constraint for this phase.
- The Archivo width axis is loaded as a variable font from Google Fonts; the first paint before the font arrives shows the system fallback at the wrong width. A `font-display: optional` or a self-hosted subset is the fix once the direction is confirmed.

---

## v1.1 · TYPOGRAPHY, WORDMARK, DEPTH, DESKTOP (art-direction pass, engine untouched)

### Static-frame test on v1, before changing anything

| | Mobile at rest | Desktop at rest |
| --- | --- | --- |
| Composition strong without movement | No: two stacked lines with a full line of air between them, a heading not an object | No: the mobile layout enlarged and centred |
| Expensive | Half: expanded black Archivo is the giant-grotesk poster move; light Archivo is a generic grotesk | Same |
| Depth before interaction | No: nothing occludes anything; only a contrast step | No |
| Eye directed | Top-left to the line, then nowhere | Centre, then nowhere |
| Accidental space | Below the line to the Houston line | Right third, bottom half |
| Reads as a web effect | The specular smear reads as a CSS gradient | Same |

### What changed

- **Typeface: Hubot Sans** (variable, width 75–125, weight 200–900). An engineered grotesk with flat sides and rectangular counters: precise, controlled, slightly severe, and not the Helvetica-clone silhouette. QUIET at 900 / width 125, tracking −0.012em. BANDS at 200 / width 110, tracking +0.04em. Everything small at 500 / width 100. One family; width and weight are the system.
- **One sculpture.** BANDS's cap line sits inside QUIET's lower fifth (`--b-top = --q-top + --q × .56`), so QUIET sits on BANDS. On mobile the Q shows and the T runs off the right; the S runs off the right. QUIET at +180, BANDS at +80, so they separate under tilt.
- **A cast shadow, not a text-shadow.** A black copy of QUIET, offset .032em right and .05em down (light upper-left), placed at BANDS's depth and painted between BANDS and QUIET. It exists only where BANDS is, because black on black is nothing; it stays attached to BANDS under tilt while QUIET moves more, which is what a shadow on a receiving surface does. Hard-edged, 82%.
- **Desktop is a different framing.** QUIET at 21vw from −4vw (Q cut), BANDS at 17vw from 44vw running off the right, the line inside BANDS's span (48vw to 88vw), the resolution laid out on the line so the camera pan (now x and y) arrives on it, the Houston line anchoring the empty left-bottom. The left half is left alone on purpose.
- **Specular** base opacity 2.5% → 1.6%.

Unchanged: the engine, the slats, tilt, thumb, scroll, purple, reduced motion (which now carries the new type and the QUIET-over-BANDS order without the shadow).

Measured after: p50 16.7 ms, worst 16.8 ms. 37 tests.
