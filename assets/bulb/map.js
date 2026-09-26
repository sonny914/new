/* Quiet Bands · Bulb Entry · the scroll map. Pure functions of t (0..1); nothing here touches the DOM or WebGL,
   so `npm test` covers it in Node. Every pose is a function of t, so the sequence reverses by construction. */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };

export const MAP = { hold: 0.18, rotate: 0.45, separate: 0.70, settle: 1.0 };
export const ROTATION = Math.PI * 200 / 180;   // 200° about the vertical axis across the rotation segment
export const CRACK0 = 0.04;                    // at rest the glass already carries a hairline at the impact point

/** Progress through one segment: linear inside, eased at both ends. */
export function seg(t, a, b) { return smooth((clamp(t) - a) / (b - a)); }

export function poseAt(t) {
  const rot = seg(t, MAP.hold, MAP.rotate) * ROTATION;
  const leave = seg(t, MAP.hold, MAP.hold + 0.12);   // the two lines and the dimension marks leave as the bulb starts to turn
  const crack = CRACK0 + (1 - CRACK0) * seg(t, 0, MAP.rotate);   // the cracks run across the glass through the hold and the turn; complete before separation
  return { rot, text: 1 - leave, dims: 1 - leave, crack };
}
