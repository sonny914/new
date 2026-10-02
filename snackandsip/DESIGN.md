---
name: Snack & Sip
description: One drink per full-screen slide, each drenched in that drink's color, with directions and hours pinned one tap away.
colors:
  ink: "#1e0a2e"
  paper: "#fff"
  peach: "#ff9e6b"
  berry: "#ff4f7b"
  mango: "#ffc233"
  sky: "#4fc3ff"
  coco: "#f1ebdd"
  cola: "#4a2a1f"
  ice: "#6e3be8"
  sticker-cream: "#fff3e6"
  open-green: "#1cab5a"
typography:
  display:
    fontFamily: "Unbounded, Figtree, sans-serif"
    fontSize: "clamp(2.75rem, 15.5vw, 4.4rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Unbounded, Figtree, sans-serif"
    fontSize: "clamp(2.1rem, 10.5vw, 3.1rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Unbounded, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
    letterSpacing: "0.01em"
rounded:
  mark: "10px"
  sticker: "22px"
  stage: "34px"
  pill: "999px"
spacing:
  chrome: "14px"
  gutter: "22px"
  stack: "24px"
  slide-top: "64px"
  bar: "84px"
  col: "430px"
components:
  button-primary:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.2em"
    height: "54px"
  button-primary-on-bright:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.2em"
    height: "54px"
  chip-status:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.1em"
    height: "54px"
  badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.42em 0.9em"
  sticker:
    backgroundColor: "{colors.sticker-cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sticker}"
    padding: "18px 20px"
---

# Design System: Snack & Sip

## Overview

**Creative North Star: "The Flavor Reel"**

Snack & Sip reads like a story reel, not a cafe landing page. The whole site is a single phone-width column (430px) of full-height slides; each slide is one drink, and the slide is drenched edge to edge in that drink's color. There is no white page behind anything: the stage itself (the html background, the desktop surround, even the browser theme-color) tints to whatever slide is in view, so the color is the room, not a card inside it. Text is one of two inks only, plum on bright slides and white on dark ones, which keeps nine wildly different backgrounds feeling like one voice.

Density is low and the hierarchy is blunt: one oversized Unbounded headline per slide, one or two lines of Figtree, a vector cup, and nothing else. The type is wide, rounded and heavy on purpose; it has to hold its own against saturated color at phone scale. Everything interactive is a pill, everything that floats carries the same plum-tinted lift shadow, and the two actions that matter (Directions, live hours) never scroll away.

**Key Characteristics:**
- Full-bleed drenched color per slide; no neutral page behind it
- Two text inks only: plum (`ink`) on bright, white (`paper`) on dark
- Unbounded 800 display, tight (-0.025em) and nearly solid (0.98 line-height), paired with Figtree body
- Every control is a 54px-tall pill with the same lift shadow
- Flat vector cups built from one SVG symbol, re-tinted per slide by `color-mix`
- Progress segments on top, pinned action bar on the bottom, parallax layers in between

## Colors

Nine slide colors, two inks, and two small functional accents; the slide colors are not decoration but the identity of each drink.

### Primary
- **Peach** (`peach`): The signature. Default fill of the primary Directions button on dark slides, selection highlight color, link underline color inside stickers, and the stage color of the Peach Thriller slide.
- **Plum Ink** (`ink`): The brand dark. Hero and "Come find us" stage, all text on bright slides, badges, the Directions button on bright slides, and the base of every drop shadow (`rgba(30,10,46,…)`).

### Secondary
- **Strawberry** (`berry`): Stage of the strawberry slide; also the straw color on cream and dark cups, the "closed" dot in the hours chip, and the "today" marker dot in the hours table.
- **Mango** (`mango`), **Cotton-Candy Sky** (`sky`), **Coconut Cream** (`coco`), **Cola** (`cola`), **Violet Ice** (`ice`): One slide each. They exist only as stages; they never appear as text or control colors.

### Neutral
- **Paper** (`paper`): Text on dark slides, the hours chip surface, focus ring, progress segments, bubble dots, and cup highlights at 18–80% opacity.
- **Sticker Cream** (`sticker-cream`): The warm off-white of the address and hours stickers on the final plum slide.
- **Open Green** (`open-green`): Only the status dot in the hours chip when the shop is open.

### Named Rules
**The Two Inks Rule.** Text is `ink` on bright stages and `paper` on dark stages (hero, cola, ice, find). No third text color, no tinted text, no gray.

**The Stage Follows the Slide Rule.** The page background, the desktop surround, the primary button fill and the browser theme-color all take the color of the slide in view. A new slide ships with its own `data-c` color and its own `--btn`/`--btn-ink` pair.

**The Derived Liquid Rule.** Cup liquid is `color-mix(in oklch, slide-color 70%, ink)` and the lid is `color-mix(in oklch, slide-color 45%, #fff)`. Only explicitly cream or cola drinks override those with their own liquid hex.

## Typography

**Display Font:** Unbounded (self-hosted variable, 200–900; falls back to Figtree, sans-serif)
**Body Font:** Figtree (self-hosted variable, 300–900; falls back to system-ui, sans-serif)

**Character:** Unbounded is wide, rounded and set heavy and tight so a two-word drink name fills the column like a poster. Figtree underneath is plain and friendly; it never competes.

### Hierarchy
- **Display** (800, `clamp(2.75rem, 15.5vw, 4.4rem)`, 0.98, -0.025em): The hero wordmark "Snack & Sip" only.
- **Headline** (800, `clamp(2.1rem, 10.5vw, 3.1rem)`, 0.98, -0.025em): One per drink slide; the drink's name, `text-wrap: balance`. The final slide's "Come find us" steps down to `clamp(2rem, 9.5vw, 2.8rem)`.
- **Title** (800, 1rem, -0.01em): Sticker headings ("Where", "Hours"), set with an 18px stroke icon in front.
- **Body** (400, 1.05rem, 1.5): Slide copy, max 34ch; hero copy 1.1rem at 30ch; sticker address 1.05rem/1.4. Emphasis is 700, never italic.
- **Label** (700, 0.85–1.02rem): Pills, badges, brand link and footer. Badge at 0.85rem with +0.01em tracking; chip at 0.92rem; button at 1.02rem. Sentence case, never uppercase.
- **Desktop wordmark** (800, `clamp(1rem, 2vw, 1.4rem)`, -0.02em): The fixed Unbounded lockup bottom-left of the stage, with a 600 Figtree 0.85rem subline at 75% white.

### Named Rules
**The One Headline Rule.** Each slide carries exactly one Unbounded line. Unbounded never appears in body copy, pills or tables; those are Figtree 700.

**The Numbers Line Up Rule.** The hours table sets `font-variant-numeric: tabular-nums` with the time column right-aligned and bold.

## Layout

A single centered column, `width: min(100%, 430px)`, holds everything. On phones it is the page; `scroll-snap-type: y proximity` on the root snaps each slide into place and `overflow-x: clip` prevents the oversized cups from spilling sideways.

Each slide is `min-height: 100svh`, a two-row grid (`1fr auto`) with the copy block pinned to the bottom row, padded `64px 22px` and `calc(84px + 22px)` at the bottom so copy clears the pinned bar. The hero drops the top padding so its media can bleed; the final slide switches to `auto auto auto 1fr` with 24px gaps so the two stickers stack under the heading and the footer sits at the bottom.

Fixed chrome is laid over the column at the same 430px width: the progress strip at the top (14px side padding, 12px top, 4px gaps between nine segments) and the action bar at the bottom (14px side padding, 10px gap, bottom padding `max(16px, safe-area-inset-bottom)`).

At 760px and wider the root stops scrolling and the column becomes a phone-shaped stage: 28px top and bottom margins, `height: calc(100svh - 56px)`, 34px radius, scrolling internally with hidden scrollbars. The progress strip and bar move inward to 26px side padding and 28px offsets, and the fixed wordmark appears bottom-left at 40px/36px. The surround takes the slide color at full bleed.

Parallax depths are fixed: bubbles 30, cup 70, media 40, copy -24 (pixels per viewport-height of offset), all disabled under `prefers-reduced-motion`.

## Elevation & Depth

Depth comes from color first and shadow second. Slides are flat planes of one color; stacking is signalled by the plum-tinted lift shadow on anything that floats above a slide (pills, cups) and by the parallax layers moving at different speeds. Stickers add a 4px white outline and a slight tilt on top of their shadow so they read as physical paper.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 14px 28px rgba(30,10,46,.3)`): Every pinned control (Directions button, hours chip). Always plum-tinted so it reads on any stage color.
- **Cup drop** (`filter: drop-shadow(0 26px 30px rgba(30,10,46,.28))`): The vector cup on every drink slide.
- **Sticker** (`box-shadow: 0 18px 34px rgba(0,0,0,.3)` plus `outline: 4px solid #fff`): The address and hours stickers on the final slide.
- **Stage frame** (`box-shadow: 0 40px 90px rgba(0,0,0,.35)`): The phone column on desktop only.
- **Hero scrim** (`linear-gradient(0deg, ink 0%, rgba(30,10,46,.75) 36%, transparent 70%)`): Plum fade from the bottom over the hero media so white type stays legible.

### Named Rules
**The Plum Shadow Rule.** Shadows under controls and cups are tinted with `ink` (`rgba(30,10,46,…)`), never neutral black; only the sticker and desktop frame use black because they sit on the plum stage.

**The Floating Only Rule.** Slides, copy and bubbles carry no shadow. If it is not a pill, a cup or a sticker, it is flat.

## Shapes

Round and soft throughout. Interactive elements are full pills (999px radius) at 54px tall; the badge is the same pill at text scale. Stickers are generously rounded cards (22px) with a 4px white outline, rotated -2.5° and +1.5° and overlapped by 16px so they look pinned on. The brand mark is a 10px-radius square, progress segments are 3px tall with 3px radius, the desktop stage is a 34px-radius phone frame, bubbles are perfect circles.

Vector cups are a tapered trapezoid body with an ellipse lid, rounded ice cubes, white highlight stripe and a tilted straw; the snow cone is a white triangle with six overlapping circles. Both come from one `<symbol>` and get their color through CSS fills (`.liq`, `.lid`, `.straw`, `.glass`). Icons are 24-unit SVG symbols in a 2px round-capped stroke (pin, clock, arrow, down) plus one filled star; they render at 14–20px inside pills and badges.

Focus is a 3px white outline, 3px offset, pill-rounded.

## Components

### Buttons
- **Shape:** Full pill (999px), 54px min height, `padding: 0 1.2em`, `gap: .55em`, 20px icons each side.
- **Primary (Directions):** Fill and text come from the current slide via `--btn`/`--btn-ink`: peach on plum (hero, find), plum on paper for every bright drink slide, and plum/paper on the dark cola and ice slides. Figtree 700 at 1.02rem, lift shadow.
- **Hover / Focus:** Rises 2px (`translateY(-2px)`) over 0.35s on the signature ease; background and color cross-fade over 0.5s as the slide changes. Active presses 1px down at 98% scale. Focus-visible shows the 3px white ring.
- **Secondary:** None. The hours chip is the only sibling control.

### Chips
- **Style (hours chip):** Paper pill, plum text, Figtree 700 at 0.92rem, 54px tall, `padding: 0 1.1em`, lift shadow, no-wrap.
- **State:** Leads with a 9px dot: open green when open, strawberry when closed. Text is live ("Open till 8 PM", "Opens 11 AM today", "Closed, opens tomorrow 11 AM"); it links to the hours sticker.

### Badge
- **Style:** Plum pill, paper text, Figtree 700 at 0.85rem with +0.01em tracking, `padding: .42em .9em`, 14px filled star in front. Used once for the signature drink ("Popular").

### Cards / Containers (Stickers)
- **Corner Style:** 22px radius with a 4px white outline.
- **Background:** Sticker cream (`sticker-cream`), plum text.
- **Shadow Strategy:** Sticker shadow (see Elevation).
- **Border:** None beyond the outline; rows inside the hours table divide with a 1px line at 14% plum.
- **Internal Padding:** 18px 20px. Heading is Unbounded 800 1rem with an 18px icon; links underline 2px in peach at 0.2em offset.
- **Behavior:** Alternating tilt via `--tilt` (-2.5°, +1.5°) and a -16px overlap on the second sticker. Today's hours row gets a strawberry-dotted "today" marker.

### Navigation
- **Brand link:** Top-left of the hero, 34px rounded logo tile and "Snack & Sip" in Figtree 700 at 0.95rem, white, no underline.
- **Progress segments:** Nine 3px pills across the top, one per slide; track at 35% of the segment color, fill scaled from the left as the slide scrolls in. Segment color is paper except on the coconut slide where `--seg` flips to plum.
- **Pinned bar:** Directions button and hours chip fixed to the bottom of the column on every slide, so the two actions never require passing a slide.
- **Mobile treatment:** Same bar; the desktop-only wordmark is hidden under 760px.

### Signature Component: Drenched Slide
A full-height section whose background is one slide color (`--c`), with up to three layers that move at different parallax depths: white bubble dots at 35% opacity (plum at 12% on the cream slide), the tinted vector cup positioned top-right at 66% width (max 300px), and the copy block anchored bottom-left. The hero variant swaps the cup for full-bleed media under the plum scrim. Each slide declares its stage color on `data-c` so the chrome can follow it.

## Do's and Don'ts

### Do:
- **Do** give every new slide its own full-bleed stage color and declare it on `data-c` so the page, surround and theme-color follow it.
- **Do** keep text to the two inks: plum on bright stages, white on dark.
- **Do** set every control as a 54px pill with the plum lift shadow (`0 14px 28px rgba(30,10,46,.3)`).
- **Do** use Unbounded 800 at 0.98 line-height and -0.025em for the single headline per slide, Figtree 700 for every label.
- **Do** build new cups and icons as SVG symbols tinted by CSS fills, icons in a 2px round-capped stroke.
- **Do** keep Directions and hours pinned and reachable from every slide, and turn parallax off under `prefers-reduced-motion`.

### Don't:
- **Don't** introduce a neutral page background, cards on white, or a gray text tone; the slide color is the surface.
- **Don't** use uppercase labels, eyebrows or kickers above headlines; the slide name is the only heading.
- **Don't** use Unbounded below title size or in running copy, pills or tables.
- **Don't** add a hard, neutral-black shadow under a control; shadows that float over color are plum-tinted.
- **Don't** add a third pinned action or a top navigation bar; the chrome is the progress strip and the two-item bar.
