# Quiet Bands Motion Lab: art direction (spec v2)

The visual rules every film follows. The keyframes `renders/everybody-can-build-keyframe-{A,B,C}.png` are the reference renders, drawn by `comps/everybody-can-build/film-keys.js`.

## Colour (90% monochrome)

| Token | Hex | Used for |
|---|---|---|
| `bg` | `#08090B` | The world. Lifted by an almost invisible vertical gradient (#06070A to #0C0D10) so black reads as depth |
| `ink` | `#F6F4EE` | The primary subject of each shot: figures, the hero creation, live pathways, statements |
| `ink2` | `#B8B9B7` | Supporting objects (chair, desk legs, edges), the ground line, kickers, travel trajectories |
| `tech` | `#62666B` | Measurement: floor grid, rulers, tethers, rings, numbered labels |
| `live` | `#FF6A21` | One meaning per film: the failure, then its correction. Never decoration. Keyframes A and B use none |

Far objects fade toward the black (up to 72%), so overlapping ones don't turn into muddy fills. Disconnected objects sit at 32% tone.

## Light

- **Optical halo:** emissive art is blurred at quarter resolution (12px and 56px radii, at 0.5 and 0.42 strength) and laid *under* the sharp art. Silhouettes and colours stay exact; only the surroundings glow (`light.halo`).
- **Light sources are things in the world:** the bulb, the screen, an overhead cone over the scene's subject, and the orange floor glow at a failure. Each is a radial or cone gradient anchored to a world point, so it moves with the camera.
- **Finish:** a vignette (70% at the corners), film grain (soft-light, regenerated per frame), sparse dust in the lit volume, and 2–3 out-of-focus lens motes.
- **Typography is drawn after the halo pass,** so it stays crisp.

## The figure (LuminousHuman, `engine/humans.js`)

- **Proportions:** 1.75 m standing. The head is a disc (r 0.098 m) with a 0.025 m gap above a capsule torso (0.30 × 0.64 m). Limbs are pills 0.08–0.13 m wide.
- **Shading:** filled, with a front-lit gradient; the far limbs are one tone darker.
- **Arms:** the near arm is engraved where it crosses the torso, with a hairline in the background colour.
- **No features:** no face, no clothes.
- **Poses:** `stand`, `sit`, `reach` 0–1, `lean`, `look`.
- **Minimum size:** about 160 px tall on screen (keyframe B), still readable on a phone.

## Line weights (screen px, constant at any zoom)

- Primary edges: 1.2–2.0
- Live pathway: 2.6 core, plus a 1.0 dashed shoulder in `tech`
- Ground line: 2.2 round dots, 9 px apart
- Rulers and rings: 1.2
- Tethers: 1.0, dashed 3/5

## Typography

- **Statement:** Inter Display 800, caps, 96–104 px, leading 1.02, on an 80 px left margin.
- **Kicker:** JetBrains Mono 500, 20 px, +5 tracking, `ink2`, with a 44 px `tech` rule under it.
- **Labels:** JetBrains Mono 15–18 px, +2 to +4 tracking. `tech` for numbers, `ink2` for names, `live` only at the failure.
- **At most one statement per shot.** A shot must also work with it removed.

## Space and camera

- **Space:** metres, a real pinhole camera (`engine/space.js`). Every object stands on the floor (y = 0). Digital objects float with a dashed tether down to a floor ring.
- **Ground:** one dotted ground line across the world and a receding dot floor, brightest under the subject.
- **Scale of subjects:**
  - A: about 60% of frame width (intimate).
  - B: the hero creation is the brightest object, and the creator is about 160 px (one among many, beginning).
  - C: the system fills the middle 40% of the frame height, read near to far as customer → business → process → outcome.
- **Camera path for the 5-second test:** push-in (A) → raised pull-back (B) → travel over the field into the system (C).
  - Slow eases only (in-out cubic or quintic). No whip pans, no roll.

## Composition checklist (each frame)

1. One primary subject.
2. A supporting system.
3. Technical annotation.
4. Deliberate negative space.
5. A foreground, a middle ground and a background.
6. Readable at phone size.
7. Meaning visible without the statement.
