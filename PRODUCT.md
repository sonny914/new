# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Owner-operators of service and hospitality businesses (cafés, small shops, independent operators) whose inquiry → response → scheduling → fulfillment → follow-up handoff runs on a stack of platforms built for someone else's business model. They are deciding whether to hire Quiet Bands to build software around their work. Secondary audiences (property, commercial and multi-location operators, see `/commercial` and `/resident-experience`) exist on the site but are not the confirmed primary user.

## Product Purpose
Quiet Bands is a Houston, Texas custom-software studio: custom software, internal tools, integrations and automation built around operational problems. The site exists to turn a visitor into a conversation (email or SMS, and the discovery/triage form that scores inbound leads). Success is a qualified owner-operator making contact.

## Positioning
Proof of work: a shipped, running product. Frenchies Coffee Bar (Connecticut; order ahead, rewards and payment for a two-location coffee company) is in production. Supporting claim from existing copy: "Before you build it, try to kill it." Ideas are pressure-tested first, and sometimes the finding is that nothing should be built. (Confirmed emphasis: shipped in production over method.)

## Operating Context
Leads arrive via mobile SMS, email, or the desktop discovery form, then are scored by a Claude-powered Netlify function and stored in Supabase. The site is a static Netlify deploy. The current homepage is the "Bulb Entry": a scroll-driven fractured-bulb sequence whose four fragments navigate to Work, Method, Experiments and Contact (see `docs/BRIEF.md`).

## Capabilities and Constraints
- Static HTML, three.js via CDN, no framework; Netlify with a zero-dependency function (`netlify/functions/score-lead.js`) and Supabase for leads.
- No pricing, offer pages, upmarket pivot or new products (per `docs/BRIEF.md`).
- Contact is `jason@quietbands.com` and SMS ("Text me").
- Resident Experience (Work 002) is in development, not shipped.
- Undecided: whether secondary audiences get equal prominence on the homepage.

## Brand Commitments
- Name: Quiet Bands. Tagline in use: "Custom software. Built around the work."
- Voice: plain, blunt, investigative-skeptic (from `docs/BRIEF.md`).
- Supplied mark and palette are governed by the `qb-identity` skill.

## Evidence on Hand
- One shipped product: Frenchies Coffee Bar (`/work/frenchies`).
- Lab experiments and notes under `/lab`, `/notes`, `/rd` (e.g. Spatial Hero story, Pressure Test).
- Absent, and must not be fabricated: client counts, testimonials, metrics, benchmarks, pricing, results.

## Product Principles
1. Honest proof only: one shipped product is listed because one has shipped.
2. Kill the idea before building it; showing the skeptic's work is the pitch.
3. Software wraps the owner's business rather than forcing it into a generic platform.
4. Every page leads to a human conversation, not a funnel of offers.

## Accessibility & Inclusion
Tap targets at least 44px, keyboard focusable with visible focus, reduced-motion fallback, and no-JS plain links (per `docs/BRIEF.md`).
