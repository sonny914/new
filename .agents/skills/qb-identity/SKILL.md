---
name: qb-identity
description: Quiet Bands brand identity and 3D glass lighting rules for this site. Use before any work that shows the Quiet Bands mark or name, picks brand colours, makes icons or share images, or touches the glass bulb's materials, reflections or environment (assets/bulb/entry.js).
---

# Quiet Bands identity and glass light

## Identity

- **Mark:** two opposed bowls either side of a taller rounded stem (a stylised "qb"). The stem rises above the bowls and drops a little below them. One flat colour, never outlined, split, stretched or recoloured per part. The three-band mark is retired everywhere.
- **Wordmark:** lowercase "quiet bands" in a heavy geometric sans. It is the supplied vector, never typeset, and never title case.
- **Files:** `assets/brand/mark.svg` (viewBox 823×658), `wordmark.svg` (845×155) and `lockup.svg` (mark stacked over wordmark). Inline copies use `fill: currentColor`, so hover and palette follow the text colour.
- **Header lockup:** mark then wordmark, 10px gap, both centred. The wordmark carries `role="img" aria-label="Quiet Bands"`; the mark is `aria-hidden`. Sizes: mark 25×20 / wordmark 93×17 on the home header; 28×22 / 109×20 on inner pages, 32×26 / 125×23 at ≥761px.
- **Colours:** black `#000000` ground, cream `#F2EEE5` lines and type, orange `#FF5A00` for the one live accent only: the break, the words that name it ("try to kill it."), and the one live item (the settled piece that is pointed at, focused or tapped, Work at rest). Never a second accent.
- **The line:** "Before you build it, try to kill it." It is the studio's line and the reason the bulb breaks; the home page says it at the break.
- **Icons:** cream mark on black. Favicon: 64 box, rounded 12, mark 44 wide. App icons: full bleed, mark 58% of the width.
- **Retired:** brass `#FFBE0B`/`#B38A3D`, ink `#111111`/`#0E0F10`, bone `#F6F4EE`. The legacy share cards (`og.png`, `og-rd.png`, `og-small-business.png`, `og-resident-experience.png`) and the LinkedIn banner still show the old bands and must be redrawn, not patched.

## Glass light (what made the bulb read as real glass)

Reflections come only from an environment map built from lit panels (`makeEnvironment`). Nothing is painted on the mesh, and there are no point lights. Rules:

1. **Tone map.** `NeutralToneMapping`. Panels are HDR, so their cores roll off instead of clipping to a flat card. Lines, crack and dust set `toneMapped: false`, so brand colours stay exact.
2. **Smooth geometry.** Revolve the glass much finer than the wireframe it carries (160 × 1.5°, not the 24 × 10° grid). Every facet kinks a highlight.
3. **No creases.** Where profiles meet at an angle (dome to neck), smooth the normals along the arc and keep the positions. The glass must still sit on the grid.
4. **Winding.** `LatheGeometry` winds outward only when profile points run upward. Our profile runs crown to neck, so revolve it reversed, and check that face winding agrees with the normals.
5. **One interface, one lobe.** No clearcoat on glass. ior 1.5 gives the real 4% head-on.
6. **Hollow glass shows the light twice.** A reflection-only, additive `BackSide` pass draws the inside of the far wall (`INNER`, about 0.55). It is the smaller, inverted image that says hollow.
7. **Near wall writes no depth,** so the grid and the far wall behind it stay drawn.
8. **Panels are lit like panels:** crisp edge, hot centre (`panelTex(edge, core)`). A soft blob reads as haze. Keep one broad key softbox, a backlight rim, a thin opposing rim, one small hard window glint, a dim overhead scrim and a faint floor.

Verify with renders, not by eye in code: a before/after crop, the far wall on and off, and a short recording of the turn. `tools/*.test.mjs` must stay green.
