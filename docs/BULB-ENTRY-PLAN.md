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

---

## Gate 4 · selection, the R&D page, the link preview

### Selection

- Choosing a fragment (its label, the fragment itself, or Enter on a focused label) moves the camera to a point in front of it over 480 ms on the stylesheet's strong ease-in-out (`cubic-bezier(.77,0,.175,1)`, evaluated in JS by a small bezier solver so canvas motion and CSS share one curve). The other three fragments, their labels and the debris fade with the move; the chosen one goes orange. At the end the browser goes to the section. A second choice mid-flight retargets from the live camera position. Coming back through the page cache reverses the move (`pageshow`). Modifier-clicks and reduced motion skip the move and navigate directly.
- Verified headless on both viewports: mid-move the camera is between home and the fragment with the selection active; the page lands on `/rd/#build-log` with that section at the top and the header marking it current.

### The R&D page (`/rd/`)

- Same language as the entry: near-black ground, cream text, Hubot Sans, hairlines, no cards. A header with the wordmark back to the bulb and the four sections as a row; the section in view is marked current. Nothing else moves.
- Sections are the fragments: Experiments (Lab 001), Build log, Work, Contact. Lab 001 tells Spatial Hero from the lab notes on the spatial branch: thesis, the diagonal problem, the stratum test, the geometry test that failed, why the motion worked, why it was retired, and a closing line that says the measurements were headless and no one was user-tested. Work names the one shipped product the site already documents and says the count is one because one has shipped. Contact is one line to jason@quietbands.com.
- The old field-guide page moved to `lab/rd-field-guide.html`, unlinked. `/rd/pressure-test/` stays on disk, unlinked. `sitemap.xml` lists `/` and `/rd/` only.

### Link preview

- `og-bulb.png`: 1200×630, the whole bulb with its cracks fully drawn, rendered from the entry's own canvas. Both pages point `og:image` and `twitter:image` at its absolute URL, with width, height and alt. Favicon and apple-touch-icon are the existing files.
- Not verified live from this container (the preview host is blocked here). Verify on the deploy preview with a link debugger before merge; the URLs only resolve at `quietbands.com`, so the card is fully right only once this is on production.

### Checks

- `npm test`: 48 pass.
- Gate 4 harness: selection on phone and desktop, landing, header state, every link on `/rd/` ≥ 44 px.

### Emil (review-animations) on this gate's motion

| Before | After | Why |
| --- | --- | --- |
| Tap on a fragment navigated after a fixed 120 ms timeout | The camera move is the transition; navigation happens when it lands | Spatial consistency: you go where the camera goes |
| One easing for everything | Selection on the strong ease-in-out; hover stays ease-out; settle stays out-expo | Moving on screen is not entering |
| Nothing on `/rd/` animates | Unchanged, plus the current-section mark with no motion | Reading pages do not need motion |

Verdict: approve. Two things only the phone settles: whether 480 ms feels long on a fast tap, and whether the fade of the other three pieces reads as intended or as a glitch under a slow frame.

### What is left for the person

- Real-iPhone pass on the deploy preview across all four gates, the tilt recording, and the link-preview check.
- Merge when satisfied; the pull request stays a draft until then.

---

## Critique (Impeccable, read-only) and the one polish pass

Run as the brief asks: two isolated assessments (a design review, then the detector with browser evidence), synthesised, snapshot in `.impeccable/critique/` (local, not committed). Score 20/32 on the applicable heuristics, Acceptable. Three P1s: no affordance to scroll and a dead first fifth; the four links hidden from keyboards and screen readers until the settle, and the wordmark missing from the reduced-motion still; Contact the smallest, farthest, dimmest piece with the conversion two hops away. The detector's one finding was a skipped heading level on /rd/. The person chose: the first fifth first, the brief's whole bulb kept with a legible crack, the three P1s plus the heading fix, then the polish pass.

### What the polish pass changed

- **The first fifth.** The hold shrinks to 0.08. The cracks now grow from the first pixel of scroll on an ease-out curve, so the first flick shows the most change. The two lines are the last thing to leave (0.06–0.30) and their fade is the cue that the page answers the scroll; the dimension marks leave at the start of the turn. The crack at rest is longer (`CRACK0` 0.16) and the impact point moved to the face toward the viewer, so it reads at 1x on a phone. The bulb stays whole at rest, per the brief.
- **Keyboards and screen readers.** The four links stay in the accessibility tree and focusable at all times; focusing one before the settle scrolls the track to its end so the piece is on screen. The reduced-motion still now carries the name and the address.
- **Contact, depth and fog.** Contact takes a near depth (portrait −0.6, landscape −0.5) and Work a slightly farther one, so the depth order is authored; the fog's far limit lifts as the pieces settle, so the far ones step out of the haze while depth remains a cue. The settled frame gains its own two lines bottom-left, the name with the city and the address as a 44 px link, arriving after the labels.
- **/rd/ outline.** No eyebrows (the craft floor bans them): the four section names are the h2s, the piece inside a section is its h3, the parts of Lab 001 are h4s, and the header wordmark is the page's h1 at the entry's wordmark size. Detector clean on both pages.
- **Browser surfaces.** Focus is orange text with a hairline under the word instead of a box; text selection is tinted from the palette.

### Checks after the pass

- `npm test`: 49 pass. Detector: 0 findings on `index.html` and `rd/index.html`.
- Gate 2, 3 and 4 harnesses: all hold on both viewports, including the settled-layout assertions and the reduced-motion still.
- Share image re-rendered with the new impact point.

### Deferred, still in the critique snapshot

The debris spread and per-point hue, the /rd/ sticky header and current-section mark, the pole whorl on the Build log piece, the mobile track height, the no-JS label collision.

---

## The other pages, brought into the language

Asked for after the polish pass: the nine remaining pages (work, the Frenchies case, commercial, small business, resident experience, notes and its two articles, the pressure test) and the 404 now match the entry.

- **One system, re-themed at the source.** `assets/site.css` takes the entry's tokens: near-black ground, ivory text, cream lines and secondary text, orange only under the pointer or the focus. The ivory "bone" canvas is gone; it is the same near-black. Hubot Sans everywhere, display weight 500; every tracked-caps mono label in the old system is sentence case at one size and the secondary colour. Buttons are words with a hairline. Fields are square hairline boxes that go orange on focus. Boxed containers (panel, offer, comparison ledger, figures, success and error states) become hairline sections. The scroll-reveal fade on every section is off. Selection and focus come from the palette.
- **Header and footer as on /rd/** on every page: the wordmark and the four section links; a footer of the name, the address and the legal line. Eyebrows moved under their headings as quiet lines (the craft floor bans them above). The 404 page is rewritten in the language.
- **The phone mockups** keep their own light surface and dark ink: they are pictures of a product.
- **Checks.** Every page renders on the ground in the family with no page errors on desktop and phone; every link and button is at least 44 px; the detector across all twelve pages reports only three intentional clip containers on the Frenchies composition and two em-dash counts in existing copy. `npm test`: 49.
- Not done: the copy itself (the em-dashes, the offer-page wording) and the Frenchies screenshots, which live only on Netlify.

---

## Visual pass: brighter lines, orange only where it is live, the three bands

Asked for after the other pages: the lower fragments and their labels were getting lost against the black.

- **The wireframe is brighter.** The whole bulb's lines go from cream at 0.86 to a lighter cream at 0.96; the cracks and the four fragments are ivory at full opacity. The base and filament keep their 0.86 so the shell stays the subject.
- **No haze on the settled pieces.** The fog's far limit now leaves entirely as the pieces settle, so Work and Contact, which sit farthest from the camera, read as brightly as Experiments and Build log. Depth stays legible through scale and parallax, never through dimness.
- **The labels.** Ivory text, one size up (16/17 px), with a hairline underline that is transparent at rest and orange on hover, focus, or touch. The orange is still only under the pointer or the focus; nothing else on the page carries it. The dim caption under the wordmark lifts from .55 to .68.
- **The Quiet Bands mark.** The three bands from the favicon, drawn in the line colour beside the wordmark: at rest on the entry, in the settled frame, and in the header of /rd/, the 404 and the nine pages. It inherits `currentColor`, so it goes orange with the wordmark on hover.
- **Checks.** Gate 2, 3 and 4 harnesses hold on both viewports (settled layout, 44 px, no crossings, selection lands on the section). The pages harness renders all twelve pages with no new errors. Asset versions bumped (entry v5, rd.css v3, site.css v2→v3).

---

## Material and lighting pass: smoked black glass, cream lines on it, orange light in the fracture

One pass, nothing retimed. The geometry, fracture shapes, poses, rotation, scroll map, camera, separation, easing, labels and tap areas are as they were; `bulb.glb` is byte for byte the committed file.

- **The glass.** `MeshPhysicalMaterial`: transmission 1, roughness 0.06, IOR 1.5, thickness 0.16, a dark warm attenuation for the smoke, clearcoat 0.35, a dark neutral tint. Double sided, with a polygon offset so the lines on its surface win the depth test. At rest it is one lathe of the bake's own profile (`glassProfile()` in `entry.js` ports `glass_profile()` from `tools/bulb.py`), revolved at runtime; a re-bake was tried and reverted because Blender does not reproduce the fragment meshes byte for byte. After the break each fragment's baked mesh carries a clone of the material, so a piece can fade on its own during selection.
- **The light.** No point or directional lights: on glass they are hot dots, and a dot is a glow. Three cream emitters on black, prefiltered once into an environment nobody sees: a thin tall strip upper left toward the viewer for the long rim, a wide low strip behind right for the far edge, a small patch above for the crown. Background stays brand black.
- **The cream grid** stays where it was, at 0.62 on the glass, so the glass carries the form and the drawing sits on it. The far side of the grid now reads through the smoke, which is the thickness.
- **The fracture light.** `splitEdges()` separates each fragment's grid from its broken edge: the rim strip meets the surface at a right angle and its inner edge is open, so a 60° threshold picks both lips of the break and nothing else; the neck ring, glass meeting the base, stays cream. The break is brand orange at 0.82, one pixel wide, no fog. The crack that grows at rest is the same orange from its first pixel. Hover, focus or touch takes the active piece's edge to 1 and fades in a second pass a hair outside it, so the line gains weight, not a halo. The labels stay flat cream under the pointer; keyboard focus keeps its orange hairline.
- **Brand values.** Black `#000000`, cream `#F2EEE5`, orange `#FF5A00`, in the runtime and the entry stylesheet.
- **Cost.** The refraction buffer is the one addition: the scene minus the glass, rendered once more per frame at 0.6 of the drawing buffer on phones (353×767 at 393×852 @1.5x) and 0.85 on desktop. Draw calls 10 at rest, 29 mid separation, 25 settled; 3.5k to 5.5k triangles. No post-processing, no blur, no bloom. Nothing renders at rest between inputs, as before. `?flat=1` renders the same page without the glass for an A/B on a device.
- **Checks.** Five frames on both viewports (rest, cracking, mid separation, settled, one piece active); gate 3 layout assertions hold including reduced motion; `npm test` 49.

### The cut, given a body

The orange had been a line painted on the mesh. Now every broken edge has thickness, built at runtime from the fragment's own surface (`buildCut()` in `entry.js`); the crack path on the surface, the fragment meshes' positions and the motion are untouched, and `bulb.glb` is still the committed file.

- **What is dropped.** The bake's rim strip (0.022 straight inward from every open edge) is identified by distance to the lathe profile and left out of the glass mesh.
- **What is built.** From the surface's open edges, minus the neck ring: a 45° chamfer of dark glass, 0.008 down and in, then a straight inner wall from there to 0.030 below the surface. Per-vertex inward directions are averaged over a vertex's two cut edges, so the strip is continuous around the jittered crack.
- **Materials.** The wall is unlit brand orange at 0.80 of full, recessed by the chamfer so it reads as light in the thickness, seen refracted through the surface near the edge. The chamfer is the glass material with a low orange emission (0.22), so the exterior lip stays dark with a thin orange reflection. Hover, focus or touch takes the wall to full orange and the lip's emission to 0.55, on that piece only.
- **The cream grid** is the surface's own edges minus the crack itself, so every line ends at the wall and the lip carries no cream.
- **Checks.** Five frames on both viewports; gate 3 layout assertions hold including reduced motion; `npm test` 49. Cut quads per fragment: 65 / 56 / 67 / 54.

### The light moved inside the glass

Asked for after the cut pass: the whole cut face had been emissive, which read as an outline after separation.

- **The cut is dark glass.** Chamfer and wall are one piece in the shell's own material, no emission. The exposed perimeter carries no orange.
- **The light is a band under the surface**, unlit brand orange, lying 0.017 below the glass along the crack and only ever seen through it: through the surface from the front, refracted and smoked; through the wall from the cut side, by way of a short riser at the band's peak. It is graded across its width by vertex colour: 0.30 at the lip, full at 0.014 in, nothing by 0.048 in, so it reads as light bleeding from the fracture into the thickness rather than a rim. Hover, focus or touch takes the band past full (×1.6; the refraction buffer is half-float, so it survives the smoke), on that piece only.
- **Checks.** Five frames on both viewports; gate 3 layout assertions hold including reduced motion; `npm test` 49. Nothing locked moved; `bulb.glb` unchanged.

### Rollback to the first glass version, with three changes

Asked for after the inner-light pass. The chamfer, wall, band and riser are gone; no geometry is added or moved. The fragments are the bake's own meshes with their original silhouettes.

- **Grid** at 0.38 on the glass.
- **No orange lines** on the pieces: the fracture-edge line passes of the first glass version are removed with the rest.
- **The orange** is a faint emission (0.16) on the bake's own rim faces, the 0.022 strip that already sits just inside every broken edge, in the same glass material. Those faces are perpendicular to the surface, so the orange shows only where a cut turns toward the viewer, never as a continuous outline. Hover, focus or touch raises it to 0.45 on that piece. The rim faces are told from the surface by distance to the lathe profile (threshold 0.015: cut vertices lie on the flat facets up to 0.010 inside the curve; rim vertices sit 0.022 in).
- The crack that grows at rest stays as it was in the first glass version.
- **Checks.** One settled desktop frame captured; `npm test` 49; `bulb.glb` unchanged.

### Studio reflections

Asked for after the rollback. The fragments are the first-glass geometry, one glass mesh each, no emission anywhere; geometry, motion, camera and composition unchanged.

- **Glass** darker and clearer: tint `#6E6A64`, roughness 0.035, clearcoat 0.4 at 0.04 roughness.
- **The studio.** Three feathered panels on black, prefiltered once with near-zero blur, reflected by the glass and drawn nowhere: a broad vertical warm-cream softbox upper left toward the viewer (3.6 × 8.5, intensity 5.5, since glass returns about 4% head-on); a thin opposing rim strip behind right (0.6 × 6.5, 3.2); and a small dim orange panel (1.3 × 1.3, 0.6) placed along the reflection direction of the shell around the impact point, so a restrained orange bounce sits near the fracture. Panel edges are feathered by a canvas texture so reflections have soft edges and a clear centre. Nothing is painted on the mesh: the reflections move over the surface as the bulb turns.
- **Checks.** Intact bulb captured on desktop and phone; `npm test` 49; `bulb.glb` unchanged.

### Sequence, rotation and the field

Asked for after the studio pass: the glass was cracking before it had turned; the debris read as two blocks and barely answered the pointer.

- **The turn comes first.** The glass is whole through the first fifth of the scroll (`MAP.crack` 0.20): the rest crack stays as it is while the bulb turns; then the cracks run, fastest at their start, and are complete at the break (0.45). Separation and settling are unchanged. The rotation is 240° over the same segment, a fifth faster than before. At the first new crack the bulb has turned about 60°.
- **One field, no blocks.** The debris is now two populations in one buffer: 40% seeded on the cracks as before, 60% spread through the whole hero volume (±3.4 × ±3.0 × ±1.3 units) with a small drift, so the field is one organic scatter, a little denser at the fracture, with no emitter edges. Same counts (1500 desktop, 600 phone).
- **The flow.** Each point carries an offset with a spring back to its path. Any pointer, mouse or finger, is projected onto the bulb's plane with its velocity; points within 1.45 units follow the velocity and spread from the pointer, weighted by distance and speed, then ease back. Integrated on the CPU only while the pointer moves, a pulse is live, or the field still has energy; nothing runs at rest.
- **The tap.** A click or tap on empty space (not a fragment, label, link or button) pulses the field: one outward push inside 1.9 units over the first 40% of 900 ms, while the shader lights the same disc cream toward orange, swelling the lit points a little, widening and fading over the 900 ms. A tap on a fragment still selects it.
- **Checks.** Frames at t 0.12 (turning, whole), 0.30 (cracking after the turn), settled, and posed flow and pulse frames on both viewports; gate 3 and gate 4 hold; `npm test` 49 (the map tests updated for the new sequence). Reduced motion skips the flow.

### The sequence and the field, second pass

Reported from the phone: still cracking before the turn, and no particles.

- **The particles were failing to link.** The points shader declared `uPulseR` at mediump in the fragment stage and highp in the vertex stage; WebGL refuses the program, so nothing drew. Both stages are highp now. The pulse uniform also started with w = 1 (a Vector4 default), a permanent lit disc at the origin; it starts at 0.
- **The map is versioned.** `entry.js` imports `map.js?v=2`: `/assets/*` is cached for an hour, so a new runtime could run the old sequence. Bump the tag whenever the map changes.
- **The turn starts with the first flick** (`MAP.hold` 0.03) and the glass stays whole until 0.22, by which point it has turned about 90°. The mark at rest is a hairline (`CRACK0` 0.06), not a crack under way.
- **The points hold on their own** now that the field is thin: size 2.6 (varied 0.7–1.4 by seed), alpha 0.62.
- **Checks.** Phone frames at rest, 0.10, 0.20 (whole, turned), 0.32 (cracking), 0.60 (separating, field arriving), settled; gate 3 and gate 4 hold; `npm test` 49; no shader errors.

---

## Reference pass: the anime.js v4 homepage recording

The user shared a phone recording of the anime.js v4 homepage as the reference for presentation and sequence: arrival on a lit object with the headline top left and a scroll ruler at the bottom; the object turns; it opens into an exploded view along its own axis while the camera re-frames; labels arrive on leader lines as the pieces settle; the next section follows.

### What was preventing it (audit of the code, not the look)

- **The turn was invisible by construction.** The bulb stood upright and turned about its own axis. A lathe is the same at every angle about that axis, and the reflections come from a world-fixed environment, so only the grid lines slid. The first visible change on scroll was the crack, which is why it read as "cracking before the spin".
- **A flat, dead-on view.** The camera looked straight at an upright bulb: a 2D silhouette with no three-quarter form for the turn to reveal. The reference's object leans across the frame.
- **Framing included the dimension marks.** The bounding box unioned the marks, so the bulb was framed smaller than the window allowed and pushed up to make room for text at the bottom.
- **Glass with no value structure.** Fully transmissive glass on black shows black; the old environment gave a few small highlights and nothing on the silhouette. The reference reads because one side of the object is lit hard and the rest is dark.
- **No arrival.** The wordmark and one line sat small at the bottom; no headline, no cue, no menu.
- **Confetti.** The points shader coloured each point from the tilt angle (a rainbow that flickered with every gyro reading), at 1500/600 points, up to ~5 device px, alpha 0.62.

No animation library was needed: the scroll pose was already a pure function of t; the problems were pose, framing, light and composition.

### Stage 1: arrival and the intact turn

- **Pose.** The bulb leans (`TILT` x 0.34, z −0.46: crown to the upper right and toward the camera). The scroll turns it about the world vertical, so the lean swings round and the light slides over the glass. The pivot is the centre of the bulb's bounding sphere, so it turns in place.
- **Turn.** Scrubbed, not eased in: `turnCurve` tracks the scroll from the first pixel and slows only into the break. 18° by 4% of the track, 83° by 12%, 152° at the first new crack (22%). The track is 400vh (was 320vh), so the whole turn gets about two-thirds of a screen of scroll.
- **Framing.** By the bounding sphere, not a box: 90% of the width on a phone with the centre at 57.5% down; 80% of the height on desktop, centre offset 14% right. The dimension marks are out of the composition. As the pieces settle, the camera eases from this framing to the span the settled layout was measured for, so the nav keeps its layout (gate 3 boxes unchanged).
- **Light.** A studio in the environment map only: key softbox upper left front; a tall backlight behind left, which the grazing rays off the left silhouette see (a clean rim on one side); a thin opposing strip behind right; a very dim, very soft card behind the camera for the body's 4% head-on return, so black glass reads against black; a thin orange streak on the impact point's reflection. Glass darker and clearer (tint `#6E6A64`, roughness 0.035, clearcoat 0.4 at 0.04).
- **Arrival composition.** Fixed header: the mark and wordmark (link home) left, Menu right (always there; becomes Close). Headline top left, "Custom software. Built around the work.", one family, 560 weight, 88% width. It leaves as the page would scroll it away (fade and 56 px up over 0.5–13%). Scroll cue at the bottom: "Scroll" / "Swipe up" over a ruler that is also the page's progress; its one orange mark is where you are. The cue fades as the pieces become the navigation.
- **Menu.** `assets/bulb/menu.js`, no dependencies: full-screen black list of the four sections and the address; Escape closes; focus moves in and back; the page is inert behind it.
- **Particles.** A quarter of the count (375 desktop, 150 phone). Tiny, dim, warm-cream motes with a little size and brightness variation; no hue from the view, no pulse light, nothing flashes. Heat is speed: a mote the pointer or a tap sets moving warms toward orange and cools back to cream as its spring returns it. Pointer influence radius 0.85 (was 1.45). A tap gives one gentle push inside 1.1 and adds nothing.
- **Not yet reworked.** Cracking, separation, the exploded composition, labels, and the selection transition keep their current behaviour until this stage is approved.

### Critique of stage 1 (Impeccable, read-only)

Design review scored the arrival 18/28 (three heuristics n/a on an experience surface). Detector: one advisory, the ruler's repeating-gradient ticks, judged a false positive (the ruler is a real progress instrument).

- **Fixed in this pass.** On the phone the headline slid up under the fixed header while half faded. It now finishes fading within 24 px of travel and never holds a grey half-state.
- **Fixed before the review read it.** The orange reflection card read as a stain; it is now a thin streak.
- **Put to the user, not changed.** The three-band mark beside "Quiet Bands", top left, can read as a hamburger icon next to the Menu button. The arrival has no line saying what or where (a subline such as "A Houston software studio." or the old line "Before you build it, try to kill it." would fill the reference's subline slot). The crack at rest turns away from the camera during the turn. Hubot Sans should be self-hosted so the headline never falls back.

### Identity: the supplied mark and wordmark

The user supplied the Quiet Bands identity: a mark of two bowls either side of a stem that rises above them, over the lowercase wordmark "quiet bands". It replaces the three-band mark everywhere (it answered the hamburger-icon concern).

- **Mark.** Rebuilt as geometry from the supplied art, not traced: two elliptical bowls (outer 236×230, counter 126, flat terminals) and a 121×658 stem with 43 radius corners, gap 44, in an 823×658 box. 98% overlap with the source.
- **Wordmark.** Vectorised from the supplied lockup (potrace, integer coordinates, 845×155, 5.4 KB, 2.2 KB gzipped). 98.5% overlap.
- **Where.** Every page header now shows mark + wordmark (the wordmark carries the accessible name "Quiet Bands"); the home footer line, and the two lab pages, take the mark only. Both fill with `currentColor`, so hover and page palettes still apply. `assets/brand/` has mark, wordmark and the stacked lockup as files. Favicon, apple-touch-icon and the 192/512 icons: cream mark on black.
- **Not redone.** The legacy social cards (`og.png`, `og-rd.png`, `og-small-business.png`, `og-resident-experience.png`) and the LinkedIn banner are rasters with the old bands and no source; they need regenerating.
