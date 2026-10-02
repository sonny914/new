---
name: Snack & Sip
description: A lemon-yellow drink board set in Anton, with every drink as a tilted vector cup; the front page drenches each category in one brand color, the order app lays the menu on the yellow canvas.
colors:
  yellow: "#FFC81F"
  yellow-deep: "#F0B60C"
  orange: "#F4661B"
  orange-deep: "#C94D0C"
  charcoal: "#1E1815"
  ink: "#100C0A"
  cream: "#FFFDF7"
  green: "#1C8F3C"
  blue: "#38C0F0"
  lime: "#7CB342"
  rim-red: "#E2402C"
  surface-secondary: "#FFF7E6"
  surface-control: "#F6EFE0"
  topping-selected: "#FFF0D2"
  text-secondary: "#5A524C"
  text-muted: "#6B615A"
typography:
  display:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "clamp(3.4rem, 18vw, 5.2rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Anton, Impact, sans-serif"
    fontSize: "clamp(2.6rem, 12.5vw, 3.6rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.005em"
  headline-app:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: "0.015em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "16.5px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  price:
    fontFamily: "Anton, Arial Narrow, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
    lineHeight: 1.15
  label-caps:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 800
    letterSpacing: "0.18em"
rounded:
  segment: "3px"
  shelf: "4px"
  control: "12px"
  tile: "16px"
  card: "22px"
  feature: "28px"
  stage: "34px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s8: "32px"
  s10: "40px"
  s12: "48px"
  s16: "64px"
  chrome: "14px"
  gutter: "22px"
  bar: "84px"
  col: "430px"
  wrap: "520px"
components:
  button-order:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1em"
    height: "54px"
  button-directions:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1em"
    height: "54px"
  chip-hours:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.9em"
    height: "38px"
  sticker:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  button-primary-app:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.price}"
    rounded: "{rounded.card}"
    padding: "17px 20px"
    height: "54px"
  button-primary-app-disabled:
    backgroundColor: "rgba(16,12,10,.12)"
    textColor: "rgba(16,12,10,.40)"
  button-ghost-app:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.card}"
    padding: "12px"
    height: "44px"
  button-cta-app:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "15px"
    height: "48px"
  chip-category:
    backgroundColor: "rgba(16,12,10,.06)"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"
    height: "44px"
  chip-category-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
  card-item:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "10px 16px 10px 10px"
    height: "70px"
  card-feature:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.cream}"
    rounded: "{rounded.feature}"
    padding: "24px"
  pill-option:
    backgroundColor: "rgba(16,12,10,.055)"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 15px"
    height: "46px"
  pill-option-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
  pill-topping:
    backgroundColor: "{colors.surface-control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "9px 11px"
    height: "46px"
  pill-topping-selected:
    backgroundColor: "{colors.topping-selected}"
    textColor: "{colors.ink}"
---

# Design System: Snack & Sip

## Overview

**Creative North Star: "The Drink Board"**

Snack & Sip looks like the shop's own menu board: lemon yellow as the ground, headings in Anton set tall and uppercase like hand-cut vinyl letters, prices in the same condensed face, and every drink drawn as a flat vector cup with a lime straw. Nothing is photographed and nothing is gray. The two surfaces share one brand kit (yellow, orange, charcoal, ink, cream, Anton, Figtree, the lemon mascot) and use it two ways. The front page is a vertical story: one category per full-height slide, each slide drenched edge to edge in a single brand color (charcoal, yellow, cream, orange, blue), a lineup of tilted cups in the middle, one Anton headline and a "from $" price at the bottom, and the two actions (Order ahead, Directions) pinned in a bar that never scrolls away. The order app is the board itself: a 520px column on solid yellow, a charcoal feature card for "Create your own", a chip rail for categories, cream item cards with a shared right-aligned price column, and a bottom sheet for building a drink.

Both surfaces are mobile-first and dense in different ways. The front page is blunt: one headline, one paragraph, one price per screen, and chrome that stays put. The order app is a working menu, so it carries a real type scale (section labels, item names, notes, prices) and a control vocabulary (chips, pills, swatches, sheet buttons), all on the same yellow canvas with cream cards floating on warm shadows.

**Key Characteristics:**
- Lemon yellow (`yellow`) is the brand ground; charcoal (`charcoal`) is the big dark surface; ink (`ink`) is text and primary action
- Anton, uppercase, for every heading and every price; Figtree for everything else
- Two text colors on the front page (ink on bright, cream on dark); the order app adds one warm gray (`text-secondary`) for notes and labels
- Drinks are vector cups: tapered trapezoid body, white lid or rim, lime straw, liquid as a two-stop vertical gradient taken from the drink's colors
- Front page: full-bleed slide colors, parallax layers, pinned pill bar, tilted cream stickers outlined in yellow
- Order app: cream cards on yellow, 12/16/22/28px radius steps, warm brown-tinted shadows, ink-filled selected states

## Colors

One owner palette, used flat: yellow ground, orange accent, charcoal and ink darks, cream light, a green for "open" only.

### Primary
- **Lemon Yellow** (`yellow`): The brand ground. The whole order app canvas, the front page's "Create your own" slide, bubble dots and progress segments on dark slides, highlighted price and total inside dark buttons, selection highlight. `yellow-deep` is its only shade, defined on both surfaces and reserved for pressed or edge states.
- **Ink** (`ink`): Body text on every bright surface, the primary button fill in the order app (sheet buttons, cart button, selected chips and pills), the base of every translucent hairline and inactive control (`rgba(16,12,10,…)`).

### Secondary
- **Orange** (`orange`): The accent. The "Order ahead" button, the front page focus ring, "from $" prices on dark slides, the hero CTA in the order app, the loyalty progress fill, the cart count badge, the topping-selected ring, link underlines inside stickers. `orange-deep` is the darker reading of it: the "closed" status dot on both surfaces and, as `text-price`, every price on cream in the order app (4.5:1).
- **Charcoal** (`charcoal`): The big dark surface. Front page hero, Dirty Energy and Come-find-us slides and the desktop stage; order app feature card, earned loyalty card and the ticket.

### Tertiary
- **Pool Blue** (`blue`): The Snow Cones slide stage on the front page; also the cotton-candy syrup swatch and the gradient stop on the Blue Raspberry cups.
- **Straw Lime** (`lime`): The straw on every cup, both surfaces; nothing else.
- **Rim Red** (`rim-red`): The chamoy rim stroke on the Chamoy & Tajín cup.
- **Open Green** (`green`): The "open" status dot only.

### Neutral
- **Cream** (`cream`): Text on dark slides, the Directions button, the hours chip, the stickers, every card and the bottom sheet in the order app, the text of ink-filled controls.
- **Warm Insets** (`surface-secondary`, `surface-control`, `topping-selected`): Order app only. The halo behind the cup in the sheet, the resting topping control, and the selected topping control.
- **Warm Grays** (`text-secondary`, `text-muted`): Order app only. Notes, section labels, meta and the footer; both pass 4.5:1 on cream.

### Named Rules
**The Yellow Ground Rule.** Yellow is a surface, never a text color. Type on yellow is ink or `text-secondary`; type on charcoal is cream, with yellow reserved for the one price or number that must pop.

**The Two Inks Rule (front page).** Front-page text is ink on the yellow, cream, orange and blue slides and cream on the charcoal slides. The slide class (`.dark`, `.yellow`, `.orange`, `.cream`, `.blue`) sets `--c`, `--fg` and `--seg` together; no other text color appears there.

**The Gradient Cup Rule.** A drink's color lives only in its cup: a two-stop vertical gradient from the drink's two colors (the order app's `colors` array, the front page's `<linearGradient>`), under a shared white-lid or white-rim symbol with a lime straw.

## Typography

**Display Font:** Anton (self-hosted, 400 only; falls back to Impact on the front page, Arial Narrow in the order app)
**Body Font:** Figtree (self-hosted variable 300 to 900; falls back to system-ui, sans-serif)

**Character:** Anton is a condensed grotesk set tall, uppercase and nearly solid, the way a shop board is lettered. It is never used below title size for running text; it marks headings and prices only. Figtree does all the reading and all the labels, in 400 for copy, 600 to 700 for meta and controls, 800 for names.

### Hierarchy
- **Display** (400, `clamp(3.4rem, 18vw, 5.2rem)`, 0.95, +0.005em, uppercase): The front page hero wordmark "Snack & Sip" only.
- **Headline** (400, `clamp(2.6rem, 12.5vw, 3.6rem)`, 0.95, +0.005em, uppercase, `text-wrap: balance`): One per front-page slide, the category name; the find slide steps down to `clamp(2.6rem, 12vw, 3.4rem)`.
- **Headline, app** (400, 32px, 1.0 to 1.03, +0.015 to +0.02em, uppercase): The order app's feature card title and the sheet's drink name (34px above 430px, 27px under 360px). The empty state uses 23px, the ticket number 68px, the order total 25px.
- **Title** (800, 16.5px, 1.2, -0.015em): Order app item names, event titles and cart lines (15.5px); the loyalty line is 19px/-0.02em. Front page sticker headings are instead Anton 1.1rem uppercase at +0.03em with an 18px stroke icon.
- **Price** (Anton 400, 18px, +0.01em, `text-price` on cream): Every price in the order app is Anton: list 18px, cart line 17px, feature card 22px in yellow, sheet button amount in yellow. On the front page the "from $" figure is Anton 1.5rem, orange on dark slides and ink on bright ones, after a Figtree 700 0.95rem "from".
- **Body** (400, 1rem/16px, 1.5): Front page slide copy at 1.05rem and max 34ch (hero 1.1rem, 28ch, with a yellow 700 strong); order app notes at 12.5 to 14px in `text-secondary`, line clamped to two on cards.
- **Label** (700, 0.85 to 1rem, sentence case): Front page pills, chip, cue, brand link and cup captions (0.78rem). Order app chips and ghost buttons are 14.5px 700, status 13px 600.
- **Label, caps** (800, 11.5px, +0.18em, uppercase, `text-secondary`): Order app only. Category blurbs, choice group labels, the size line (11px, `text-price`), the demo flag (10px, +0.14em). These are form and section labels, not kickers.

### Named Rules
**The Anton Is For Boards Rule.** Anton appears only uppercase and only as a heading, a price, a date or a primary button label. Never in body copy, notes, captions or chips; those are Figtree.

**The Numbers Line Up Rule.** Prices share a right edge (`min-width: 56px; text-align: right` on every item card) and the hours table sets `font-variant-numeric: tabular-nums` with the time column right-aligned and bold.

## Layout

Two columns, one per surface, both centered and both phone-first.

The front page is a single column `width: min(100%, 430px)`. On phones it is the page: `scroll-snap-type: y proximity` on the root, `overflow-x: clip` so the cups cannot spill. Each slide is `min-height: 100svh`, a two-row grid (`1fr auto`) padded `64px 22px` with `calc(84px + 22px)` at the bottom so copy clears the pinned bar; the cup lineup fills the middle row (three cups per row at `calc(33.3% - 10px)`, four-up at 42%, a single cup at 100%, gap `18px 10px`) and the copy block sits in the bottom row. The hero drops its top padding so media can bleed; the find slide switches to `auto auto auto 1fr` with 24px gaps so the two stickers stack under the heading and the footer sits at the bottom. Fixed chrome rides the same 430px width: seven progress segments across the top (14px side padding, 12px from the top, 4px gaps), the hours chip top-right at 26px, and the two-button bar at the bottom (14px sides, 10px gap, `max(16px, safe-area-inset-bottom)` below). At 760px and wider the root stops scrolling and the column becomes a phone-shaped stage: 28px top and bottom margins, `height: min(calc(100svh - 56px), 900px)`, 34px radius, scrolling internally with hidden scrollbars; chrome moves inward to 26px side padding, the fixed Anton wordmark appears bottom-left at 40px/36px with the round logo above it, and the surround takes the slide color. Under 700px tall the about line hides and cups shrink to 110px.

The order app is a 520px column (`.wrap`, 24px side gutter, 20px under 360px) on the yellow canvas with `padding-bottom: calc(112px + safe-area)` for the cart bar. The spacing scale is 4·8·12·16·20·24·32·40·48·64 (`--s1` to `--s16`); sections sit 48px apart, cards 12px apart, card padding 24px, feature card 24px. The category rail is a horizontal scroller with a 44px yellow fade on the right. Choice walls are 4-up grids (3-up under 360px), toppings 2-up (1-up under 360px). The sheet is fixed to the bottom at the same 520px, max 93vh. Two breakpoints only: `max-width: 359px` sheds size, `min-width: 430px` lifts the feature title to 34px.

Parallax depths on the front page are fixed per layer (bubbles 30, media 40, lineup 60, copy -24, px per viewport-height of offset from center) and off under `prefers-reduced-motion`, which also removes scroll snap, the bob animation and button transitions.

## Elevation & Depth

Color carries depth first. Front-page slides are flat planes of one brand color; the only things that float are the pinned pills, the cups and the stickers, and they float on neutral black shadows. The order app layers cream cards on the yellow canvas with two warm brown-tinted shadows and uses an ink-filled control as its selected state, so selection reads as weight rather than light.

### Shadow Vocabulary
- **Bar lift** (`box-shadow: 0 14px 28px rgba(0,0,0,.3)`): Front page. The two pinned bar buttons.
- **Chip lift** (`box-shadow: 0 10px 22px rgba(0,0,0,.28)`): Front page. The hours chip.
- **Cup drop** (`filter: drop-shadow(0 18px 22px rgba(16,12,10,.35))`): Front page. Every cup in the lineup.
- **Sticker** (`box-shadow: 0 18px 34px rgba(0,0,0,.35)` with `outline: 4px solid yellow`): Front page. The address and hours stickers on the charcoal find slide.
- **Stage frame** (`box-shadow: 0 40px 90px rgba(0,0,0,.45)`): Front page. The phone column on desktop only.
- **Hero scrim** (`linear-gradient(0deg, charcoal 0%, rgba(30,24,21,.8) 32%, rgba(30,24,21,0) 62%)`): Front page. Charcoal fade up from the bottom over the hero media.
- **e1** (`box-shadow: 0 1px 2px rgba(90,60,10,.07), 0 6px 16px rgba(90,60,10,.07)`): Order app. Item cards and the loyalty card at rest.
- **e2** (`box-shadow: 0 2px 6px rgba(90,60,10,.10), 0 18px 38px rgba(90,60,10,.14)`): Order app. The feature card, the cart button, and item cards on hover.
- **Sheet** (`box-shadow: 0 -18px 50px rgba(60,40,10,.28)` behind `rgba(16,12,10,.48)` scrim with 3px blur): Order app. The bottom sheet.
- **Swatch inset** (`inset 0 -7px 13px rgba(0,0,0,.17), inset 0 6px 10px rgba(255,255,255,.5)`): Order app. Syrup and purée dots read as liquid; selected adds `0 0 0 3px cream, 0 0 0 6px ink`.

### Named Rules
**The Floating Only Rule.** Slides, copy, bubbles and the yellow canvas carry no shadow. Only something that sits on top of a surface (a pill, a cup, a sticker, a card, a sheet) casts one.

**The Warm Shadow Rule (order app).** Shadows on the yellow canvas are brown-tinted (`rgba(90,60,10,…)`, `rgba(60,40,10,…)`), never neutral black, so cream cards look lit by the yellow rather than cut out of it.

## Shapes

Round-cornered, never sharp, with two radius vocabularies.

The front page uses three sizes: pills (999px) for every control, 22px for the stickers, 34px for the desktop stage, plus 3px progress segments, a 4px syrup shelf and perfectly round logo tiles and bubbles. Stickers tilt (`--tilt` of -2.5° and +1.5°), overlap by 16px and carry a 4px yellow outline so they read as stuck on. Cups tilt too (`--rot` from -4° to +4° across a lineup).

The order app uses a four-step scale, each tied to a role: 12px `control` for option pills and the focus ring, 16px `tile` for topping controls, 22px `card` for item cards and sheet buttons, 28px `feature` for the feature card, loyalty card, ticket and the sheet's top corners; pills (999px) are reserved for the category chips, the back link, the loyalty track and the demo flag. The cart count is a 9px-radius square, the swatch dots are circles with an inset gloss, the lemon badge is a circle.

Both surfaces draw drinks from the same geometry: a tapered trapezoid body (`M14 36h92l-9 100…`), three rounded ice cubes at 45% white, a white highlight stripe, an ellipse lid or a domed white lid with a band, a rotated rounded-rect straw, and for snow cones a white triangle under six overlapping circles. Icons are 24-unit SVG symbols in a 2px round-capped stroke (pin, clock, bag, down) and render at 18 to 20px.

Focus: front page `outline: 3px solid orange; outline-offset: 3px; border-radius: 999px`; order app `outline: 3px solid ink; outline-offset: 3px; border-radius: 12px`.

## Components

### Buttons
- **Front page bar buttons:** Full pill (999px), 54px min height, `padding: 0 1em`, `gap: .5em`, 20px stroke icon in front, Figtree 700 1rem, bar lift shadow. Two only: **Order ahead** is orange on ink; **Directions** is cream on ink. Hover rises 2px over .35s on the front ease; active presses 1px down at 98% scale; focus is the orange ring.
- **Order app primary (`.btn`):** 22px radius, full width, 54px min height, `padding: 17px 20px`, ink fill, cream text, Anton 18px uppercase at +0.05em, label left and amount right (`.amt` in yellow). `.ok` turns the fill green for a confirmed ticket. Disabled is `rgba(16,12,10,.12)` on `rgba(16,12,10,.40)`. Active scales to 98%.
- **Order app cart button:** Same as primary with 58px min height, e2 shadow, an orange 28px count badge (Anton 15px, 9px radius) on the left and the total in yellow on the right; the count bumps to 128% for .42s when it changes.
- **Order app CTA (feature card):** Orange on ink, 22px radius, `padding: 15px`, 48px min height, Anton 17px uppercase at +0.06em, arrow slides 4px right on card hover.
- **Ghost:** Transparent, `text-secondary`, Figtree 700 14.5px sentence case, 44px min height, under the primary in the cart sheet.
- **Back link:** Pill, `rgba(16,12,10,.08)`, Figtree 700 14px, `padding: 8px 14px`.

### Chips
- **Hours chip (front page):** Fixed top-right, cream pill 38px tall, `padding: 0 .9em`, Figtree 700 0.85rem, chip lift shadow, leading 8px dot: green when open, `orange-deep` when closed. Text is live ("Open till 8 PM", "Opens 11 AM", "Closed · opens 11 AM"); it links to the hours sticker.
- **Category chip (order app):** Pill, `rgba(16,12,10,.06)` on `text-secondary`, Figtree 700 14.5px, `padding: 11px 18px`, 44px min height, in a horizontal rail. Selected (`aria-selected`) fills ink with cream text at 800. Active scales to 95%.
- **Status line (order app):** 7px dot plus Figtree 600 13px in `text-secondary` with the hours in 800 ink; closed turns the dot and hours `orange-deep`.

### Cards / Containers
- **Item card (order app):** 22px radius, cream, e1 shadow (e2 on hover), `padding: 10px 16px 10px 10px`, 70px min height, 12px between cards: 58×70 cup thumb, name (Title) and two-line note, Anton price right-aligned on a shared 56px column. Active scales to 98.8%.
- **Feature card (order app):** 28px radius, charcoal, cream text, 24px padding, e2 shadow; Anton 32px title, 14px sub at 80% cream, "From $7" with the figure in Anton 22px yellow, an 8px syrup shelf, then the orange CTA.
- **Loyalty card (order app):** 28px radius, cream, e1, 24px padding, with a 10px pill track filled orange over 1.1s; when earned it flips to charcoal with yellow label, fill and total.
- **Ticket (order app):** 28px radius, charcoal, centered, with the order number in Anton 68px yellow.
- **Sticker (front page):** 22px radius, cream, `padding: 18px 20px`, 4px yellow outline, sticker shadow, tilted and overlapped; Anton 1.1rem uppercase heading with an 18px icon; links underline 2px in orange at 0.2em offset; hours rows divide with a 1px line at 14% ink, today's row gets an orange-dotted "today" marker.
- **Bottom sheet (order app):** Cream, `border-radius: 28px 28px 0 0`, max 93vh, 44×5px grab handle at 14% ink, 44px round close button; slides up over .34s on the app ease behind a 48% ink scrim.

### Inputs / Fields
- **Option pill (order app):** 12px radius, `rgba(16,12,10,.055)` fill, Figtree 600 14px ink, `padding: 12px 15px`, 46px min height, leading 14px glossy color pip and trailing 11.5px price in `text-muted`. Pressed (`aria-pressed`) fills ink with cream text at 700 and the price in yellow.
- **Topping pill (order app):** 16px radius, `surface-control` fill, 12px text in a 2-up grid, an 18px 6px-radius checkbox at 9% ink. Pressed turns the fill `topping-selected` with a 1.5px orange inset ring, the checkbox orange with a cream tick that springs in on `cubic-bezier(.3,1.5,.5,1)`.
- **Swatch (order app):** 48px glossy circle in the syrup's color under an 11px 600 caption, in a 4-up wall; pressed scales to 108% with a cream-then-ink double ring and the caption in 800 ink.
- **Group label:** Label-caps with a required marker in orange at +0.1em.

### Navigation
- **Front page chrome:** Seven 3px progress segments across the top, track at 35% of `--seg` (cream on dark slides, ink on bright ones), fill scaled from the left as the slide scrolls in; the hours chip top-right; the two-button bar pinned at the bottom on every slide. The brand link sits top-left of the hero: 36px round logo and "Snack & Sip" in Figtree 700 0.95rem cream. The desktop wordmark (Anton `clamp(1.4rem, 2.4vw, 2rem)` uppercase, 64px logo above, Figtree 600 0.85rem subline at 80% cream) shows only at 760px and wider.
- **Order app header:** Centered 120px round lemon badge, back link pill above it, status line below; the category rail is the only navigation, a scroll-snapping chip row.

### Signature Component: Cup Lineup
A front-page slide's middle row: three to five vector cups, each a `<figure>` with its own two-stop gradient liquid and a `<use>` of the shared cup, lidded-cup or cone symbol, tilted by `--rot`, dropped with the cup shadow, captioned in Figtree 700 0.78rem. The same geometry is drawn in the order app by `drinkSVG()` for thumbs (58×70), the feature card (112×136) and the sheet stage (on a 248×190 `surface-secondary` halo, pouring in over .4s and recoloring liquid and bits over .48s).

## Do's and Don'ts

### Do:
- **Do** keep yellow as a surface and ink or cream as the text on it; reach for `text-secondary` only in the order app for notes and labels.
- **Do** set every heading, price, date and primary button in Anton, uppercase, tight (0.95 to 1.04 line-height, +0.005 to +0.06em), and everything else in Figtree.
- **Do** give a new front-page slide one of the five themes (`.dark`, `.yellow`, `.orange`, `.cream`, `.blue`) and declare the same color on `data-c` so the page, stage and browser theme-color follow it.
- **Do** draw every drink as the shared cup, lidded cup or cone symbol over a two-stop vertical gradient of that drink's two colors, with a lime straw.
- **Do** use the order app's radius roles as named: 12px for option controls, 16px for topping controls, 22px for cards and sheet buttons, 28px for feature surfaces, pills for chips.
- **Do** keep Order ahead and Directions pinned and reachable from every slide, and turn parallax, snap and the bob animation off under `prefers-reduced-motion`.
- **Do** right-align prices on a shared column and keep the hours table in tabular numerals.

### Don't:
- **Don't** add a gray or neutral page background; the ground is yellow, the dark surface is charcoal, cards are cream.
- **Don't** set Anton in running copy, chips, notes or captions, and don't use Figtree for a price.
- **Don't** put a neutral black drop shadow on an order-app card; shadows on the yellow canvas are brown-tinted (`rgba(90,60,10,…)`).
- **Don't** use a third text color on the front page; ink on bright slides, cream on dark ones, with orange or yellow only for the price figure and the strong word.
- **Don't** add a top navigation bar or a third pinned action to the front page; the chrome is the progress strip, the hours chip and the two-button bar.
- **Don't** photograph drinks or use raster illustrations in place of the vector cup.
