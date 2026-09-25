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
