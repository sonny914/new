/* Quiet Bands · Bulb Entry · the scroll map. Pure functions of t (0..1); nothing here touches the DOM or WebGL,
   so `npm test` covers it in Node. Every pose is a function of t, so the sequence reverses by construction. */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k)));

export const MAP = { hold: 0.18, rotate: 0.45, separate: 0.70, settle: 1.0 };
export const ROTATION = Math.PI * 200 / 180;   // 200° about the vertical axis across the rotation segment
export const CRACK0 = 0.04;                    // at rest the glass already carries a hairline at the impact point
export const SEPARATION = 0.42;                // how far a fragment slides out along its own direction before it settles
export const LABEL_STAGGER = 0.03;             // in t, between one label and the next (30–80 ms at a normal scroll)

/** Progress through one segment: linear inside, eased at both ends. */
export function seg(t, a, b) { return smooth((clamp(t) - a) / (b - a)); }

export function poseAt(t) {
  const rot = seg(t, MAP.hold, MAP.rotate) * ROTATION;
  const leave = seg(t, MAP.hold, MAP.hold + 0.12);   // the two lines and the dimension marks leave as the bulb starts to turn
  const crack = CRACK0 + (1 - CRACK0) * seg(t, 0, MAP.rotate);   // the cracks run across the glass through the hold and the turn; complete before separation
  const broken = t >= MAP.rotate;                     // from here the four fragments are the glass
  const sep = seg(t, MAP.rotate, MAP.separate);        // fragments slide out along the cracks
  const settle = outExpo((clamp(t) - MAP.separate) / (MAP.settle - MAP.separate));   // an entrance: ease-out into the four poses
  const release = seg(t, MAP.rotate, 0.85);            // the debris leaves the cracks
  const anchor = 1 - seg(t, MAP.separate, 0.85);       // the base and the filament fade once the fragments leave for their poses
  return { rot, text: 1 - leave, dims: 1 - leave, crack, broken, sep, settle, release, anchor };
}

/** Label i (0..3) opacity at t: they arrive one after another near the end of the settle. */
export function labelAt(t, i) { const a = 0.82 + i * LABEL_STAGGER; return seg(t, a, a + 0.08); }
