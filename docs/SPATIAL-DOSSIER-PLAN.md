# QUIET BANDS — SPATIAL DOSSIER v0.1 · implementation plan

Isolated prototype at `/lab/spatial-dossier/`. Nothing on the production homepage, forms, Pressure Test, analytics, attribution, Supabase or functions is touched. `/lab/*` is served with `noindex`.

## What is being proven

That a 2.5D DOM/SVG/CSS object, with real `perspective` and `preserve-3d`, can feel like a physical layered artifact on iPhone Safari: tactile under the thumb, openable by holding, and traversable by scroll. No WebGL. No animation library: the whole thing is one controller with one frame loop, because touch, hold and scroll must blend in one place rather than fight across libraries.

## The object

Seven planes in one composition, each the full size of the dossier, at different depths:

| Plane | Depth | What it is |
|---|---|---|
| Z-1 verdict | deepest | hidden method plate: OBSERVE / FIND FRICTION / TEST ASSUMPTIONS / BUILD ONLY WHAT'S WARRANTED. Only seen by opening the file or travelling through it. |
| Z0 shadow | back | atmospheric plum shadow and a faint ultraviolet rim |
| Z1 schematic | | technical system sheet: registration marks, coordinates, and the workflow diagram, which is the lenticular |
| Z2 photo | | grainy monochrome-purple film frame: ultraviolet light through blinds across a dark surface |
| Z3 glass | | smoked plate, semi-transparent, scratched, etched metadata |
| Z4 notes | | hand-drawn ink marks and a few handwritten words |
| Z5 gold | front | corner brackets, FILE 001, STATUS, seal, coordinates: jewellery-grade gold, restrained |

## Controller

`assets/lab/dossier.js`. One state: `tilt {x,y}` (smoothed), `hold` 0..1, `scroll` 0..1, `mode` ∈ REST · EXPLORE · INSPECT · SCROLLING · ASSEMBLED. One frame loop, dirty-driven. Each layer config: `id, baseZ, px, py, holdZ, holdX, holdY, rot`.

Per frame every layer gets one transform: `translate3d(tilt·p·K + S·holdX, …, baseZ + S·holdZ + camZ) rotate…`, where `S` is the blended separation (hold and scroll) and `camZ` is the scroll camera travel. A layer whose depth approaches the perspective distance fades and hides, which is how "travelling between the layers" works: front planes pass the camera one at a time and each plane becomes dominant in turn.

Blending rules: separation `S = hold·(1 − travel) + scrollSep`; tilt is damped by `travel`; hold is only armed while assembled (scroll ≈ 0 or ≈ 1).

## Interactions

- **Touch parallax**: `pointerdown/move/up/cancel` on the object with `touch-action: pan-y`, so vertical page scroll is never hijacked. A horizontal drag (or any move once held) sets the tilt target from finger position; damping makes it feel weighted. Max rotation 6° at rest, 9° while inspecting.
- **Press and hold**: 320ms still press arms INSPECT; separation eases to 1 over ~900ms (expo-out, no overshoot), thumb movement steers the angle, the photo plane lifts to expose the verdict plate. Release returns with a 650ms cubic ease. Tap gives a small pulse. `navigator.vibrate` if present, never required.
- **Scroll through depth**: sticky stage, ~560vh timeline. A approach → B separate → C front plane passes the camera → D/E travel between planes with REAL WORK. / REAL CONTEXT. / REAL DECISIONS. → F converge → G reassemble, then QB / FILE 001 · OPEN THE FILE →.
- **Lenticular**: the schematic holds two diagrams. "HOW IT LOOKS" (REQUEST → SYSTEM → COMPLETE) and "WHAT ACTUALLY HAPPENS" (eight steps). The second is revealed through a repeating-gradient mask whose stripe fill follows horizontal tilt, with a small counter-offset between the two, so the change is optical rather than a crossfade.

## Reduced motion

Stacked editorial dossier: each plane rendered flat in order with its Z label, captions in flow, no sticky stage, no travel.

## Performance rules

Transforms and opacity only. Seven composited planes plus captions. Grain is a 128px tiled PNG (generated, ~4 KB), no filters, no blend modes, no backdrop-filter. The mask on the lenticular repaints one 330×460 layer only while tilt changes. Frame loop sleeps when nothing is moving.

---

## v0.1 REPORT

### What worked

- The object reads as one artifact, not six cards. Depth ordering, occlusion and the counter-moving back planes do the work; nothing needed WebGL.
- Press-and-hold is the strongest moment. The file visibly opens, the method plate appears from underneath the schematic, and the return has weight. It is the interaction that makes people touch it twice.
- The lenticular is genuinely optical. At rest the diagram is clean; a right tilt strips the second reality in. Because both faces are real SVG, it costs nothing and stays selectable.
- The controller model holds: touch, hold and scroll never fight because they resolve into one transform per layer. Adding a plane is one config line.
- Reduced motion is a real page, not an apology.

### What feels weak

- The photograph is procedural (gradients + grain). It reads as UV through blinds at a glance but has no subject. A real monochrome-purple frame, small and heavily grained, would lift the whole object.
- Field notes are the least convincing material: Caveat is a web font, not scanned ink. v0.2 should use traced SVG handwriting or a tiny scanned PNG with alpha.
- Mid-flip on the lenticular, both diagrams are half-present. The flip window is narrow so it passes quickly, but a per-strip counter-offset would make it read as prisms rather than a wipe.
- Scene C to D on scroll: the gold plane fading as it passes the camera is correct but under-dramatic. A short bloom or a sharper "pass through" would sell the travel more.
- The gold could be more jewellery-like: it is a text gradient today. A specular sweep tied to tilt on the brackets and seal would make it catch light.

### Performance

- Software-rendered headless Chromium at iPhone size: 60fps median through a full scrub, worst frame 50 ms. On a real GPU the seven planes are pure compositor work.
- Seven composited layers plus the caption group. The grain is an 8 KB tile drawn twice. No filters, blend modes, or backdrop-filter anywhere.
- The lenticular mask repaints one 330×460 layer only while tilt changes; the frame loop sleeps when nothing moves.

### Safari concerns (untested on device from this sandbox)

- `preserve-3d` with per-layer `opacity` can flatten in WebKit in some nestings; opacity lives on the planes themselves, not on the 3D group, to avoid that. Verify on device.
- `mask-image` with a repeating gradient works in WebKit with the `-webkit-` prefix, included. Verify no seam on 3× displays.
- `100svh` sticky stage: verify the reassembled state and OPEN THE FILE are not hidden behind the collapsed toolbar.
- Long-press: `-webkit-touch-callout: none` and `user-select: none` are set on the object so iOS does not show a callout during hold; `contextmenu` is prevented. Verify no magnifier appears.
- `navigator.vibrate` is not supported on iOS Safari; the hold does not depend on it.

### v0.2

1. Real photographic plate (small, grained, purple-toned) and traced ink notes.
2. Specular sweep on gold tied to tilt; a faint UV rim light on the glass edge that follows the finger.
3. Per-strip prism offset on the lenticular; optional second lenticular on the photograph (day / night of the same room).
4. A "pass-through" beat when the gold plane crosses the camera.
5. Inertia on release: carry a little of the last finger velocity into the tilt before damping.
6. Desktop: click-and-hold already works; add a subtle hover exposure of depth.
7. Device pass on iPhone Safari with the toolbar in both states; measure with Safari's timeline, not Chromium.

---

## v0.2 · MATERIAL PASS (after the concept render)

The v0.1 engine held; the surfaces did not. v0.2 rebuilds the object around real material and a real composition:

- **Plates cut from the concept render**, as placeholders at concept resolution: the purple street photograph (`plate-photo.jpg`, plus a darkened variant for the lenticular's second face), the scanned ink notes (`plate-ink.jpg`), the gold-framed plate (`plate-gold.jpg`), scratched acrylic (`plate-acrylic.jpg`). Replace these with production assets; the CSS only references the filenames.
- **Generated scratch overlay** (`scratch.png`, 27 KB RGBA): long hairlines, micro scratches, dust. Laid over the acrylic, glass, gold plate and text panel at different scales so no two surfaces share a pattern.
- **Composition**: nine planes now, offset and overlapping like the render. Acrylic back panel with a wire globe (SVG) and sheet metadata; gold-framed plate bleeding off the top right; photograph mid-left; smoked glass lower right; ink notes lower right; the words on a scratched panel lower left (REAL WORK / REAL CONTEXT / REAL DECISIONS and the method list, with the first two items dimmed until the file is opened); gold layer with brackets, seal and a FIELD · LAB · SHOP · QB rail bleeding off the right. A crosshair and ® mark sit on the stage outside the object. Amber bokeh behind the object balances the purple.
- **Lenticular moved onto the photograph.** Angle A is the street as it looks, captioned REQUEST → SYSTEM → COMPLETE. Tilt right and the same frame strips into the darkened print with WHAT ACTUALLY HAPPENS written down its left edge: eight steps, the exception in gold. Two interpretations of the central image, as briefed.
- **Opening the file** now spreads the planes vertically: back planes rise, front planes drop, the object lifts slightly away from the viewer so nothing outgrows the viewport, and UNDER EXAMINATION appears in the gap from the plate under everything.
- **Captions** during the scroll travel are now huge condensed display type bleeding off the left edge, like the render's letterform.

Measured again at iPhone size in software-rendered Chromium: 60fps median through a full scrub, worst frame 50 ms, nine composited planes. Payload is now ≈ 190 KB, of which 165 KB is the five placeholder plates; production assets should be exported at 2× the rendered size and no larger.

---

## v0.2 · MATERIAL REFINEMENT (no gold)

Direction: covert, technological, contemporary. Luxury from depth, material, light, restraint, motion, precision.

- **Gold removed entirely.** Tokens, gradients, frame, brackets, seal, tabs, octagon, accent square, crosshair, ® mark, ruler, sheet label, film id, duplicate file and status labels: all gone. Metadata reduced by roughly 40%. What remains: SYS-DIAGRAM label, the two lenticular captions, the FIELD · LAB · SHOP · QB rail, the verdict line. Dirty silver (`--silver`, `--gunmetal`, `--graphite`) replaces gold where a marking must exist.
- **No frame.** The evidence plate is a smoked plate with no border; depth establishes it. The letterform is now graphite, nearly the background's value.
- **Three purple grades across depth.** Foreground photograph: brighter, sharpened, more contrast. Middle evidence plate: rich ultraviolet overlay. Rear acrylic and stack: darker, lower contrast, heavier veil. Depth reads in the still.
- **Specular.** A soft dirty-silver band on the acrylic and the glass, positioned by the same normalized pointer x that drives parallax (`--lx`). Nothing emissive.
- **Holographic.** A spectral layer on the glass and the photograph: violet, indigo, faint cyan, faint magenta, positioned by `--lx/--ly`. Its opacity is driven by tilt velocity, not tilt position: rises fast with movement (peak ≈ 0.18 while dragging), decays with a 420 ms time constant at rest to ≈ 0.02. Still image: barely there. Move: it appears. Stop: it goes.
- Frame times unchanged (60fps median, 50 ms worst, ten composited planes at iPhone size, software rendering).

---

## v0.3 · CLEANER / DEEPER / PHYSICAL

- **Cleaned.** Scratch overlays removed from every plane but the glass (at 16%). Stage grain 3.5%. Torn edges, the letterform, crosshair, ruler, coordinates, sheet label, film id gone. Environment is near-black plum; purple emerges from black in one soft radial behind the object.
- **Deeper.** Perspective 1000px; planes now span translateZ −230 to +135, so perspective itself scales rear planes down and front planes up. Parallax gain K = 46px with ratios from −0.28 (verdict) through 0 (acrylic) to 1.15 (front): rear planes counter-move, so a tilt lets the eye see between the planes and occlusion changes. Whole-object rotation reduced to 5° so depth comes from relative motion, not from a card turning. Independent per-layer rotation widened.
- **Larger.** On mobile the object is 118vw wide; the periphery crops and a tilt discovers the edges.
- **Device orientation.** `deviceorientation` drives the same tilt target as touch when no finger is down; the neutral angle is whatever the phone is held at when it starts, re-centring slowly. On iOS the sensors are requested behind one gesture: the hint reads "Move through it →" and becomes "Tilt · Hold · Scroll" once granted. Touch remains the complete fallback. Because orientation writes the same `--lx/--ly`, the specular and the reflection move with the phone too.
- **One optical plane.** The reflection lives on the glass only: a narrow spectral band (indigo → electric violet → violet → cyan edge → faint magenta) whose position follows the viewing angle and whose opacity follows distance from neutral (≈0 at neutral, ≈0.34 at full tilt) plus a velocity boost. `?holo=1` exaggerates it for device checks.
- Light values are quantized to half-percent steps so gradient layers repaint only on visible change.

Measured at iPhone size in software-rendered Chromium: 30fps median through a full scrub with the larger object and the light layers, worst frame 83 ms. Those gradient repaints are compositor work on a real GPU; the device pass decides whether the glass plane needs its own compositing layer or a smaller footprint.
