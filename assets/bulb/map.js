/* Quiet Bands · Bulb Entry · the scroll map. Pure functions of t (0..1); nothing here touches the DOM or WebGL,
   so `npm test` covers it in Node. Every pose is a function of t, so the sequence reverses by construction. */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const outExpo = (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k)));
export const outQuad = (k) => { k = clamp(k); return 1 - (1 - k) * (1 - k); };

export const MAP = { hold: 0.03, crack: 0.22, rotate: 0.45, separate: 0.70, settle: 1.0 };   // the turn starts with the first flick; the glass stays whole until it has clearly turned
export const ROTATION = Math.PI * 240 / 180;   // 240° about the vertical axis across the rotation segment: a fifth faster than the first cut
export const CRACK0 = 0.06;                    // at rest the glass carries only the mark of the impact: a hairline, not a crack under way
export const SEPARATION = 0.42;                // how far a fragment slides out along its own direction before it settles
export const LABEL_STAGGER = 0.03;             // in t, between one label and the next (30–80 ms at a normal scroll)

/** Progress through one segment: linear inside, eased at both ends. */
export function seg(t, a, b) { return smooth((clamp(t) - a) / (b - a)); }

export function poseAt(t) {
  const rot = seg(t, MAP.hold, MAP.rotate) * ROTATION;
  const dims = 1 - seg(t, MAP.hold, MAP.hold + 0.10);          // the dimension marks leave as the bulb starts to turn
  const text = 1 - seg(t, 0.06, 0.30);                          // the two lines are the last thing to leave: their fade is the cue that the page answers the scroll
  const crack = CRACK0 + (1 - CRACK0) * outQuad((clamp(t) - MAP.crack) / (MAP.rotate - MAP.crack));   // the glass is whole through the first fifth: the turn is seen first, then the cracks run, fast at first, complete before separation
  const broken = t >= MAP.rotate;                     // from here the four fragments are the glass
  const sep = seg(t, MAP.rotate, MAP.separate);        // fragments slide out along the cracks
  const settle = outExpo((clamp(t) - MAP.separate) / (MAP.settle - MAP.separate));   // an entrance: ease-out into the four poses
  const release = seg(t, MAP.rotate, 0.85);            // the debris leaves the cracks
  const anchor = 1 - seg(t, MAP.separate, 0.85);       // the base and the filament fade once the fragments leave for their poses
  return { rot, text, dims, crack, broken, sep, settle, release, anchor };
}

/** Label i (0..3) opacity at t: they arrive one after another near the end of the settle. */
export function labelAt(t, i) { const a = 0.82 + i * LABEL_STAGGER; return seg(t, a, a + 0.08); }
/** The settled frame's own wordmark and contact line: after the labels. */
export function settledAt(t) { return seg(t, 0.90, 0.98); }
