# BULB ENTRY · Plan and gate log

Status: Gate 1 delivered, stopped. Nothing built. Source read: `docs/BRIEF.md`; the Spatial Hero code on `sonny914/new` branch `claude/spatial-dossier-dsmfdl` (`assets/lab/spatial-engine.js`, `assets/lab/hero.js`, `docs/QB-SPATIAL-HERO.md`, `tools/hero.accept.mjs`); the production `netlify.toml` CSP.

## The plan (5 bullets)

- **Fracture method.** Pre-baked once by `tools/bulb.py`, run headless in a **connected Blender** (`blender -b --python tools/bulb.py`), which is the primary path now that one can be attached; the bundled Cell Fracture add-on (an extension from 4.2 on, enabled by the script) does the cut. Fallback, same script: the `bpy` wheel from PyPI, which this container can install (pypi.org is reachable, no Blender binary needed). The script builds the bulb as line-bearing solids: a lat/long UV envelope (12 × 16), neck, three screw-base rings, a filament curve, and 4 thin dimension marks; `solidify 0.02` gives the shell real thickness so its edges read as an edge, not a hairline; **Cell Fracture with exactly 4 seed points** cuts the shell into the 4 nav fragments, and ~80 small cells from a second pass become the debris seed positions (positions only, they are not shipped as meshes). Export is **one `.glb`** with `KHR_mesh_quantization` and Netlify brotli on the wire (no Draco: a Draco decoder is WASM and would need a CSP change). Named nodes: `shell_0..3`, `base`, `filament`, `dims`, `debris` (points). Last fallbacks in order: if Cell Fracture is unavailable in the runtime that runs, the same Voronoi split scripted with `bmesh.ops.bisect_plane`; if neither Blender nor bpy runs, the brief's fallback: 4 clipping planes in three.js split one envelope mesh at runtime, same nav, no crack lines. The Blender connection is not visible to this session yet; it is needed at Gate 2, not before.

- **Rendering.** three.js `0.186.1` via `cdn.jsdelivr.net` through an import map (the production CSP already allows that host and only that host; `GLTFLoader` from the same package). One `WebGLRenderer`, DPR capped at 2 desktop / 1.5 mobile, clear colour near-black `#0B0A09`, no post-processing. **Every line is `EdgesGeometry` → `LineSegments`** (threshold 1°, so the lat/long and crack edges all survive) in one cream `LineBasicMaterial` (`#E8DCC2`, the site's existing `--oat`); fragment faces carry a black, depth-writing, non-visible material so nearer fragments occlude deeper lines and the shell thickness shows at silhouettes. Hover/focus lerps that fragment's line colour to safety orange (exact hex chosen against the reference at Gate 2) and eases it +0.12 forward on Z, 180 ms on the strong ease-out `cubic-bezier(0.23,1,0.32,1)`, hover gated behind `(hover:hover) and (pointer:fine)`, touch getting the same state on pointerdown; nothing else is ever orange. **Particles: one `THREE.Points` + custom `ShaderMaterial`** over the baked debris seeds (1500 desktop, 600 mobile, 1–2 px, alpha ≤ 0.35); release is a per-point velocity × progress, so it is reversible; hue is a thin-film function of `(view.x, view.y)` only, cream-grey at head-on. Labels are **real DOM `<a>` elements** projected each frame (`Vector3.project`), ≥ 44 px targets, keyboard focusable, visible focus ring, so the nav exists before WebGL and without it.

- **Scroll map (t = 0→1, every value a pure function of t, so it reverses by construction).** `0.00–0.18` whole bulb, text "Quiet Bands" + one line on; `0.18–0.45` rotation about the vertical axis, 0→200°, text fades by 0.30; `0.45–0.70` separation: fragments slide along their cell normals, crack edges show, particles release, base and filament stay; `0.70–1.00` settle: fragments ease (out-expo) into 4 hand-placed poses at distinct Z (−140, −60, +40, +120), labels fade in from 0.85, slow drift and tilt parallax fully on. Track height 320 vh on desktop, 280 vh mobile. The whole-bulb frame (t=0) and the settled frame (t=1) are the two frames that must stand still.

- **Reused engine parts, unchanged.** `createSpatialEngine` from `assets/lab/spatial-engine.js` with the hero's options (`hold:false, drag:'relative', permission:'gesture'`): its `view.x/view.y` (device orientation with the v1.4.6 iOS permission retry, thumb drag with `rubberband`, fine-pointer absolute), its critically damped `springStep` (touch 0.20 s / free 0.42 s), its lagged `scroll` (90 ms), and its `render(state, dt)` frame loop. The bulb is only a render callback: `view` drives fragment parallax and the particle hue, `scroll` is t. `smooth`/`outExpo` are its easings. From `hero.js`, the `?debug` sensor readout. From `tools/hero.accept.mjs`, the local-server + Playwright grid harness, re-pointed at the bulb and with the CDN URL routed to the npm copy of three, because this container cannot reach jsdelivr (production can). `engine.js`/`scene.css` on main (the DOM story engine) is not reused. Not rewritten: no new spring, easing, scroll reader or sensor code.

- **Fallbacks.** `prefers-reduced-motion`: t pinned to 1, one static render of the settled fragments, no drift, no tilt, particles drawn once at their released positions in fixed cream-grey (hue uniform off), labels tappable. No JS: the four `<a>` labels render as a plain list under `html:not(.js)`, same pattern as the current site. No WebGL, CDN import failure or `.glb` fetch failure: caught once, page drops to the no-JS list plus one static SVG of the whole bulb (exported by the same bpy script). Below 30 fps sustained on a phone: particle count halves, then drift stops; the sequence itself never degrades.

## Composition review at plan (frontend-design, run against the brief; the skill file is on the spatial branch)

Tokens, kept to what the brief pins down:

| Token | Value | Role |
| --- | --- | --- |
| ground | `#0B0A09` | the only background; the brief says near-black, so a tinted black is a choice here, not a default |
| line | `#E8DCC2` | every bulb, fragment and dimension line (existing `--oat`) |
| line-dim | `#E8DCC2` at 55% | debris at rest, dimension marks, the one descriptive sentence |
| live | safety orange, hex fixed at Gate 2 against the reference | hovered or focused fragment lines only |
| text | `#F4F1E9` | "Quiet Bands", labels, R&D page body (existing `--ivory`) |

Type: **one family, Hubot Sans** (already loaded by the hero; width and weight are the hierarchy). "Quiet Bands" at 500 / width 100, sentence case, 22 px mobile / 26 px desktop. Fragment labels 15 px, sentence case, no tracking, no caps. No second face, no monospace data labels, no eyebrows, no middle dots: those are the current site's tells and this surface drops them.

Layout: the bulb is the page. At t=0 it sits centred on desktop and in the upper 60% on a phone, "Quiet Bands" and its one line bottom-left inside a 22 px margin, so the object has air and the thumb zone is empty. At t=1 the four fragments occupy four hand-placed poses at distinct depths, each label to the fragment's outer side, so no label crosses a line, another label, or the base. Left-aligned text throughout. No header bar, no grid, no rules.

Reviewed against the generic defaults: "near-black plus one bright accent" is trait 2 on the skill's list, and the brief asks for exactly that, so it stays; what changes is that orange is never decorative, only interactive, and the rest frame has two values only. The wireframe object replaces a headline as the hero, which is what the brief wants and what the current story engine does not do. Two frames must survive as stills with motion off (t=0 and t=1); both are checked as posters at Gates 2 and 3.

## Motion rules (Emil, i.e. emilkowalski/skills: `animate` to build, `review-animations` at Gates 2–3)

- **Scroll-driven motion is linear in t**, smoothed only by the engine's 90 ms scroll lag; segment boundaries use `smooth`. No easing curve is layered on top of scroll, so scrubbing backwards feels identical to forwards.
- **Settle is an entrance: ease-out.** Fragments arrive on `outExpo` (already in the engine). Labels fade in staggered, 0.03 of t apart, the equivalent of 30–80 ms.
- **Selection is on-screen movement: strong ease-in-out** `cubic-bezier(0.77,0,0.175,1)`, 480 ms, retargetable from the live camera value so a second tap mid-flight does not restart. Back reverses the same path (exit the way it entered).
- **Drift is not a spring.** Slow, low-amplitude noise on position only; the springs stay for what the finger and the sensors drive, which is already `springStep` in the engine (0.20 s under the finger, 0.42 s after release, rubber-band past the edge).
- **Transform and opacity only** on the DOM labels; the WebGL objects never touch layout. No CSS variable on a parent drives a child.
- **Reduced motion is gentler, not zero**: the label crossfade stays, movement goes. Mobile tells removed up front: `100svh` stage, `viewport-fit=cover`, `overscroll-behavior:none`, `touch-action:pan-y` on the canvas, `touch-action:manipulation` and a transparent tap highlight on the labels.
- Review method at gates: a Before / After / Why table from `review-animations`, block or approve, cited by file and line.

## Open items before Gate 2 (need your call)

1. **Target repository.** `sonny914/sonny914.github.io` is empty (no commits, no branches). The site, the Spatial Hero code and `/lab` all live in `sonny914/new`, and the hero branch there (`claude/spatial-dossier-dsmfdl`) is not merged to main. The brief says keep Spatial Hero in `/lab`, which only makes sense building in `sonny914/new` on top of that branch. Recommendation: build there. Say which.
2. **Existing routes.** "Nothing else navigable" is read as: the other pages stay on disk, unlinked; sitemap and robots get trimmed at Gate 4. Confirm or say remove.
3. **Emil, resolved.** It is Emil Kowalski's skills repository (emilkowalski/skills), the one the dossier craft pass on the spatial branch audited against. Cloned and read for this plan; the rules above come from it. It is not vendored anywhere yet: at Gate 2 it goes into the target repo with `npx skills add emilkowalski/skills` (the npm registry is reachable from this container; the jsdelivr CDN is not, which only affects local testing).

---

## Gate 2 · whole bulb, cracks, rotation

Built in this repo on `claude/bulb-entry`, on top of the Spatial Hero branch so `/lab` keeps its code. Homepage replaced by the entry (`index.html`); the old story homepage moved to `lab/story-home.html`, unlinked, `noindex` via the existing `/lab/*` header.

### What is on the page

- `tools/bulb.py` bakes `assets/bulb/bulb.glb` (61 KB, brotli on the wire) and `assets/bulb/bulb-static.svg`. Lathe glass (24 longitudes, 10° latitudes), a longer neck, a screw base with four threads and a contact tip, a glass mount with two support wires and one arc of filament, height and diameter dimension marks. Four Voronoi fragments cut with `bisect_plane` (Cell Fracture is not in the bpy wheel; the connected Blender can take over the same script). Crack vertices step sideways on the glass by up to 0.032 so a crack is jagged, the same step on both fragments. 1600 debris seeds lie within 0.10 of a crack.
- The glass is lines only: the reference and the brief both read as a wireframe you see through, so the shell has no occluding faces. The metal base is solid black under its lines. Fragments carry a 0.022 rim strip on every cut edge, so the glass has thickness where it is broken; the whole-bulb grid is drawn from the unbroken lathe so nothing hints at the cracks before they are drawn.
- **Cracks develop with the scroll** (your note on the reference): the crack polylines are their own line set, ordered by distance along the crack network from an impact point in the upper right facing the viewer, and drawn by a growing range. At rest a hairline; complete by the end of the turn (t = 0.45); the fragments only take over at separation. Reversible by construction.
- Scroll map as planned: hold to 0.18, turn 200° to 0.45; the two lines and the dimension marks leave in the first 0.12 of the turn. Fog follows the camera so the far side of the glass sits back.
- Framing is computed from the object's bounding box: portrait fits the width with a margin and puts the object in the upper two thirds; landscape fits the height and centres the bulb's axis. Camera at 30°.
- The engine is `assets/lab/spatial-engine.js`, unchanged, with the hero's options; tilt turns the whole bulb a little (0.10 rad per unit of view). The `?debug=1` readout is the hero's.
- Still fallbacks are in: reduced motion, no WebGL, a failed CDN import and no JS all show the SVG and the four links as a list. Tap targets are 44 px, focus ring in the interactive orange (`#FF5A1F`, to be judged on the phone).
- `npm test`: 43 pass, including four on the scroll map and the crack term.

### Emil (review-animations) on this gate's motion

| Before | After | Why |
| --- | --- | --- |
| Dimension marks rotated with the bulb into stray diagonals | Marks fade in the first 0.12 of the turn | A drawing annotation stops meaning anything once the object turns; movement without purpose |
| Fog in absolute distances (blank on portrait) | Fog set from the camera distance every frame | Depth cue must follow the camera, or it is a bug, not a cue |
| Text leaves on the same curve as the rotation | Text leaves on its own short segment (0.18–0.30) | The two lines are an exit: short, ease-out, done before the turn is half way |
| Hover on the nav links ungated | `@media (hover:hover) and (pointer:fine)` | Touch fires a sticky hover on tap |
| Nothing else animates on its own | Unchanged | The whole-bulb frame and the turn are scroll-driven; no idle motion at this gate |

Verdict: approve for Gate 2 (no idle motion, all motion scroll-driven and reversible, reduced motion honoured). Two feel checks only a device settles: the tilt gain on the whole bulb, and whether the hairline at rest is visible on an OLED at low brightness.

### Evidence

Headless frames (Playwright, iPhone 393×852 and desktop 1440×900, system fallback font because Google Fonts is blocked in the build container): rest, t = 0.12, t = 0.32 mid-turn, t = 0.45. Real-iPhone evidence comes from the Netlify deploy preview of this branch's pull request, with `?debug=1` for the sensor state.

### Open at this gate

- The safety orange hex is a placeholder until the reference's orange is matched on the phone.
- The four settled poses, the labels, parallax on the fragments and the debris are Gate 3.
- Line density: 24 longitudes reads as fine wireframe in these frames; the phone decides whether it is too dense at 1.5× DPR.

---

## Gate 3 · separation, settle, parallax, particles

Points only for the debris (your call), no shard meshes beyond the four nav fragments.

### What changed on the page

- **Separation (t 0.45–0.70).** At the end of the turn the whole-bulb grid and the crack lines hand over to the four fragments in the same place (each carries its rim strip, so the glass shows thickness where it broke). Each slides out along its own direction by 0.42 units with a small tumble about that axis. The base and the filament stay, then fade once the fragments leave for their poses (0.70–0.85).
- **Settle (t 0.70–1.0).** An ease-out entrance (out-expo) into four hand-placed poses, one set for portrait, one for landscape, at distinct depths (−1.4 … +0.9), scaled to 0.55 / 0.65 of bulb size so four fit with air. Labels are the real `<a>` elements, anchored to each fragment's projected bounding box on the side with room, arriving staggered (0.03 in t apart) from t = 0.82. 44 px tap height, focusable, focus ring in the interactive orange.
- **Parallax and drift.** On the settled fragments only: sideways travel by depth from the engine's `view` (0.32 units per unit of view at the nearest depth, half that vertically), and a slow drift of 0.028 units with a 0.03 rad wobble. Drift is noise, not a spring; the springs stay on what the finger and the sensors drive.
- **Hover / focus / tap.** Fine pointer over a fragment, or hover/focus on its label: the fragment eases forward 0.22 units and its lines go orange, time-based at 180 ms. A tap on a fragment goes where its label goes (the camera move is Gate 4).
- **Debris.** One `THREE.Points` (1500 desktop, 600 mobile of the 1600 baked seeds) with one shader. Position = seed + velocity × release, released 0.45–0.85, so it reverses. 1.6 px points, alpha ≤ 0.28. Colour: cream-grey head-on; hue from the angle of the same `view` vector as the parallax, spread per point (foil), mixed in only as the view leaves head-on. Points render only after the break.
- **Reduced motion** now renders the settled frame once in WebGL, tappable, with no drift and the hue uniform pinned to zero; the SVG list remains for no WebGL / no JS.

### Checks

- `npm test`: 47 pass (scroll map: separation, settle, release, anchor, labels).
- Harness on iPhone 393×852 and desktop 1440×900: separation start, mid-separation, settled at rest, settled tilted both ways, focus on the first label, reduced motion. Layout assertions on the settled frame: every label fully on, ≥ 44 px, inside the window; no label crosses another fragment's box or another label; no two fragment boxes overlap; no fragment clipped. All hold on both viewports.
- The rest frame at t = 1 with view 0,0 shows the debris as faint cream-grey points; the tilted frames show the colour arrive. Whether the rest frame reads "sparkly" on an OLED is the phone's call; the knobs are `uSize` and the 0.28 alpha in `makeDebris`.

### Emil (review-animations) on this gate's motion

| Before | After | Why |
| --- | --- | --- |
| Fragments settled at bulb scale | Scale to 0.55 / 0.65 over the settle | Four nav pieces need air; a settled frame that overlaps is a collision, not a composition |
| Labels anchored at the bounding-sphere radius | Anchored to the projected bounding box edge, 12 px gap | The label belongs beside the piece, not at a radius the eye cannot see |
| Drift as a spring | Drift as slow noise; springs only on input | A spring with no input is fake physics |
| Hover colour via CSS transition on the canvas object | Time-based lerp in the render loop, 180 ms, ease-out shape | Canvas lines have no CSS; the ease has to be the same at any frame rate |
| Reduced motion: still SVG | Reduced motion: settled fragments rendered once, tappable, no drift, no hue | Gentler, not zero: the nav should still be the nav |

Verdict: approve for Gate 3, with the tilt gains (parallax 0.32, whole-bulb 0.10) and the debris alpha to be judged on the phone. The phone recording of the tilt hue shift is yours to make on the deploy preview.

### Open at this gate

- Gate 4: selection (camera to the fragment, then the section), the R&D page with Lab 001, the link-preview gate (OG image of the bulb, 1200×630, absolute URLs), sitemap and robots trimmed.
- The settled poses are hand-placed for two aspect classes; a tablet in landscape uses the landscape set.
