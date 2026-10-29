# TEST 01 · THE DROWNED BELFRY · VISUAL BIBLE

Status: previs v1. Characters, world and story here are a **provisional test concept**, built so the three locked camera moves have something meaningful to reveal. They can be promoted to the real show or swapped out. The camera paths and timing are independent of these designs. The numbers below come from `tools/previs/shots.mjs`, which is the only place to change them.

---

## 1. The idea in one line

A fighter who hears the silence between beats duels a giant who swings his belfry's bell like a flail. **Bullet time is her perception.** When she listens, time stops and the world goes quiet. When she strikes, the sound becomes a visible ring that blows the room open.

That gives each locked move a reason to exist:

| Move | What it reveals |
|---|---|
| 01 · 360° freeze | The trap. Her eyes are shut, so she can't see the bell coiling below her. She can hear it, and the chain glows orange because it is the sound she is tracking. |
| 03 · Dodge orbit | How she dodges. The bell passes 9 cm over her face while her eyes stay closed. The orbit ends looking along the gap, with the Bellwright small in the window behind the bronze. |
| 04 · Impact transition | What sound does in this world. The strike makes a ring that packs the rain into a shell, blows the louvers out and carries the camera into the drowned city. |

## 2. Visual identity: two inks and a flare

| Token | Hex | Used for |
|---|---|---|
| ink | `#07080B` | void, outlines, impact-frame silhouettes |
| night | `#121826` | shadow fill |
| slate | `#3B4A63` | moonlit mid-tones, the Listener's coat |
| mist | `#8C97AB` | rain, haze, far towers |
| bone | `#F2EEE5` | moonlight highlights, the band, the sash, the fork |
| bronze | `#6B5236` | **the bell only**: the one metal surface in the world |
| signal | `#FF5A00` | **force only** |

**The signal rule.** Orange appears only where sound has force: the chain she hears in the freeze, the fork tines after the strike, the strike light, the ring. Nothing else is orange: no costume trim, no city windows. This is the visual identity, and it matches Quiet Bands' own rule (orange is the one live accent) without putting the brand on the show.

**The grade enforces it.** The previs grade desaturates toward ink and bone in held moments but keeps orange hues at full strength. In the freeze, the only colour left on screen is the sound she is listening to.

## 3. Colour script

| Edit time | Beat | Saturation | Notes |
|---|---|---|---|
| 0.00–2.40 | Standoff, charge | 0.55 | cold night, bone highlights, slate shadows |
| 2.40–3.20 | Brake into the apex | 0.55 → 0.06 | colour drains as time stops |
| 3.20–7.00 | **Freeze** | 0.06 | ink and bone; the chain glows signal |
| 7.00–7.45 | Snap | flare +0.22 stops | one bright beat as time slams back |
| 7.70–14.20 | **Dodge** | 0.14 | cold; bronze glints are the only warmth |
| 14.70–15.38 | Land, strike | 0.60 | real time, full night palette |
| 15.43 | **Contact** | impact frames | two flat graphic frames (see continuity) |
| 15.60–18.00 | **The ring** | 0.95 → 0.80 | the strike light owns the frame |
| 21.00–25.00 | The drowned city | 0.50 | deep blue night; the ring is the only warm line |

## 4. Light

- **One key: the moon**, low in the south-east, 11° up, direction (0.80, 0.19, 0.57). It is visible as a disc in the final frame and never moves.
- Inside, moonlight reaches the room through the louvered openings and casts **stripes** across the floor and the characters. Stripes are the room's texture. Keep the louvers in every redesign.
- **Fill** comes from the broken roof as a dim sky dome.
- **The strike** is an orange point light at the contact point. It flashes at contact and decays with world time. At 4% speed it lingers for seconds, so the impact hold glows.
- No rim lights and no glow just for looks. Every light has a source in the world.

## 5. Line and shape

- **Lined things act.** Characters and the bell carry an ink outline. The environment has none. Outlines separate the action from the set at any distance.
- **The Listener is verticals and points:** the staff, the tines, the sash.
- **The Bellwright is circles and mass:** a hunched dome, forearms thicker than upper arms, the bell.
- Thumbnail test: at 64 px tall, each character must read from silhouette alone. Her read is band, sash and fork. His read is mass, a small head and the bell.

## 6. Characters (provisional)

### The Listener
| | |
|---|---|
| Role | Protagonist. Fights by hearing. |
| Height | 1.70 m, sprinter's build |
| Silhouette | **Band:** a bone ring worn askew over the ears. **Sash:** a bone ribbon, about 2 m, from the waist. **Fork:** a 1.85 m staff with a two-tine head. |
| Costume | Short, fitted slate coat. *No* long coat or sunglasses: avoid the Matrix silhouette. |
| Acting | Eyes closed in both bullet-time beats. Head tilts toward the sound. She never looks at the bell. |
| Power logic | She hears the gap between beats (the "quiet band"). Time stopping is what that sounds like to her. |
| The fork | Grip 0.55 m from the butt. Tines 0.36 m long, 0.11 m apart. After a strike the tines glow signal and fade over about one world second. |

### The Bellwright
| | |
|---|---|
| Role | Antagonist. A belfry keeper who tore the great bell free. |
| Height | 2.55 m, hunched; shoulders about 0.8 m across |
| Silhouette | A dome of back and shoulders, a small head with a bone face plate, huge forearms |
| Weapon | The bell, swung on its chain like a flail. Its crown always points at his right hand. |
| The bell | Mouth radius 0.70 m, height 1.32 m, bronze. The only metallic surface in the world. |

## 7. Environment

### The Drowned Belfry
- An octagonal bell-tower top. **8 stone pillars** stand at 8.2 m radius, 1.1 m square and 11 m tall, at 22.5° + 45°k, so due east is an opening.
- **Arched openings** have sills at 0.9 m. Seven are louvered above 5 m. **The east opening is the window:** louvered from 1.05 m to 9 m, 14 slats, facing the moon.
- **The roof is broken open**, so rain falls inside. A few rafters remain for silhouette.
- **The floor is flooded** about 25 cm deep (the flood line is y = 0). Every footfall leaves a ripple.

### The drowned city
- The tower stands in floodwater **42 m below the belfry floor**.
- About 110 towers stand up to 450 m out, each capped with a belfry. They are kept clear of the Bellwright's fall and of every camera position.
- No lit windows. The city is lit only by the moon and, at the end, by the ring.

## 8. Rain is the clock

Rain is how the audience reads time. Each drop is drawn as a streak whose length equals the shutter (1/48 s at 24 fps) multiplied by world speed:

- **100%:** about 19 cm streaks.
- **2%:** short dashes.
- **0.5% (the freeze):** beads that hang in the air.
- **The bell** carves a tunnel through the rain as it passes.
- **The ring** packs the rain into a hollow shell: everything inside the wavefront is pushed into its outer 7%.

Wind blows from the window: (−1.2, −9.0, −0.4) m/s. Keep this rule in final art. It tells the audience the time scale before any character moves.

## 9. Continuity sheet

| Element | Rule |
|---|---|
| Screen direction | The action line runs west to east (Listener → Bellwright → window). East is screen-right from SH010 through the start of SH030. The dodge orbit crosses the line *on camera*. From the end of SH030 through SH040, east is screen-left. No cut crosses the line (checked in `tools/previs.test.mjs`). |
| Moon | South-east, 11° up. Fixed. |
| Rain | Wind from the east. Streak length is shutter × speed, never stylised per shot. |
| Band | Worn askew, higher on her right. It does not move in this test. |
| Sash | Streams against her velocity. Frozen mid-flutter in the freeze, never limp. |
| Fork | In her right hand throughout. Tines unlit until contact, then signal, fading. |
| Bell | Rests in the water north-east of him until world time 2.40 s. Crown always toward his right hand. |
| Chain | In his right hand. Glows signal only during the freeze. |
| Window | Intact until the ring reaches it (world time 4.35 s, edit 16.97 s). Gone after that. |
| Water | Ripples at each footfall (world time 0.98, 1.30, 1.60, 1.86 s) and the landing (3.55 s). |
| Impact frames | Frame 371: signal ground, ink silhouettes. Frame 372: ink ground, bone silhouettes. Only the characters, the fork and the bell; no set. |

## 10. References: ambition, not assets

The Matrix (bullet time as perception), Jujutsu Kaisen (impact frames, weapon weight), Arcane (painterly light on 3D form), Across the Spider-Verse (graphic frames inside 3D space).

Do not reproduce their character designs, signature shots or visual assets. The tests for originality are the signal rule, rain as the clock and the sound-based power logic. None of them comes from a reference.
