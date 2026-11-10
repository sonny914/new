# EVERYBODY CAN BUILD: the five-second opening

`comps/everybody-can-build/cover-open.js` turns the approved cover into a 1080×1920, 30 fps H.264 video. Render it with `node tools/motion/render.mjs everybody-can-build/cover-open --sheet=5`.

Frame 0 is the approved cover itself: the same code with every animated value at rest, and byte-identical to `renders/everybody-can-build-cover.png` before encoding.

## Motion techniques

- **Layers, not masks.** The keyframe is drawn by the engine (figure, desk, monitor, bulb, type, logo paths), so each element is animated directly. Nothing was cut out or rebuilt.
- **Deterministic time.** Every value is a pure function of the frame.
  - The flicker uses a seeded per-frame hash, so it never shimmers between renders.
  - The motion blur takes 4 samples across a 180° shutter.
  - The grain is reseeded once per frame.
- **0.0–1.0 s, alive.** The bulb breathes on a 1.25 s cosine, starting from full brightness. Dust drifts upward at two depths, with the far layer slower and fainter. The screen flicker fades in from zero, at most −5%.
- **1.0–2.0 s, idea.** The bulb's glow rises 28% (in-out cubic). An orange pulse travels down a 3D curve from the bulb to the screen's corner, leaving a faint dotted guide. Its 22% tail fades along its length. Warm light reaches the desk as it lands, and a small orange ring marks the arrival.
- **2.0–3.5 s, creation.** The screen activates: its glow rises, a progress line fills, and a control appears, all drawn on the screen's own plane. The application window starts as an exact copy of the screen, at the same size, angle and place, and lifts off that plane. It turns from 49° to face the camera along a slight arc (in-out quintic). A dotted tether keeps it tied to the screen.
- **3.5–5.0 s, reveal.** The window drifts 0.35 m forward. A phone and a course card emerge from the same screen behind it, each tethered. The camera pulls back 0.65 m (in-out cubic), and the workstation stays whole in frame.
- **Locked.** The type, lockup, silhouette, posture and composition never move or deform. The only revision is the one requested: thinner arms.
