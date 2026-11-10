# Reference analysis: the motion principles we adopted

Source: screen recording of a 28.9 s vertical business explainer (TikTok UI ignored). We extract its principles, not its drawings.

| Principle | In the reference | How the Quiet Bands engine uses it |
|---|---|---|
| One idea at a time, lots of black | Objects take ~25–40% of frame width; the camera is mostly still | Small objects, wide margins; the camera moves only when scale *is* the message (the zoom-out during multiplication) |
| Line style carries state | Dashed = idea / not real; strike-through wipe = rejected; solid = exists | `tile({dash})`: the seed starts dashed and its gaps close as it is built |
| Grey is the hierarchy | Inactive grids fade to grey; the active item stays white | `GREY` = 42% ink: wires rest in grey, modules stay white |
| Continuity of object | Bulb dissolves into the product card; one card becomes two; the card slides to make room | Every particle is the same object throughout: born → field → module cell / wire dot → logo |
| Particles with direction | The dot stream flows *into* the store (buyers) | Births come from the nearest elder; reorganization runs in flow order; pulses run input → output |
| Editorial data callouts | Heavy numerals + small italic serif caption; "+5%" pill; draw-on chart | `800 Inter Display` numerals over `italic Bitstream Charter` caption |
| Pacing | A new beat every 1.5–3 s; fast in, soft settle; holds long enough to read | Beats of 0.4–0.9 s inside the proof; scene holds set in the timeline |
| Accent | Monochrome | Orange (#FF6A21) only for the event: the count landing, the flow, a broken link |

What we deliberately do *not* copy: its icons (bulb, people, store, coins), its rolling-counter blur (we keep numbers crisp: they change on whole frames only), and its layouts.
