---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface brief: snackandsip/index.html

Scope: whole one-page site, redesign. Visitor mode: Persuade.
Audience: phones at/near Pearland Town Center; social arrivals (Instagram/TikTok). Action: tap Directions; second: check hours. Proof: the drinks (Peach Thriller + 6 others). No reviews, prices, phone, handle, shop photos: none invented.

## Direction contract

THESIS: The page is a vertical story you scroll through, one drink per full-screen slide, each drenched in that drink's color. It refuses the cafe-landing arrangement (hero, three cards, hours table, map) in favor of a feed-native rhythm the social audience already reads.

OWN-WORLD (revised after the owner supplied the real brand): owner lemon-mascot logo; yellow #FFC81F / orange #F4661B / charcoal #1E1815 / ink #100C0A / cream #FFFDF7 (+ blue #38C0F0 for snow cones). One drenched slide per menu CATEGORY with a lineup of gradient vector cups using the real drink colours. Display face Anton (uppercase), body Figtree. Components: story progress segments, fixed hours chip top-right, pinned bar with Directions (orange primary) + Order ahead (cream, links to /order/, a labelled demo), yellow-outlined stickers on the find slide, 2px-stroke SVG icons. Phone column (430px, capped 900px tall) on a stage that tints to the current slide on desktop. See DESIGN.md.

STORY: "This is a colorful drink stand at the Town Center, open now, here's how to walk there." Visitor sees the clip, flips through the flavors, taps Directions from anywhere.

FIRST VIEWPORT: Full-bleed looping clip (poster fallback) in the phone column, progress segments across the top, 'Snack & Sip' in Unbounded at ~15vw bottom-left over a plum-to-transparent scrim, one line: "Pearland Town Center · next to Great American Cookies". Pinned bottom bar: ink Directions button (primary) + white hours chip showing live open/closed state.

FORM: Story Format (Impeccable's pick card, chosen by user over the assigned Sign-Painter Stand on re-roll 1). Candidate #1 on my ordered list. Seed key 80e3f0e8 (degraded roll, no challengers). Later merged with the owner's order-ahead app (order/) at the user's direction.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

Signature interaction: progress segments fill as each slide scrolls into view; slide color bleeds into the stage. Parallax: bubbles (slow), cup (mid), text (fast); off under reduced motion. Scroll-snap per slide on touch; hours/directions never require passing slides.

Open: Instagram handle, phone number, the untold unique fact, hero.mp4 file (blocked download), Netlify link method.
