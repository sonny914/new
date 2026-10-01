# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: peers and builders who follow the R&D work, such as other developers, designers and studio owners. They judge the thinking and the craft by looking at how the site itself is made.

Secondary, confirmed by the repo but not the lead audience:
- Service businesses with a messy handoff between inquiry, response, scheduling, fulfillment and follow-up (`/small-business/`, `/work/` intake form).
- Property, hospitality and multi-location operators (`/commercial/`, `/resident-experience/`).

## Product Purpose

Quiet Bands LLC is a Houston studio that builds custom software around how the work actually runs. The site presents the studio's thinking and method first, and routes real prospects into a project intake form (`/work/`). Success: a peer reads it as serious work, and a prospect with a real process problem submits the intake.

## Positioning

The studio pressure-tests every idea before building it: "Before you build it, try to kill it." The kill test (six things looked for, in order) is documented in the Field Guide and the Pressure Test. A neighbouring dev shop could not truthfully copy this without having done and published the method.

## Operating Context

- Leads arrive through the intake form on `/work/`; a Netlify function (`netlify/functions/score-lead.js`) scores them with Claude and stores them in Supabase.
- Static site on Netlify, no framework; three.js for the home entry.
- Jay replies to qualified inquiries personally; unfit inquiries get a straight answer and a pointer elsewhere.

## Capabilities and Constraints

- Surfaces: the bulb entry (`/`) and R&D page (`/rd/`) are the two navigable surfaces per `docs/BRIEF.md`. The older pages stay on disk, unlinked from the entry: work, Frenchies case, commercial, small business, resident experience, notes, pressure test.
- The home nav is four pieces: Work, Method, Experiments, Contact.
- Out of scope per the brief: pricing, offer pages, an upmarket pivot, new products.
- Terminology: "Work" for intake and client work, "Method" for the kill test, "Experiments" for Lab entries, "Engagement 001" for the productized small-business build.
- Open, undecided: the older inner pages' relationship to the entry's palette, and which of the unlinked pages return to the nav.

## Brand Commitments

- Name: Quiet Bands (lowercase wordmark "quiet bands"). Supplied mark of two bowls either side of a rising stem, rebuilt as geometry in `assets/brand/`.
- Voice on R&D: Investigative Skeptic Voice. Plain, evidence-first, honest about what failed.
- Brand values pinned in the runtime: black `#000000`, cream `#F2EEE5`, orange `#FF5A00` (orange only where something is live). Identity and glass rules are in the `qb-identity` skill.

## Evidence on Hand

- One shipped product: Frenchies (ordering, loyalty, payments, multi-location), in production; case at `/work/frenchies/`.
- Resident Experience (Work 002) is in development, not shipped.
- Lab 001 (Spatial Hero) is told honestly: it was retired, and its measurements were headless with no user testing.
- Field Guide PDF and the Pressure Test (`/rd/pressure-test/`, `downloads/`).
- Contact: Jay, jason@quietbands.com, Houston. Quiet Bands LLC.
- Absent, and not to be invented: client counts, metrics, benchmarks, testimonials, pricing.

## Product Principles

1. **Show the method by being built with it.** The site is evidence of the studio's thinking; the bulb, the fracture and the honest Lab 001 write-up are the proof, not claims about it.
2. **No invented proof.** One shipped product, stated as one. Absences stay absences.
3. **Kill ideas sooner.** Every surface should help a visitor test an idea rather than sell them a build.
4. **The nav is the object.** Four sections, no extra chrome; nothing else navigable from the entry.
5. **Peers first, prospects reachable.** Lead with the craft and the method; keep the path to intake short and unmissable.

## Accessibility & Inclusion

Tap targets at least 44 px, keyboard-focusable navigation with visible focus, reduced-motion and no-JS/no-WebGL fallbacks that keep the four sections reachable, AA text contrast.
