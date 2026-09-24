# QUIET BANDS CINEMATIC EXPERIENCE PLAN

Status: v1, written after a full audit of the V7.2 Netlify deploy. Implementation of Phase 1 starts from this document.

Everything below is scoped to the homepage (`/`). Every other route keeps its markup, runtime and data flow unchanged.

---

## 1. CURRENT ARCHITECTURE AUDIT

### What exists

| Layer | Facts |
|---|---|
| Hosting | Netlify, `publish = "."`, no build step. Zip drag-and-drop deploys (the Frenchies screenshots live only on Netlify, per `assets/frenchies/README.txt`). |
| Pages | `/`, `/work/`, `/work/frenchies/`, `/rd/`, `/rd/pressure-test/`, `/commercial/`, `/small-business/`, `/resident-experience/`, `/notes/` (+2 articles), `404.html`. All hand-written HTML, all sharing one stylesheet. |
| Design system | `assets/site.css` (776 lines). Dark canvas on `:root`, light canvas via `.bone`. Palette tokens already match the brief (`--black`, `--malt`, `--ivory`, `--oat`, `--turmeric`, `--spice`). Fonts: Bricolage Grotesque, Instrument Sans, Jost, Space Mono (Google Fonts). One easing token `--ease: cubic-bezier(0.22,1,0.36,1)`. |
| Motion today | Two patterns, both inline in each page: `.rise` IntersectionObserver fade-up (scroll = trigger) and `.plane[data-depth]` centre-relative parallax. The homepage also has the Handoff toggle widget (context kept / lost across Property → Resident → Merchant). |
| Runtime modules | `assets/qb.js` (attribution, session id, `track()` fan-out to GTM/GA4/Plausible/`rd_events`, declarative `data-track`, `pt` localStorage store). `assets/triage.js` (pure Pressure Test rules, five states). `assets/pressure-test.js` (the seven-step runtime, history, result rendering, hand-off to `/work/?from=pressure-test`). `assets/intake.js` (writes `leads`, pings `score-lead`, carries the Pressure Test context in). |
| Backend | `netlify/functions/score-lead.js`, zero-dependency, scores a lead HOT/WARM/COLD through the Anthropic Messages API and patches Supabase with the service key. |
| Data | Supabase project `jkilmecbhjepltbianof`: `leads` (anon insert, RLS), `rd_events` (anon insert). Publishable key ships in `qb.js` and inline on the two notes articles. |
| Security headers | CSP in `netlify.toml`: `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`, `connect-src` limited to Supabase and Anthropic. Any new script must be first-party or on jsDelivr. |
| Redirects | `/field-guide` → PDF, `/pressure-test` → `/rd/pressure-test/`, legacy paths, `/tools/*` blocked. |
| SEO | Canonicals, OG images, Organization + WebSite JSON-LD on the homepage, sitemap. |
| Tests | `package.json` points `npm test` at `tools/triage.test.mjs` and `tools/score-lead.test.mjs`. The `tools/` directory is not in the deploy zip, so `npm test` currently fails. `DEPLOYMENT_NOTES.md` is referenced but also absent. |

### What stays untouched

- All routes other than `/`. Their HTML, inline scripts and modules are not edited.
- `assets/qb.js`, `assets/triage.js`, `assets/pressure-test.js`, `assets/intake.js`.
- `netlify/functions/score-lead.js`, `netlify.toml` headers and function config, Supabase tables and keys.
- `_redirects` (one line added to block `/docs/*`, nothing removed).
- Head metadata, JSON-LD, canonical and OG tags on the homepage.
- The header nav and footer markup, so the homepage keeps the same chrome as every other page.
- Existing classes in `site.css`. New styles are additive, in a separate file, so no other page can regress.

### What can safely change

- The homepage `<main>`. Everything between the nav and the footer is the presentation layer this brief targets.
- The homepage inline script (rise observer, plane parallax, handoff widget). The Handoff's idea is absorbed into Scenes 02 to 04 and the widget retires from the homepage. Its CSS stays in `site.css` untouched.
- `package.json` scripts: `npm test` should run whatever tests exist rather than two missing files.

### Things the audit flags for you (not fixed here)

- The `tools/` QA runner and unit tests described in the README are missing from the deploy. If they exist locally, commit them.
- The two Notes articles load `@supabase/supabase-js` from jsDelivr for a form that no longer appears to exist on those pages (`triage-form-el` is not in their markup). Dead weight, harmless, out of scope.
- Frenchies screenshots must be re-uploaded on every zip deploy. Deploying from Git fixes that permanently.

---

## 2. EXPERIENCE THESIS

The homepage is one scene, not a stack of sections.

A visitor lands inside an operation. Seven pieces of real work hang in the dark at different depths: an email, a spreadsheet, a person who decides, an approval, a database, an SOP, an API call. They are related, but the relationships are not yet legible. There is nothing to click and nothing to read except one line.

The scrollbar is a timeline, not a page. Moving it does not reveal the next block of copy. It moves the camera and it changes the state of those seven objects. The same seven objects survive the whole experience. They are never replaced by new ones.

Over roughly eight viewports of scroll the objects do what Quiet Bands does to a client's operation. First they are observed: the camera pushes in and the objects arrange themselves into the workflow they actually form, and a request travels through it. Then the friction shows: the spreadsheet forks, the approval queues, the database line breaks, the SOP drifts out of reach. Then the intervention: two connections become solid, the fork collapses, the queue clears, the SOP snaps back beside the person, and the person is still there. Then the assumption breaks: the camera pulls back, half the system fades, and the page says the right thing to build may be nothing. Then the same seven objects reorganise into the seven stages of the Pressure Test. Finally they split into two groups, one under "I have real work", one under "I have an idea", and those two groups are the two doors into the existing funnel.

Below the doors is a short, static editorial record: production proof, what we design and develop, what you buy, what this isn't. No animation there. The story is the argument. The record is the reference.

If you read the paragraphs above and pictured a hero, a feature grid and a CTA, the build has failed. What the visitor should experience is closer to scrubbing through a short film about a system, where they control the scrubber.

---

## 3. MASTER STORYBOARD

Global rules that apply to every scene:

- The stage is a full-viewport sticky canvas on the black paper. Copy lives on a layer above the objects and is real HTML (`h1`, `h2`, links).
- Each scene owns a range of the master timeline. The first ~35% of a scene's range is its transition band, where objects and camera tween from the previous scene's pose into this scene's pose. The remaining ~65% is the hold, where the composition is stable and copy is readable.
- Copy fades in during the transition band and out in the last ~12% of the hold. On the final scene, copy never fades out.
- Every object has a pose per scene. A scene that does not define a pose for an object inherits the previous scene's pose. That is how objects persist.
- A small mono readout in the corner shows the current scene index and name (`03 / 07 · FIND THE FRICTION`). This is the system telling you where you are.

### SCENE 01 — THE WORK

- Copy: `SOFTWARE BUILT / AROUND THE WORK.` (h1), eyebrow `Quiet Bands / Houston`, and one quiet line: `Scroll to move through the system.`
- Visual state: seven artifacts scattered across the stage at three depths. Near ones are larger and slightly rotated, far ones are small and dim. Four faint dashed hairlines join some of them, imperfectly, to show that a system exists but is not yet understood.
- Persistent objects: all seven introduced here. Names: `email`, `sheet`, `human`, `approval`, `db`, `doc`, `api`.
- Scroll behaviour: the camera pushes in (scale 1 → 1.12). Because of depth, near objects grow faster than far ones. Rotations settle toward zero.
- Transformation: none yet. The point is arrival.
- Transition to 02: the push-in continues, the dashed hairlines fade, and objects begin sliding toward the positions they hold in the workflow chain. The h1 fades as the camera settles.
- Interaction: with a fine pointer, moving near an artifact lifts it 2px and shows its contents more clearly.
- Mobile: same seven objects, stacked into a loose two-column scatter with less depth variation. The h1 sits in the upper third and the objects below it, so no object is hidden under the copy.

### SCENE 02 — UNDERSTAND

- Copy: `UNDERSTAND THE WORK / BEFORE BUILDING THE SOFTWARE.` and a mono sub-line: `email → sheet → decision → approval → database → API`.
- Visual state: the objects settle onto a horizontal chain across the middle of the stage (`email, sheet, human, approval, db, api`), with `doc` floating above `human`, slightly away, as the reference the person consults.
- Scroll behaviour: connection lines draw in sequence, left to right, tied to scroll. A single turmeric packet (a request) travels along the chain as the scene progresses. Scrolling back reverses it.
- Transformation: the scatter becomes a workflow. The visitor realises what they are looking at.
- Transition to 03: the packet reaches the API and the camera stops moving. A beat, then the friction appears in place, on the same chain.
- Interaction: hovering a connection brightens it and shows its mono label (`re-keyed by hand`, `waits on email`).
- Mobile: the chain runs vertically down the left two-thirds of the stage, `doc` to the right of `human`. Copy sits on top. The packet travels top to bottom.

### SCENE 03 — FIND THE FRICTION

- Copy: `FIND THE FRICTION.`
- Visual state: on the same chain, the trouble appears where it actually lives. `sheet` grows a ghost duplicate (`Orders — Sept (2)`) offset behind it. `approval` becomes a stack of three pending stamps. The line `approval → db` breaks (dashed, burnt spice) because the database is updated by hand later. `doc` drifts up and away from `human` (missing context). The link `email → sheet` gains the label `re-keyed`.
- Persistent objects: all seven, plus two temporary ghosts (`sheet-ghost`, `approval-queue`) owned by their parents.
- Scroll behaviour: each friction reveals in sequence as the scene progresses, so the visitor reads them one at a time. Mono tags name them: `DUPLICATE ENTRY`, `REPEATED APPROVAL`, `DISCONNECTED`, `MISSING CONTEXT`, `MANUAL HANDOFF`.
- Transformation: the clean chain shows its cost without leaving the composition.
- Transition to 04: the tags fade first, then the fixes begin, one per friction, in the same places.
- Interaction: hovering a tag reveals a one-line note (`entered twice, never reconciled`).
- Mobile: the same reveals on the vertical chain. Ghosts offset horizontally instead of diagonally so nothing leaves the viewport.

### SCENE 04 — INTERVENE

- Copy: `AUTOMATE THE COORDINATION. / CARRY THE CONTEXT. / PRESERVE THE HUMAN.` with a smaller line: `BUILD ONLY WHAT THE WORK REQUIRES.`
- Visual state: `sheet → db` and `db → api` become solid turmeric lines (integration, automation). The sheet's ghost collapses back into it. The approval queue collapses to one, and the approval now sits directly after the person, routed automatically. `doc` snaps back beside `human`: the context now travels with the decision. `human` gets a brighter ring and a tag, `HUMAN, PRESERVED`. The email stays, because customers still write emails.
- Scroll behaviour: each intervention lands in the order the frictions appeared. Tags: `INTEGRATION`, `AUTOMATION`, `INTERNAL TOOL`, `CONTEXT CARRIED`, `HUMAN, PRESERVED`.
- Transformation: the system becomes coherent without becoming empty of people.
- Transition to 05: the composition looks finished, which is the trap. The packet starts down the chain again, then stops halfway.
- Interaction: none beyond the standing proximity lift. The scene should feel resolved.
- Mobile: same states on the vertical chain.

### SCENE 05 — THE INTERRUPTION

- Copy: `SOMETIMES / THE RIGHT THING TO BUILD / IS NOTHING.` This is the largest type on the page. Below it, small: `We investigate whether something deserves to exist before we build it.`
- Visual state: the camera pulls back hard (scale → 0.78). The solid lines go dark. `api`, `db` and `approval` fade to near zero, drifting outward. `email`, `sheet`, `doc` and `human` remain, dim, small, far apart. Most of the stage is black paper.
- Scroll behaviour: the pull-back is scroll-tied, so the visitor feels themselves stepping away from the system.
- Transformation: the system that was heading toward "build" stops. The page removes the parts that never needed to exist.
- Transition to 06: from the emptied stage, the seven objects return, one by one, into a new arrangement.
- Interaction: none. Nothing to hover. That is the point.
- Mobile: identical, with the copy centred and the four remaining objects at the corners.

### SCENE 06 — PRESSURE TEST

- Copy: `BEFORE YOU BUILD IT, / TRY TO KILL IT.` and a line: `The Pressure Test. Seven questions. Transparent rules. No score.` with a live link `Pressure-test an idea →` to `/rd/pressure-test/`.
- Visual state: the same seven objects reorganise into a ladder of seven stages, each object relabelled with its role in the method: `doc → CLAIM`, `email → EVIDENCE`, `sheet → WORKAROUND`, `db → ECONOMIC PAIN`, `human → HUMAN`, `api → TEST`, `approval → DECISION`. Thin rungs connect them in order.
- Scroll behaviour: the ladder assembles top to bottom with the scroll. The relabel happens as each object arrives.
- Transformation: operational artifacts become an evidence method. The same objects, read differently.
- Transition to 07: the ladder loosens and the objects drift into two groups.
- Interaction: hovering a stage shows the actual Pressure Test question for that stage.
- Mobile: the ladder is vertical and compact, copy above it. The link is a real button.

### SCENE 07 — TWO DOORS

- Copy: two large links. Left: `I HAVE REAL WORK.` / `Tell us about the work →` (`/work/`). Right: `I HAVE AN IDEA.` / `Pressure-test the idea →` (`/rd/pressure-test/`). A hairline divides the stage vertically.
- Visual state: the operational cluster (`email, sheet, approval, db, api`) gathers behind the left door at low opacity. `doc` and `human` gather behind the right door. The objects are now the evidence of which door is which.
- Scroll behaviour: the doors settle in; the stage un-sticks at the end of the story and the page continues into the editorial record.
- Transformation: the whole narrative resolves into the two existing paths. They are not new buttons; they are where the objects went.
- Interaction: the doors are the site's primary CTAs. Hover lifts the door and brightens its objects.
- Mobile: doors stack vertically, each full width, each with its object cluster behind it.

### AFTER THE STORY — THE RECORD (static)

Compact editorial sections in the existing design language, no motion: Production proof (Frenchies, with the existing phone composition), What we design and develop (ledger), What you buy (ladder), What this isn't. Then the existing footer.

---

## 4. OBJECT SYSTEM

Seven persistent objects. Each is a DOM element with a stable id (`data-obj`) and a depth value. Their content is stylised operational data, not screenshots.

| Object | Depth | 01 The Work | 02 Understand | 03 Friction | 04 Intervene | 05 Nothing | 06 Pressure Test | 07 Doors |
|---|---|---|---|---|---|---|---|---|
| `email` — "Sept order change", from a customer | 0.55 | far left, tilted | first in chain | tagged `re-keyed` | unchanged (people still write email) | remains, dim | EVIDENCE | left door |
| `sheet` — "Orders — Sept", one highlighted row | 0.8 (near) | large, centre-left | second | forks into a ghost duplicate | ghost collapses; solid line to `db` | remains, dim | WORKAROUND | left door |
| `human` — "M. Ortiz · decides" | 0.7 | centre-right | third | `doc` drifts away from it | ring brightens, `HUMAN, PRESERVED` | remains, dim | HUMAN | right door |
| `approval` — "Pending · 2 days" | 0.45 | upper right, small | fourth | queue of three | single, automatic after decision | fades out | DECISION | left door |
| `db` — "orders · 12,408 rows" | 0.35 (far) | lower right, small | fifth | line from approval breaks | integrated, solid lines | fades out | ECONOMIC PAIN | left door |
| `doc` — "SOP v3 · change requests" | 0.5 | upper centre | above `human` | drifts away (missing context) | snaps beside `human` | remains, dim | CLAIM | right door |
| `api` — `POST /orders/4471 · 201` | 0.3 (far) | bottom left, small | last | end of chain | automated | fades out | TEST | left door |

Derived objects (owned by a parent, only exist in some scenes): `sheet-ghost`, `approval-queue`, the `packet` that travels the chain, and the connection lines.

Connections: `email→sheet`, `sheet→human`, `human→approval`, `approval→db`, `db→api`, `doc→human`. Each has a per-scene state: `hidden`, `faint` (dashed hairline), `drawing` (scroll-tied draw), `manual` (dashed), `broken` (dashed, burnt spice), `solid` (turmeric, automated), `rung` (pressure-test ladder), `dark`.

---

## 5. MOTION SYSTEM

- Scroll mapping. The story container is tall (about 8.4 viewports on desktop, 7 on mobile). Master progress `t = scrolled / (storyHeight − stageHeight)`, clamped to [0, 1]. Scenes carve `t` by weight. Local scene progress `u` drives copy and per-scene effects.
- Smoothing. The displayed progress follows the real progress with a time-based exponential lerp (roughly 120ms to settle). That gives scrub a cinematic weight without lag. Reduced-motion turns it off entirely (see §8).
- Timeline architecture. One master timeline. No per-section listeners. `story.js` is a declarative description (scenes, objects, poses, links, camera). `engine.js` reads it and writes transforms. Adding a scene is adding a pose column, not writing new scroll code.
- Easing philosophy. One ease for transitions between poses: the existing `--ease` curve, applied as an ease-in-out on the transition band. Objects at different depths use the same curve but different distances, which is where the parallax comes from. Nothing bounces, nothing overshoots.
- Camera illusion. A camera pose (`x, y, scale`) per scene. Each object's on-screen transform combines its pose with the camera weighted by its depth: near objects zoom and shift more than far ones. Push-in for 01→02, hold for 02→04, pull-back for 05, neutral for 06→07.
- Depth system. Three bands: far (0.3–0.45, small, dimmer), mid (0.5–0.6), near (0.7–0.8, larger, sharper shadow). Depth never changes for an object. Scale in a pose can.
- Parallax rules. Parallax only comes from camera moves acting on depth. There is no parallax on copy. There are no mouse-follow effects.
- Transition rules. An object leaves a scene by moving to its next pose, not by disappearing. Opacity changes are reserved for Scene 05 (removal) and the ghosts. Copy for a scene may not appear until the previous copy is gone.
- Velocity. The lag between real and smoothed progress is exposed as a tiny per-depth vertical offset (max 6px). Fast scrolling makes near objects trail slightly. Scrolling stops, the offset settles to zero.

---

## 6. TECHNICAL ARCHITECTURE

Recommendation: DOM + SVG + CSS transforms driven by a small first-party scroll engine. No GSAP, no Three.js, no canvas.

Why not GSAP/ScrollTrigger: the engine needs three things: map scroll to progress, interpolate poses, write transforms. That is ~300 lines. ScrollTrigger's pin is replaced by CSS `position: sticky`, which is native and behaves well on iOS. GSAP would add ~110 KB of JavaScript, a CDN or vendoring step, and a second timeline model on top of the declarative one. If Phase 2 exposes a need it cannot meet (complex nested sequencing, snap), GSAP is the named fallback and the pose data is shaped so it could be fed to it. It is permitted by the current CSP (jsDelivr) or by vendoring under `/assets`.

Why not WebGL/Three.js: the objects are documents, spreadsheets, people, stamps. They are typographic. They read best as crisp DOM with real text, and they need to stay real text for accessibility and SEO. WebGL would add a payload, a Safari risk surface and a fallback problem, and would buy nothing the story needs. No object in the storyboard requires true 3D.

Files added:

- `assets/story/scene.css` — stage, artifacts, links, copy layer, scene readout, static (reduced-motion / no-JS) layout. Additive only.
- `assets/story/story.js` — the declarative narrative: scenes, objects, poses (desktop and mobile), links, camera, labels.
- `assets/story/engine.js` — the scene engine: scroll mapping, smoothing, pose interpolation, camera and depth, link geometry, packet, copy visibility, proximity, static renderer.
- `assets/story/boot.js` — wires the engine to the DOM, handles reduced motion, sets the nav-height variable, dispatches `story_scene` analytics through the existing `track()`.

Everything is ES modules, first-party, no build step, loaded with `type="module"` like the existing runtime.

---

## 7. PERFORMANCE PLAN

- Payload: the story adds three text files, expected under 25 KB combined uncompressed. No new fonts, no images in the stage, no third-party scripts.
- Only `transform` and `opacity` animate. Objects get `will-change: transform`. Links are SVG lines updated by attribute (about ten elements per frame).
- One `requestAnimationFrame` loop that sleeps when the smoothed progress has settled and the pointer is idle. Scroll events only mark dirty state.
- No layout reads in the frame loop. Stage size and nav height are measured on resize only.
- Sticky stage uses `100svh` so the iOS Safari toolbar never causes overflow or resize jank.
- Stage height is capped so the seven artifacts always fit; the world scales with the shorter stage dimension.
- Mobile choreography uses fewer simultaneous transforms (the ghost and queue are simpler), and drops shadows from far objects.
- `matchMedia('(pointer: fine)')` gates proximity effects, so touch devices never run the hit-test.
- Fonts already preconnect; the stage only uses the four families already loaded.
- Test matrix for Phase 2 and 5: Chrome desktop, Safari macOS, iPhone Safari (real device, both toolbar states), Android Chrome, reduced-motion on each, JS disabled.

---

## 8. REDUCED MOTION PLAN

Two fallbacks, both real:

- No JavaScript: the story renders as an editorial sequence. Each scene's copy is a real section in document order. The seven artifacts appear once, as a static composition beneath the h1. The doors are ordinary links. Nothing is hidden.
- `prefers-reduced-motion: reduce` (with JS): the engine does not attach to scroll. Instead it renders a static plate per scene: the seven artifacts and their connections posed exactly as they would be at that scene's hold point, placed after that scene's copy. The visitor reads the same story as seven composed illustrations. No smoothing, no sticky, no fades.

The static layout is the default in CSS; JavaScript opts into the live stage by adding a class. A script failure therefore degrades to the editorial version automatically.

---

## 9. IMPLEMENTATION PHASES

- PHASE 1 (this session): engine, story definition, stage CSS, homepage rebuilt around the story with all seven scenes' copy in place, Scenes 01 and 02 fully choreographed, remaining scenes given first-pass poses so the timeline is continuous end to end. Static editorial record after the doors. Local run in Chromium at desktop and mobile widths, screenshots at each scene, console clean.
- PHASE 2: evaluate motion quality on a real iPhone and in Safari; tune scene weights, smoothing and depth; confirm the engine is sufficient or fall back to GSAP for specific needs. Confirm the static plates read well.
- PHASE 3: complete choreography for Scenes 03 to 07: friction reveals, intervention states, the pull-back, the ladder relabel, the door clusters. Hover notes on links and stages.
- PHASE 4: reconnect and polish: scene analytics through `track()`, attribution preserved on door links via `preserveUtm`, appendix content pass, OG and copy review, `sitemap`/`_redirects` housekeeping.
- PHASE 5: performance and accessibility QA: Lighthouse, keyboard order through the copy layer and doors, screen reader pass on the static and live variants, reduced-motion pass, throttled CPU test on mobile.

---

## 10. FAILURE CONDITIONS

Stop and rethink if any of these become true:

- Generic parallax: objects drift at different speeds but never change state or relationship. Depth without meaning.
- Animation soup: more than one thing changes for a reason the copy does not explain. Any transform without a line in the storyboard that justifies it.
- SaaS landing page: the story shrinks to a hero and the "record" grows sections, cards or a feature grid. Copy starts describing services instead of the system.
- Awwwards imitation: a custom cursor, text split into letters, mouse-follow anything, a loader screen, sound, a spinning object.
- Technical gimmick: WebGL, particles, blobs, glass, gradients appear. The seven objects stop being recognisable documents and people.
- Continuity broken: an object disappears at a scene boundary and a new one appears. Any scene that could be deleted without a neighbouring scene changing.
- Mobile as an afterthought: mobile is desktop scaled down, objects sit under copy, or scenes are skipped on small screens.
- Infrastructure damage: any change to `qb.js`, `triage.js`, `pressure-test.js`, `intake.js`, the function, the Supabase tables, or any route other than `/`.
- Reduced-motion is a blank page or a stack of unstyled headings.

---

## STATUS AFTER PHASE 1 (delivered in this branch)

Built and verified locally in Chromium at 1440×860 and 390×780, with and without `prefers-reduced-motion`:

- `assets/story/story.js`, `engine.js`, `scene.css`, `boot.js` (about 47 KB uncompressed, no dependencies).
- All seven scenes have poses, links, camera and copy, on desktop and mobile. Scenes 01 and 02 are tuned; 03 to 07 carry first-pass choreography that Phase 3 refines. Every object persists end to end.
- Reduced-motion renders seven static plates; no-JS renders the editorial sequence.
- `npm test` runs 12 unit tests on the engine's pure functions and the story data (inheritance, tween windows, mobile geometry coverage, link resolution, camera, copy windows).
- Analytics: `story_scene` fires once per scene per session through the existing `track()` fan-out. Door links carry attribution through `preserveUtm`.

Not done, by design: real-device iPhone Safari pass (Phase 2), hover notes on links (Phase 3), Lighthouse and screen-reader pass (Phase 5).

Known limitations to review in Phase 2: the stage assumes at least ~560px of viewport height on desktop; the scene readout and the proximity note are decorative only; the two Notes articles still load the unused Supabase CDN script.
